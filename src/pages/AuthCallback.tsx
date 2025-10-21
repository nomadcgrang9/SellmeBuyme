'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ensureAuthInitialized } from '@/stores/authStore';
import { fetchUserProfile } from '@/lib/supabase/profiles';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'pending' | 'error'>('pending');
  const [message, setMessage] = useState('소셜 계정을 확인하고 있어요. 잠시만 기다려 주세요.');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const error = params.get('error') ?? hashParams.get('error');
    const errorDescription = params.get('error_description') ?? hashParams.get('error_description');
    const code = params.get('code');

    async function completeAuth() {
      if (error) {
        setStatus('error');
        setMessage(decodeURIComponent(errorDescription ?? error));
        return;
      }

      try {
        if (code) {
          const decodedCode = decodeURIComponent(code);
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(decodedCode);

          if (exchangeError) {
            setStatus('error');
            setMessage(exchangeError.message);
            return;
          }
        } else {
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (!accessToken || !refreshToken) {
            setStatus('error');
            setMessage('로그인 토큰이 전달되지 않았습니다. 다시 시도해 주세요.');
            return;
          }

          const { error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (setError) {
            setStatus('error');
            setMessage(setError.message);
            return;
          }
        }

        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData?.user) {
          console.error('로그인 사용자 정보를 불러오지 못했습니다:', userError?.message);
          setStatus('error');
          setMessage('로그인한 사용자 정보를 확인할 수 없습니다. 다시 시도해 주세요.');
          return;
        }

        const userId = userData.user.id;
        const { data: profileData, error: profileError } = await fetchUserProfile(userId);

        if (profileError) {
          console.error('프로필 조회 실패:', profileError.message);
        }

        if (profileData) {
          sessionStorage.removeItem('profileSetupPending');
        } else {
          sessionStorage.setItem('profileSetupPending', 'true');
        }

        await ensureAuthInitialized();

        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        window.location.replace('/');
      } catch (exchangeUnknownError) {
        console.error('OAuth 세션 처리 실패:', exchangeUnknownError);
        setStatus('error');
        setMessage('로그인에 실패했습니다. 다시 시도해 주세요.');
      }
    }

    void completeAuth();
  }, []);

  const isPending = status === 'pending';
  const isError = status === 'error';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-auto rounded-2xl bg-white p-8 shadow-md text-center font-esamanru">
        <div className="flex flex-col items-center gap-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
            isError ? 'bg-red-100 text-red-500' : 'bg-[#e8f2fb] text-[#4b83c6]'
          }`}>
            {isPending ? (
              <span className="animate-spin text-2xl">⏳</span>
            ) : (
              <span className="text-2xl">⚠️</span>
            )}
          </div>

          <div className="space-y-2">
            <h1 className="text-lg font-extrabold text-gray-900">소셜 로그인 처리 중</h1>
            <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
          </div>

          {isError && (
            <button
              type="button"
              onClick={() => window.location.replace('/')}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#7aa3cc] rounded-md hover:bg-[#6b95be] transition-colors"
            >
              홈으로 돌아가기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

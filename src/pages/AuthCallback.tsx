'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ensureAuthInitialized } from '@/stores/authStore';

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState('구글 계정과 연결하는 중입니다...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    async function exchangeCode() {
      if (error) {
        setStatus('error');
        setMessage(decodeURIComponent(errorDescription ?? error));
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('로그인 코드가 전달되지 않았습니다. 다시 시도해 주세요.');
        return;
      }

      const decodedCode = decodeURIComponent(code);

      try {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession({ code: decodedCode });

        if (exchangeError) {
          setStatus('error');
          setMessage(exchangeError.message);
          return;
        }

        sessionStorage.setItem('profileSetupPending', 'true');
        await ensureAuthInitialized();

        setStatus('success');
        setMessage('로그인이 완료되었습니다. 잠시 후 홈으로 이동합니다.');

        setTimeout(() => {
          window.location.replace('/');
        }, 1200);
      } catch (exchangeUnknownError) {
        console.error('OAuth 세션 교환 실패:', exchangeUnknownError);
        setStatus('error');
        setMessage('로그인에 실패했습니다. 다시 시도해 주세요.');
      }
    }

    void exchangeCode();
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
            ) : isError ? (
              <span className="text-2xl">⚠️</span>
            ) : (
              <span className="text-2xl">✅</span>
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

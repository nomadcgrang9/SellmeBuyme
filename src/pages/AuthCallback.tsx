import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ensureAuthInitialized } from '@/stores/authStore';
import { createMinimalProfile } from '@/lib/supabase/profiles';
import Restart from '@solar-icons/react/csr/arrows/Restart';

export default function AuthCallbackPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash);

    const error = params.get('error') ?? hashParams.get('error');
    const code = params.get('code');

    async function completeAuth() {
      // 에러 파라미터가 있으면 홈으로 리다이렉트 (에러 화면 안 보여줌)
      if (error) {
        console.error('OAuth 에러:', error);
        window.location.replace('/');
        return;
      }

      try {
        // 1. 먼저 기존 세션 확인
        const { data: sessionData } = await supabase.auth.getSession();

        if (sessionData?.session) {
          // 이미 로그인 되어있으면 바로 홈으로
          await ensureAuthInitialized();
          window.location.replace('/');
          return;
        }

        // 2. code가 있으면 세션 교환
        if (code) {
          const decodedCode = decodeURIComponent(code);
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(decodedCode);

          if (exchangeError) {
            console.error('세션 교환 실패:', exchangeError.message);
            window.location.replace('/');
            return;
          }
        } else {
          // 3. hash에서 토큰 확인
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: setError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (setError) {
              console.error('세션 설정 실패:', setError.message);
              window.location.replace('/');
              return;
            }
          } else {
            // 토큰도 없고 세션도 없으면 그냥 홈으로
            window.location.replace('/');
            return;
          }
        }

        // 4. 사용자 정보 확인 및 프로필 생성
        const { data: userData } = await supabase.auth.getUser();

        if (userData?.user) {
          const userId = userData.user.id;
          const userEmail = userData.user.email;

          if (userEmail) {
            await createMinimalProfile(userId, userEmail);
          }
        }

        sessionStorage.removeItem('profileSetupPending');
        await ensureAuthInitialized();

        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        window.location.replace('/');
      } catch (err) {
        console.error('OAuth 처리 실패:', err);
        window.location.replace('/');
      }
    }

    void completeAuth();
  }, []);

  // 로딩 화면만 표시 (에러 화면 없음)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm mx-auto rounded-2xl bg-white p-8 shadow-md text-center font-esamanru">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full flex items-center justify-center border border-gray-200 text-[#3B82F6]">
            <Restart size={24} className="animate-spin" />
          </div>
          <p className="text-base font-medium text-gray-700">로그인 중...</p>
        </div>
      </div>
    </div>
  );
}

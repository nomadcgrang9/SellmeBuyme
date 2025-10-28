import { useState, useEffect, useCallback } from 'react';

// Kakao Maps SDK 전역 타입 선언
declare global {
  interface Window {
    kakao: any;
  }
}

interface UseKakaoMapsReturn {
  isLoaded: boolean;
  error: Error | null;
  loadKakaoMaps: () => Promise<void>;
}

/**
 * Kakao Maps SDK를 동적으로 로드하는 훅
 *
 * @returns {UseKakaoMapsReturn} SDK 로드 상태와 로드 함수
 */
export function useKakaoMaps(): UseKakaoMapsReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadKakaoMaps = useCallback(async () => {
    console.log('[useKakaoMaps] 🚀 loadKakaoMaps 시작 (index.html 정적 로드 방식)');

    try {
      // index.html에서 이미 로드된 SDK 확인
      if (window.kakao && window.kakao.maps) {
        console.log('[useKakaoMaps] ✅ SDK 이미 로드됨');
        setIsLoaded(true);
        return;
      }

      // SDK가 로드 중일 수 있으므로 최대 5초 대기
      console.log('[useKakaoMaps] ⏳ SDK 로드 대기 중...');
      let attempts = 0;
      const maxAttempts = 50; // 5초 (100ms * 50)

      while (attempts < maxAttempts) {
        if (window.kakao && window.kakao.maps) {
          console.log('[useKakaoMaps] ✅ SDK 로드 완료 (시도:', attempts + 1, ')');
          setIsLoaded(true);
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      // 5초 후에도 로드되지 않으면 에러
      throw new Error('Kakao Maps SDK 로드 타임아웃 - index.html 스크립트 확인 필요');

    } catch (err) {
      const error = err instanceof Error ? err : new Error('알 수 없는 오류');
      setError(error);
      console.error('[useKakaoMaps] 💥 최종 에러:', error);
      throw error;
    }
  }, []);

  return {
    isLoaded,
    error,
    loadKakaoMaps
  };
}

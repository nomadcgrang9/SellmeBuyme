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
const KAKAO_SDK_URL = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=69b6d6d11aa571c7001a92ba25a99c49&libraries=services&autoload=false';

export function useKakaoMaps(): UseKakaoMapsReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadKakaoMaps = useCallback(async () => {
    console.log('[useKakaoMaps] 🚀 loadKakaoMaps 시작 (동적 로드 방식)');

    try {
      const ensureInitialized = () =>
        new Promise<void>((resolve, reject) => {
          if (!window.kakao || !window.kakao.maps || typeof window.kakao.maps.load !== 'function') {
            reject(new Error('Kakao Maps SDK 로드 구조를 확인할 수 없습니다.'));
            return;
          }

          window.kakao.maps.load(() => {
            if (window.kakao?.maps?.LatLng) {
              console.log('[useKakaoMaps] ✅ SDK 초기화 완료');
              setIsLoaded(true);
              resolve();
            } else {
              reject(new Error('Kakao Maps SDK 초기화에 실패했습니다.'));
            }
          });
        });

      // 이미 로드되어 LatLng 생성자가 있는지 확인
      if (window.kakao && window.kakao.maps && window.kakao.maps.LatLng) {
        console.log('[useKakaoMaps] ✅ SDK 이미 로드됨 (LatLng 사용 가능)');
        setIsLoaded(true);
        return;
      }

      // kakao.maps.load만 존재할 경우 초기화 강제 실행
      if (window.kakao && window.kakao.maps && typeof window.kakao.maps.load === 'function') {
        console.log('[useKakaoMaps] ⏳ SDK 초기화 진행 중...');
        await ensureInitialized();
        return;
      }

      // 기존 스크립트 태그 확인
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-kakao-sdk="true"]');
      if (existingScript) {
        console.log('[useKakaoMaps] ⏳ 기존 스크립트 로드 대기 중...');
        await new Promise<void>((resolve, reject) => {
          existingScript.addEventListener('load', () => {
            ensureInitialized().then(resolve).catch(reject);
          }, { once: true });
          existingScript.addEventListener('error', () => {
            existingScript.remove();
            reject(new Error('Kakao Maps SDK 스크립트 로드 실패'));
          }, { once: true });
        });
        return;
      }

      // 동적으로 스크립트 로드
      console.log('[useKakaoMaps] 📝 새 스크립트 동적 로드 시작');
      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = KAKAO_SDK_URL;
        script.async = true;
        script.setAttribute('data-kakao-sdk', 'true');

        script.onload = () => {
          console.log('[useKakaoMaps] ✅ 스크립트 로드 완료');
          ensureInitialized().then(resolve).catch(reject);
        };

        script.onerror = () => {
          console.error('[useKakaoMaps] ❌ 스크립트 로드 실패');
          script.remove();
          reject(new Error('Kakao Maps SDK 스크립트 로드 실패'));
        };

        document.head.appendChild(script);
      });

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

import { useState, useEffect } from 'react';
import { reverseGeocode } from '@/lib/utils/geocoding';

interface GeolocationState {
  coords: { latitude: number; longitude: number } | null;
  address: { city: string; district: string } | null;
  loading: boolean;
  error: string | null;
  permissionDenied: boolean;
}

interface LocationCache {
  coords: { latitude: number; longitude: number };
  address: { city: string; district: string };
  timestamp: number;
}

const CACHE_KEY = 'user_location';
const CACHE_DURATION = 86400000; // 24시간

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    coords: null,
    address: null,
    loading: false,
    error: null,
    permissionDenied: false,
  });

  useEffect(() => {
    // 1. localStorage에서 캐시된 위치 확인
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { coords, address, timestamp }: LocationCache = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > CACHE_DURATION;

        if (!isExpired) {
          setState({ coords, address, loading: false, error: null, permissionDenied: false });
          return;
        }
      }
    } catch (err) {
      console.error('Failed to read location cache:', err);
    }

    // 2. Geolocation API 지원 확인
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation not supported',
        loading: false
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true }));

    // 3. Geolocation API 호출
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        // 4. Reverse Geocoding
        try {
          const address = await reverseGeocode(coords.latitude, coords.longitude);

          // 5. localStorage에 저장
          const cache: LocationCache = {
            coords,
            address,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));

          setState({
            coords,
            address,
            loading: false,
            error: null,
            permissionDenied: false
          });
        } catch (err) {
          console.error('Geocoding failed:', err);

          // Fallback: reverseGeocode 내부에서 이미 fallback 처리가 되어 있지만,
          // 그마저도 실패한 경우를 대비해 빈 주소라도 저장 (다음 시도를 위해)
          // 또는 좌표 기반으로 대략적 지역 추정
          const fallbackAddress = { city: '', district: '' };

          // localStorage에 저장 (빈 값이라도 저장해서 캐시 역할)
          const cache: LocationCache = {
            coords,
            address: fallbackAddress,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
          console.warn('[Geolocation] Geocoding 실패, fallback 주소 저장:', fallbackAddress);

          setState({
            coords,
            address: fallbackAddress,
            loading: false,
            error: (err as Error).message,
            permissionDenied: false
          });
        }
      },
      (error) => {
        const permissionDenied = error.code === error.PERMISSION_DENIED;
        setState({
          coords: null,
          address: null,
          loading: false,
          error: error.message,
          permissionDenied
        });
      },
      {
        enableHighAccuracy: false, // 배터리 절약
        timeout: 10000, // 10초
        maximumAge: CACHE_DURATION, // 24시간 캐시
      }
    );
  }, []);

  return state;
}

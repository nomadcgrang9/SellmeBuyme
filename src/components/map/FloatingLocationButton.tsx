// 현재위치 버튼 - 사이드패널 아래에 위치
// 사이드패널과 동일한 스타일 (100px 너비, rounded-2xl)
// 텍스트만 표시: "현재\n위치로"
// 작성일: 2026-01-31

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface FloatingLocationButtonProps {
  /** 카카오맵 인스턴스 */
  mapInstance: any;
}

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

// 글래스모피즘 스타일 (사이드패널과 동일)
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.08)',
};

export default function FloatingLocationButton({
  mapInstance,
}: FloatingLocationButtonProps) {
  const [state, setState] = useState<ButtonState>('idle');

  const handleClick = useCallback(() => {
    if (state === 'loading' || !mapInstance) return;

    if (!navigator.geolocation) {
      setState('error');
      setTimeout(() => setState('idle'), 2000);
      return;
    }

    setState('loading');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (window.kakao && mapInstance) {
          const moveLatLng = new window.kakao.maps.LatLng(latitude, longitude);
          mapInstance.setCenter(moveLatLng);
          mapInstance.setLevel(4);
          console.log('[FloatingLocationButton] 현재 위치로 이동:', { latitude, longitude });
        }
        setState('success');
        setTimeout(() => setState('idle'), 1500);
      },
      (error) => {
        console.error('[FloatingLocationButton] 위치 조회 실패:', error);
        setState('error');
        setTimeout(() => setState('idle'), 2000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [mapInstance, state]);

  const getStateStyle = () => {
    switch (state) {
      case 'loading':
        return 'text-gray-400';
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500 hover:text-gray-700 hover:bg-gray-100';
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={state === 'loading'}
      whileHover={{ scale: state === 'loading' ? 1 : 1.02 }}
      whileTap={{ scale: state === 'loading' ? 1 : 0.98 }}
      className={`
        w-[60px] h-[60px]
        rounded-full
        flex flex-col items-center justify-center
        text-[10px] font-medium leading-tight text-center
        transition-all duration-200
        ${state === 'loading' ? 'cursor-wait' : 'cursor-pointer'}
        ${getStateStyle()}
      `}
      style={glassStyle}
      aria-label="현재 위치로 이동"
      title="현재 위치로 지도 이동"
    >
      {state === 'loading' ? (
        <motion.span
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          이동중...
        </motion.span>
      ) : (
        <>
          <span>현재</span>
          <span>위치로</span>
        </>
      )}
    </motion.button>
  );
}

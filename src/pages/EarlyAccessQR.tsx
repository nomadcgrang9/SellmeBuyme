import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getQrPromoConfig } from '@/lib/supabase/qr-promo';
import type { QrPromoConfig } from '@/types/qr-promo';

const QR_URL = 'https://xn--9d0bk8ucxkkcw59f.com/earlyteacher2026';
const SITE_URL = 'https://학교일자리.com';

// ━━━ 이미지 캐러셀 ━━━
function ImageCarousel({ images, rotationSpeed }: { images: string[]; rotationSpeed: number }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);

  const startAutoPlay = useCallback(() => {
    if (images.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % images.length);
    }, rotationSpeed * 1000);
  }, [images.length, rotationSpeed]);

  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    startAutoPlay();
    return stopAutoPlay;
  }, [startAutoPlay, stopAutoPlay]);

  const goTo = (index: number) => {
    stopAutoPlay();
    setCurrentIndex(index);
    startAutoPlay();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      stopAutoPlay();
      if (diff > 0) {
        setCurrentIndex(prev => (prev + 1) % images.length);
      } else {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
      }
      startAutoPlay();
    }
  };

  if (images.length === 1) {
    return (
      <div className="rounded-xl overflow-hidden">
        <img src={images[0]} alt="홍보 이미지" className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        className="relative rounded-xl overflow-hidden flex-1"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`홍보 이미지 ${i + 1}`}
              className="w-full h-full object-contain flex-shrink-0"
              style={{ minWidth: '100%' }}
            />
          ))}
        </div>
      </div>
      {/* dot 인디케이터 */}
      <div className="flex justify-center gap-2 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
              i === currentIndex
                ? 'bg-blue-500 scale-125'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ━━━ 메인 컴포넌트 ━━━
export default function EarlyAccessQR() {
  const [config, setConfig] = useState<QrPromoConfig | null>(null);

  useEffect(() => {
    getQrPromoConfig().then(setConfig).catch(console.error);
  }, []);

  const hasImages = config?.isActive && config.imageUrls && config.imageUrls.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4">
      <div className={`w-full bg-white rounded-2xl shadow-lg overflow-hidden ${hasImages ? 'max-w-3xl' : 'max-w-sm'}`}>
        {/* 상단 그라데이션 바 */}
        <div className="h-1.5 bg-gradient-to-r from-blue-400 to-emerald-400" />

        <div className={`p-6 sm:p-8 ${hasImages ? 'grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8' : ''}`}>
          {/* ━━━ 좌측: 고정 QR 디자인 (하드코딩) ━━━ */}
          <div className="flex flex-col items-center">
            {/* 제목 */}
            <h1 className="text-2xl font-bold text-gray-900 mb-1 text-center">
              학교일자리<br />한번 등록해보세요
            </h1>
            <div className="w-20 h-0.5 bg-[#F87171] mb-6" />

            {/* 대상 1: 학생 교육 */}
            <div className="w-full flex gap-3 items-start mb-4">
              <div className="w-1 shrink-0 self-stretch rounded-full bg-[#3B82F6]" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">방과후, 정규시간 협력수업 등</p>
                <p className="text-base font-semibold text-gray-800 leading-snug">
                  학생 대상 교육으로<br />일자리를 구하는 선생님들
                </p>
              </div>
            </div>

            {/* 구분선 */}
            <div className="w-full border-t border-gray-100 mb-4" />

            {/* 대상 2: 성인 교육 */}
            <div className="w-full flex gap-3 items-start mb-6">
              <div className="w-1 shrink-0 self-stretch rounded-full bg-[#F87171]" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">에듀테크, 학급세우기 등</p>
                <p className="text-base font-semibold text-gray-800 leading-snug">
                  교직원, 학부모 대상 연수를<br />하실 수 있는 정규교원이나<br />강사 선생님들
                </p>
              </div>
            </div>

            {/* QR 코드 */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 mb-4">
              <QRCodeSVG
                value={QR_URL}
                size={100}
                level="M"
                marginSize={0}
              />
            </div>

            <p className="text-sm text-gray-400">
              카메라로 QR코드를 스캔해주세요
            </p>
          </div>

          {/* ━━━ 우측: 이미지 캐러셀 (DB에서 이미지 있고 활성화일 때만) ━━━ */}
          {hasImages && (
            <div className="flex flex-col justify-center min-h-[300px]">
              <ImageCarousel
                images={config!.imageUrls}
                rotationSpeed={config!.rotationSpeed ?? 3}
              />
            </div>
          )}
        </div>
      </div>

      {/* 하단 링크 */}
      <a
        href={SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-6 text-sm font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
      >
        학교일자리.com
      </a>
    </div>
  );
}

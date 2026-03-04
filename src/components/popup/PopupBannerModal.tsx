import { useState, useEffect } from 'react';
import { getPopupBannerConfig, getActivePopupBanners } from '@/lib/supabase/popup-banner';
import type { PopupBanner, PopupBannerConfig } from '@/types/popup-banner';

const LS_PREFIX = 'popup_dismissed_';

function shouldShowBanner(banner: PopupBanner, policy: PopupBannerConfig['dismissPolicy']): boolean {
  if (policy === 'always') return true;

  const stored = localStorage.getItem(`${LS_PREFIX}${banner.id}`);
  if (!stored) return true;

  if (stored === 'forever') return false;

  const dismissDate = new Date(stored);
  if (isNaN(dismissDate.getTime())) return true;

  const now = new Date();

  if (policy === '7days') {
    const diffMs = now.getTime() - dismissDate.getTime();
    return diffMs >= 7 * 24 * 60 * 60 * 1000;
  }

  if (policy === '1day') {
    return now.toDateString() !== dismissDate.toDateString();
  }

  return true;
}

function dismissBanner(bannerId: string, policy: PopupBannerConfig['dismissPolicy']) {
  if (policy === 'once') {
    localStorage.setItem(`${LS_PREFIX}${bannerId}`, 'forever');
  } else if (policy === '7days' || policy === '1day') {
    localStorage.setItem(`${LS_PREFIX}${bannerId}`, new Date().toISOString());
  }
}

export default function PopupBannerModal() {
  const [banner, setBanner] = useState<PopupBanner | null>(null);
  const [config, setConfig] = useState<PopupBannerConfig | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [cfg, banners] = await Promise.all([
          getPopupBannerConfig(),
          getActivePopupBanners(),
        ]);

        if (cancelled) return;
        if (!cfg?.isActive || banners.length === 0) return;

        // 첫 번째로 표시 가능한 배너 찾기
        const showable = banners.find(b => shouldShowBanner(b, cfg.dismissPolicy));
        if (!showable) return;

        setConfig(cfg);
        setBanner(showable);
        setVisible(true);
      } catch (error) {
        console.error('Failed to load popup banners:', error);
      }
    }

    // 다른 모달(PWA/약관)이 먼저 처리되도록 약간 지연
    const timer = setTimeout(load, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const handleClose = () => {
    if (banner && config) {
      dismissBanner(banner.id, config.dismissPolicy);
    }
    setVisible(false);
  };

  const handleDismissLong = () => {
    if (banner) {
      // 닫기 정책과 무관하게 7일간 dismiss
      localStorage.setItem(`${LS_PREFIX}${banner.id}`, new Date().toISOString());
    }
    setVisible(false);
  };

  if (!visible || !banner) return null;

  const dismissLabel =
    config?.dismissPolicy === '7days' ? '7일간 안보기'
    : config?.dismissPolicy === '1day' ? '오늘 하루 안보기'
    : config?.dismissPolicy === 'once' ? '다시 안보기'
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
      {/* 배경 클릭 닫기 */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* 모달 */}
      <div
        className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-[420px] mx-4 w-full animate-scaleIn"
        style={{
          backgroundColor: banner.bgColor || '#FFFFFF',
        }}
      >
        {/* 닫기 X 버튼 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:bg-black/10 transition-colors"
          style={{ color: banner.textColor || '#1F2937' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        {/* 제목 */}
        <div className="text-center mb-4">
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: banner.textColor || '#1F2937' }}
          >
            {banner.title}
          </h2>
          <div className="w-32 h-0.5 bg-[#F87171] mx-auto" />
        </div>

        {/* 본문 */}
        {banner.body && (
          <p
            className="text-sm text-center mb-4 whitespace-pre-line"
            style={{ color: banner.textColor || '#1F2937', opacity: 0.75 }}
          >
            {banner.body}
          </p>
        )}

        {/* 이미지 */}
        {banner.imageUrl && (
          <div className="rounded-lg overflow-hidden mb-4">
            <img
              src={banner.imageUrl}
              alt=""
              className="w-full max-h-[300px] object-cover"
            />
          </div>
        )}

        {/* 링크 */}
        {banner.linkUrl && (
          <div className="text-center mb-4">
            <a
              href={banner.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 text-sm hover:underline"
            >
              {banner.linkText || '자세히 보기'} →
            </a>
          </div>
        )}

        {/* 버튼 영역 */}
        <div className="space-y-3">
          <button
            onClick={handleClose}
            className="w-full bg-[#3B82F6] text-white font-medium py-3 rounded-lg hover:brightness-95 transition-all"
          >
            닫기
          </button>
          {dismissLabel && config?.dismissPolicy !== 'once' && (
            <button
              onClick={handleDismissLong}
              className="w-full bg-gray-100 text-gray-600 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-all"
            >
              {dismissLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

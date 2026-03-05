import type { NativeBanner } from '@/types/hero-banner';

interface CardBannerItemProps {
  banner: NativeBanner;
}

export default function CardBannerItem({ banner }: CardBannerItemProps) {
  const handleClick = () => {
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const hasImage = !!banner.imageUrl;
  const hasText = !!banner.title;

  // 텍스트 전용 모드 (이미지 없음)
  if (!hasImage && hasText) {
    return (
      <div
        onClick={handleClick}
        className={`rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all ${
          banner.linkUrl ? 'hover:shadow-md cursor-pointer' : ''
        }`}
        style={{ backgroundColor: banner.bgColor || '#3B82F6' }}
      >
        <div className="px-4 py-4">
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: banner.textColor || '#FFFFFF' }}
          >
            {banner.title}
          </p>
          {banner.description && (
            <p
              className="text-xs mt-1 opacity-90"
              style={{ color: banner.textColor || '#FFFFFF' }}
            >
              {banner.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 이미지 모드 (이미지 + 선택적 캡션)
  return (
    <div
      onClick={handleClick}
      className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all ${
        banner.linkUrl ? 'hover:shadow-md cursor-pointer' : ''
      }`}
    >
      <img
        src={banner.imageUrl}
        alt=""
        className="w-full object-cover"
        style={{ height: '160px' }}
      />
      {hasText && (
        <div
          className="px-3 py-2"
          style={{ backgroundColor: banner.bgColor || '#F8FAFC' }}
        >
          <p
            className="text-xs font-semibold truncate"
            style={{ color: banner.textColor || '#334155' }}
          >
            {banner.title}
          </p>
          {banner.description && (
            <p
              className="text-[11px] truncate mt-0.5 opacity-80"
              style={{ color: banner.textColor || '#64748B' }}
            >
              {banner.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import { IconSparkles, IconPhoto } from '@tabler/icons-react';
import { createBadgeGradient, normalizeHex } from '@/lib/colorUtils';
import type { PromoFormState } from './PromoCardForm';

const DEFAULT_BACKGROUND_GRADIENT: readonly [string, string] = ['#6366f1', '#22d3ee'];
const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

interface PromoCardPreviewProps {
  data: PromoFormState;
}

export default function PromoCardPreview({ data }: PromoCardPreviewProps) {
  const headlineStyle = useMemo(
    () => ({
      color: data.fontColor,
      fontSize: `${data.fontSize}px`
    }),
    [data.fontColor, data.fontSize]
  );

  const backgroundStyle = useMemo(() => {
    if (data.backgroundColorMode === 'gradient') {
      const start = pickGradientValue(data.backgroundGradientStart, DEFAULT_BACKGROUND_GRADIENT[0]);
      const end = pickGradientValue(data.backgroundGradientEnd, DEFAULT_BACKGROUND_GRADIENT[1]);
      return { backgroundImage: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` };
    }
    return { backgroundColor: data.backgroundColor };
  }, [data.backgroundColorMode, data.backgroundColor, data.backgroundGradientStart, data.backgroundGradientEnd]);

  const badgeBarStyle = useMemo(
    () => ({
      backgroundImage:
        data.badgeColorMode === 'gradient'
          ? `linear-gradient(90deg, ${pickGradientValue(
              data.badgeGradientStart,
              DEFAULT_BADGE_GRADIENT[0]
            )} 0%, ${pickGradientValue(data.badgeGradientEnd, DEFAULT_BADGE_GRADIENT[1])} 100%)`
          : createBadgeGradient(data.badgeColor)
    }),
    [data.badgeColor, data.badgeColorMode, data.badgeGradientStart, data.badgeGradientEnd]
  );

  const clampedImageScale = useMemo(
    () => Math.min(Math.max(data.imageScale ?? 1, 0.5), 1.5),
    [data.imageScale]
  );

  const imageWrapperStyle = useMemo(
    () => ({
      height: `${180 * clampedImageScale}px`
    }),
    [clampedImageScale]
  );

  const imageStyle = useMemo(
    () => ({
      maxHeight: `${170 * clampedImageScale}px`,
      maxWidth: `${260 * clampedImageScale}px`
    }),
    [clampedImageScale]
  );

  const placeholderStyle = useMemo(
    () => ({
      height: `${170 * clampedImageScale}px`,
      maxWidth: `${260 * clampedImageScale}px`
    }),
    [clampedImageScale]
  );

  return (
    <div className="sticky top-0 space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-600">미리보기</span>
        <span>{data.isActive ? '노출 중' : '비활성화'}</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full" style={{ ...badgeBarStyle, height: '2px' }} />
        <div className="flex items-center gap-2 bg-white px-4 py-3 text-xs font-semibold uppercase text-primary">
          <IconSparkles size={14} stroke={1.8} />
          <span>셀바 프로모 카드</span>
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            삽입 위치 {data.insertPosition}
          </span>
        </div>
        <div
          className="flex flex-col items-center gap-4 px-5 py-6 text-center transition-colors"
          style={backgroundStyle}
        >
          <h3 className="font-bold leading-tight whitespace-pre-line" style={headlineStyle}>
            {data.headline || '헤드라인을 입력해 주세요'}
          </h3>
          <div className="flex w-full items-center justify-center" style={imageWrapperStyle}>
            {data.imageUrl ? (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/70 p-3">
                <img
                  src={data.imageUrl}
                  alt={data.headline || '프로모 카드 이미지'}
                  className="w-auto object-contain drop-shadow"
                  style={imageStyle}
                  draggable={false}
                />
              </div>
            ) : (
              <div
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400"
                style={placeholderStyle}
              >
                <IconPhoto size={28} stroke={1.8} />
                <p className="mt-2 text-xs">이미지 미선택</p>
              </div>
            )}
          </div>
        </div>
        {!data.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">노출 비활성화 상태</div>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
        <p className="font-medium text-slate-600">실제 반영 위치</p>
        <p className="mt-1 leading-relaxed">
          추천 섹션의 캐러셀 {data.insertPosition}번째 아이템에 삽입됩니다. 위치는 숫자를 조절해 변경할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

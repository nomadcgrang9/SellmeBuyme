import { IconEdit, IconTrash, IconChevronUp, IconChevronDown, IconPhoto } from '@tabler/icons-react';
import { normalizeHex, createBadgeGradient } from '@/lib/colorUtils';
import type { PromoCardSettings } from '@/types';

interface PromoCardListItemProps {
  card: PromoCardSettings;
  onEdit: (card: PromoCardSettings) => void;
  onDelete: (cardId: string) => void;
  onMoveUp: (cardId: string) => void;
  onMoveDown: (cardId: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

export default function PromoCardListItem({
  card,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}: PromoCardListItemProps) {
  // 배지 바 스타일
  const badgeBarStyle = card.badgeColorMode === 'gradient'
    ? {
        backgroundImage: `linear-gradient(90deg, ${pickGradientValue(
          card.badgeGradientStart,
          DEFAULT_BADGE_GRADIENT[0]
        )} 0%, ${pickGradientValue(
          card.badgeGradientEnd,
          DEFAULT_BADGE_GRADIENT[1]
        )} 100%)`
      }
    : { backgroundImage: createBadgeGradient(card.badgeColor) };

  // 배경 스타일
  const backgroundStyle = card.backgroundColorMode === 'gradient'
    ? {
        backgroundImage: `linear-gradient(135deg, ${pickGradientValue(
          card.backgroundGradientStart,
          '#6366f1'
        )} 0%, ${pickGradientValue(
          card.backgroundGradientEnd,
          '#22d3ee'
        )} 100%)`
      }
    : { backgroundColor: card.backgroundColor };

  const handleDelete = () => {
    if (!card.cardId) return;
    if (window.confirm('정말로 이 카드를 삭제하시겠습니까?')) {
      onDelete(card.cardId);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('ko-KR', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      <div className="flex gap-4 items-center">
        {/* 미니 미리보기 */}
        <div className="flex-shrink-0 w-24 h-24">
          <div className="w-full h-full border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            {/* 배지 바 */}
            <div className="w-full h-1" style={badgeBarStyle} />

            {/* 카드 내용 */}
            <div
              className="flex flex-col items-center justify-center gap-1 px-2 py-2 text-center h-[calc(100%-4px)]"
              style={backgroundStyle}
            >
              <h4
                className="text-[8px] font-bold leading-tight line-clamp-2"
                style={{ color: card.fontColor }}
              >
                {card.headline}
              </h4>
              {card.imageUrl ? (
                <img
                  src={card.imageUrl}
                  alt={card.headline}
                  className="w-12 h-12 object-contain"
                />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center text-slate-300">
                  <IconPhoto size={16} stroke={1.5} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 카드 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-slate-800 truncate">
              {card.headline}
            </h3>
            {card.isActive ? (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                활성
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                비활성
              </span>
            )}
          </div>
          <div className="flex gap-4 text-xs text-slate-500">
            <span>삽입 위치: {card.insertPosition}번째</span>
            <span>최근 수정: {formatDate(card.updatedAt)}</span>
          </div>
        </div>

        {/* 버튼 그룹 */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* 편집 버튼 */}
          <button
            onClick={() => onEdit(card)}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
          >
            <IconEdit size={16} className="inline mr-1" />
            편집
          </button>

          {/* 삭제 버튼 */}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
          >
            <IconTrash size={16} className="inline mr-1" />
            삭제
          </button>

          {/* 순서 변경 버튼 */}
          <div className="flex flex-col gap-0.5 ml-2">
            <button
              onClick={() => card.cardId && onMoveUp(card.cardId)}
              disabled={isFirst || !card.cardId}
              className={`p-1 rounded ${
                isFirst || !card.cardId
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="위로 이동"
            >
              <IconChevronUp size={16} />
            </button>
            <button
              onClick={() => card.cardId && onMoveDown(card.cardId)}
              disabled={isLast || !card.cardId}
              className={`p-1 rounded ${
                isLast || !card.cardId
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="아래로 이동"
            >
              <IconChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

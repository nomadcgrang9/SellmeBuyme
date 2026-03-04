import { memo } from 'react';
import { ExperienceCard as ExperienceCardType } from '@/types';
import { IconMapPin, IconCategory, IconSchool, IconUsers, IconPhone, IconAt, IconEdit, IconTrash, IconHeart } from '@tabler/icons-react';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { getExperienceImage, handleImageError } from '@/lib/utils/cardImages';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';
import { useToastStore } from '@/stores/toastStore';

interface ExperienceCardProps {
  card: ExperienceCardType;
  onEditClick?: (card: ExperienceCardType) => void;
  onDeleteClick?: (card: ExperienceCardType) => void;
  onCardClick?: () => void;
  onOpenChatModal?: (roomId: string) => void;
}

function ExperienceCard({ card, onEditClick, onDeleteClick, onCardClick, onOpenChatModal }: ExperienceCardProps) {
  // Zustand selector 최적화: 개별 구독
  const user = useAuthStore((s) => s.user);
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const showToast = useToastStore((s) => s.showToast);
  const isOwner = Boolean(user && card.user_id && user.id === card.user_id);
  const bookmarked = isBookmarked(card.id);

  const categories = card.categories?.slice(0, 3) || [];
  const targetLevels = card.targetSchoolLevels?.slice(0, 3) || [];
  const operationTypes = card.operationTypes?.slice(0, 3) || [];

  // 더미 데이터 폴백
  const displayTitle = card.programTitle || '[제목 없음 - 데이터 확인 필요]';
  const displayIntro = card.introduction || '[소개 없음 - 데이터 확인 필요]';
  const displayLocation = card.locationSummary || '[지역 없음]';

  // categories 기반 이미지 경로 결정
  const imageUrl = getExperienceImage(card.categories);

  // 북마크 토글 핸들러
  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    
    if (!user) {
      showToast('로그인이 필요합니다', 'error');
      return;
    }

    try {
      if (bookmarked) {
        // 북마크 제거
        removeFromStore(card.id);
        await removeBookmark(user.id, card.id, 'experience');
        showToast('북마크를 제거했습니다', 'success');
      } else {
        // 북마크 추가
        addToStore(card.id);
        await addBookmark(user.id, card.id, 'experience');
        showToast('북마크했습니다', 'success');
      }
    } catch (error) {
      console.error('[ExperienceCard] 북마크 토글 실패:', error);
      console.error('[ExperienceCard] 에러 상세:', { name: (error as Error).name, message: (error as Error).message });
      // 실패 시 롤백
      if (bookmarked) {
        addToStore(card.id);
      } else {
        removeFromStore(card.id);
      }
      showToast('북마크 처리에 실패했습니다', 'error');
    }
  };

  // 1:1 채팅 시작 핸들러
  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!card.user_id) return;
    useChatStore.getState().openChat(card.user_id, 'experience', card.id);
  };

  return (
    <article
      className="card-interactive bg-white border border-gray-200 rounded-lg shadow-md animate-slide-up overflow-hidden cursor-pointer flex flex-col"
      style={{ minHeight: '340px' }}
      onClick={onCardClick}
    >
      {/* 상단 컬러 바 */}
      <div className="h-1 bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] flex-shrink-0" />

      <div className="flex p-4 flex-1 gap-3">
        {/* 좌측: 텍스트 정보 */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* 헤더 - "체험" 텍스트, 소유자 액션 */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#f4c96b]">체험</span>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditClick?.(card);
                    }}
                    className="p-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                    title="수정하기"
                  >
                    <IconEdit size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDeleteClick?.(card);
                    }}
                    className="p-0.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="삭제하기"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 제목 */}
          <h3 className="text-xl font-black text-gray-900 mb-2 line-clamp-1 break-keep" style={{ letterSpacing: '-0.4px' }}>
            {displayTitle}
          </h3>

          {/* 부제목 */}
          <p className="text-sm text-gray-600 leading-snug mb-3 line-clamp-2 break-keep">
            {displayIntro}
          </p>

          {/* 태그 */}
          {categories.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {categories.slice(0, 2).map((cat, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* 핵심 정보 4개만 */}
          <div className="mt-4 space-y-1.5 text-sm text-gray-700">
          {/* 지역 */}
          <div className="flex items-center gap-2">
            <IconMapPin size={16} stroke={1.5} className="text-gray-500 flex-shrink-0" />
            <span className="font-medium truncate">{displayLocation}</span>
          </div>

          {/* 대상 학교급 */}
          {targetLevels.length > 0 && (
            <div className="flex items-center gap-2">
              <IconSchool size={16} stroke={1.5} className="text-gray-500 flex-shrink-0" />
              <span className="font-medium truncate">{targetLevels.join(', ')}</span>
            </div>
          )}

          {/* 운영 방식 */}
          {operationTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <IconUsers size={16} stroke={1.5} className="text-gray-500 flex-shrink-0" />
              <span className="font-medium truncate">{operationTypes.join(', ')}</span>
            </div>
          )}
          </div>

        </div>

        {/* 우측: 동그란 프로그램 이미지 (categories 기반 자동 매핑) */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={`${displayTitle} 이미지`}
            className="w-20 h-20 rounded-full object-cover shadow-md"
            onError={(e) => handleImageError(e, 'experience')}
          />
        </div>
      </div>

      {/* 하단 액션바 */}
      <div className="flex gap-2 px-4 pb-3">
        {user && !isOwner && card.user_id && (
          <button
            onClick={handleChatClick}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
            aria-label="채팅하기"
          >
            <MessageCircle className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">채팅</span>
          </button>
        )}
        <button
          onClick={handleBookmarkToggle}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
          aria-label={bookmarked ? '북마크 제거' : '북마크 추가'}
        >
          <IconHeart
            size={16}
            stroke={1.5}
            fill={bookmarked ? 'currentColor' : 'none'}
            className={bookmarked ? 'text-red-500' : 'text-gray-600'}
          />
          <span className="text-sm font-semibold text-gray-700">북마크</span>
        </button>
      </div>
    </article>
  );
}

export default memo(ExperienceCard);

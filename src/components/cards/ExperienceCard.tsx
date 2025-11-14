import { ExperienceCard as ExperienceCardType } from '@/types';
import { IconMapPin, IconCategory, IconSchool, IconUsers, IconPhone, IconAt, IconEdit, IconTrash } from '@tabler/icons-react';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getExperienceImage, handleImageError } from '@/lib/utils/cardImages';
import { createOrGetChatRoom } from '@/lib/supabase/chat';

interface ExperienceCardProps {
  card: ExperienceCardType;
  onEditClick?: (card: ExperienceCardType) => void;
  onDeleteClick?: (card: ExperienceCardType) => void;
  onCardClick?: () => void;
  onOpenChatModal?: (roomId: string) => void;
}

export default function ExperienceCard({ card, onEditClick, onDeleteClick, onCardClick, onOpenChatModal }: ExperienceCardProps) {
  console.log('[ExperienceCard] 렌더링:', {
    id: card.id,
    programTitle: card.programTitle,
    introduction: card.introduction,
    categories: card.categories,
    locationSummary: card.locationSummary,
    targetSchoolLevels: card.targetSchoolLevels,
    operationTypes: card.operationTypes
  });

  const { user } = useAuthStore((state) => ({ user: state.user }));
  const isOwner = Boolean(user && card.user_id && user.id === card.user_id);

  const categories = card.categories?.slice(0, 3) || [];
  const targetLevels = card.targetSchoolLevels?.slice(0, 3) || [];
  const operationTypes = card.operationTypes?.slice(0, 3) || [];

  // 더미 데이터 폴백
  const displayTitle = card.programTitle || '[제목 없음 - 데이터 확인 필요]';
  const displayIntro = card.introduction || '[소개 없음 - 데이터 확인 필요]';
  const displayLocation = card.locationSummary || '[지역 없음]';

  // categories 기반 이미지 경로 결정
  const imageUrl = getExperienceImage(card.categories);

  // 채팅 시작 핸들러
  const handleChatClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      alert('로그인이 필요한 기능입니다');
      return;
    }

    if (!card.user_id) {
      alert('이 체험과는 채팅할 수 없습니다');
      return;
    }

    try {
      const { data: roomId, error } = await createOrGetChatRoom({
        other_user_id: card.user_id,
        context_type: 'experience',
        context_card_id: card.id,
      });

      if (error || !roomId) {
        console.error('채팅방 생성 실패:', error);
        alert('채팅방을 생성할 수 없습니다');
        return;
      }

      // 화면 크기에 따라 분기
      const isMobile = window.innerWidth < 768;
      if (isMobile) {
        // 모바일: 페이지 이동
        window.location.href = `/chat/${roomId}`;
      } else {
        // 데스크톱: 모달 열기
        onOpenChatModal?.(roomId);
      }
    } catch (err) {
      console.error('채팅 시작 오류:', err);
      alert('채팅을 시작할 수 없습니다');
    }
  };

  return (
    <article
      className="card-interactive bg-white border border-gray-200 rounded-lg shadow-md animate-slide-up overflow-hidden cursor-pointer"
      style={{ minHeight: '300px', display: 'flex', flexDirection: 'column' }}
      onClick={onCardClick}
    >
      {/* 상단 컬러 바 */}
      <div className="h-1 bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] flex-shrink-0" />

      <div className="flex p-4 flex-1 gap-3">
        {/* 좌측: 텍스트 정보 */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* 헤더 - "체험" 텍스트, 소유자 액션, 채팅 버튼 */}
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
            {/* 채팅 버튼 (본인 카드가 아니고 user_id가 있을 때만) */}
            {user && !isOwner && card.user_id && (
              <button
                onClick={handleChatClick}
                className="p-1.5 hover:bg-orange-50 rounded-full transition-colors"
                title="채팅하기"
              >
                <MessageCircle className="w-5 h-5 text-[#f4c96b]" />
              </button>
            )}
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
    </article>
  );
}

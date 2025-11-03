import { ExperienceCard as ExperienceCardType } from '@/types';
import { IconMapPin, IconCategory, IconSchool, IconUsers, IconPhone, IconAt } from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';

interface ExperienceCardProps {
  card: ExperienceCardType;
  onEditClick?: (card: ExperienceCardType) => void;
  onCardClick?: () => void;
}

export default function ExperienceCard({ card, onEditClick, onCardClick }: ExperienceCardProps) {
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
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-[#f4c96b]">체험</span>
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
          <div className="space-y-1.5 text-sm text-gray-700 mt-auto">
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

          {isOwner && onEditClick && (
            <div className="pt-3">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditClick(card);
                }}
                className="w-full inline-flex items-center justify-center rounded-lg bg-white border border-gray-300 text-gray-700 px-3 py-1.5 hover:bg-gray-50 transition-colors text-sm font-semibold"
              >
                수정하기
              </button>
            </div>
          )}
        </div>

        {/* 우측: 동그란 프로필 이미지 */}
        <div className="flex-shrink-0">
          <img
            src="/picture/experiences/sports.webp"
            alt={`${displayTitle} 이미지`}
            className="w-20 h-20 rounded-full object-cover shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>
    </article>
  );
}

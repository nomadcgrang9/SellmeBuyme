import React from 'react';
import type { TeacherMarker, PrimaryCategory } from '@/types/markers';
import { CATEGORY_MARKER_COLORS, getTeacherMarkerColor } from '@/types/markers';

interface MobileTeacherCardProps {
  teacher: TeacherMarker;
  isSelected: boolean;
  onClick: () => void;
}

const MobileTeacherCard: React.FC<MobileTeacherCardProps> = ({
  teacher,
  isSelected,
  onClick,
}) => {
  const isActive = teacher.is_active !== false;
  const badgeColor = CATEGORY_MARKER_COLORS[teacher.primary_category as PrimaryCategory] || '#68B2FF';
  const hasSub = teacher.sub_categories && teacher.sub_categories.length > 0;
  const mainBadgeText = hasSub ? teacher.sub_categories![0] : (teacher.primary_category || '');
  const subBadgeText = hasSub ? teacher.primary_category : '';

  const infoParts: string[] = [];
  if (hasSub && teacher.sub_categories!.length > 1) {
    infoParts.push(teacher.sub_categories!.slice(1, 3).join(', '));
  }
  const levels = teacher.preferred_school_levels?.length
    ? teacher.preferred_school_levels
    : teacher.school_levels;
  if (levels && levels.length > 0) {
    infoParts.push(levels.map((l: string) => l.replace('학교', '')).join('/'));
  }
  if (teacher.experience_years) {
    infoParts.push(teacher.experience_years);
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-2xl p-4 overflow-hidden
        transition-all duration-200 active:scale-[0.98]
        ${isSelected
          ? 'ring-2 ring-sky-500 shadow-lg'
          : 'shadow-md hover:shadow-lg'
        }
        ${!isActive ? 'opacity-60' : ''}
      `}
    >
      {/* 좌측 색상 바 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
        style={{ backgroundColor: getTeacherMarkerColor(teacher.primary_category) }}
      />

      <div className="pl-2">
        {/* 행1: 프로필 이미지 + 닉네임 + 상태 */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: getTeacherMarkerColor(teacher.primary_category) }}
          >
            {teacher.profile_image_url ? (
              <img src={teacher.profile_image_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              teacher.nickname?.charAt(0) || 'T'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {teacher.nickname || '익명'}
              </span>
              {isActive ? (
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  구직중
                </span>
              ) : (
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                  구직종료
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 행2: 메인뱃지 + 보조텍스트 */}
        {mainBadgeText && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: badgeColor }}
            >
              {mainBadgeText}
            </span>
            {subBadgeText && (
              <span className="text-xs text-gray-400">{subBadgeText}</span>
            )}
          </div>
        )}

        {/* 행3: 학교급 + 경력 */}
        {infoParts.length > 0 && (
          <div className="text-sm text-gray-600 mb-2 truncate">
            {infoParts.join(' · ')}
          </div>
        )}

        {/* 정보 그리드 */}
        <div className="space-y-1.5 text-sm text-gray-600">
          {/* 활동지역 */}
          {teacher.available_regions && teacher.available_regions.length > 0 && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{teacher.available_regions.join(', ')}</span>
            </div>
          )}

          {/* 자기소개 */}
          {teacher.introduction && (
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="truncate">{teacher.introduction}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileTeacherCard;

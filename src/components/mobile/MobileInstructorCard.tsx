import React from 'react';
import type { InstructorMarker } from '@/types/instructorMarkers';
import { INSTRUCTOR_MARKER_COLORS } from '@/types/instructorMarkers';

interface MobileInstructorCardProps {
  instructor: InstructorMarker;
  isSelected: boolean;
  onClick: () => void;
}

const MobileInstructorCard: React.FC<MobileInstructorCardProps> = ({
  instructor,
  isSelected,
  onClick,
}) => {
  const isActive = instructor.is_active !== false;
  const mainSpecialty = instructor.specialties?.[0] || '';

  // 정보행 (연수대상 + 경력)
  const infoParts: string[] = [];
  if (instructor.target_audience && instructor.target_audience.length > 0) {
    infoParts.push(instructor.target_audience[0]);
  }
  if (instructor.experience_years) {
    infoParts.push(instructor.experience_years);
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-2xl p-4 overflow-hidden
        transition-all duration-200 active:scale-[0.98]
        ${isSelected
          ? 'ring-2 ring-pink-400 shadow-lg'
          : 'shadow-md hover:shadow-lg'
        }
        ${!isActive ? 'opacity-60' : ''}
      `}
    >
      {/* 좌측 색상 바 - 핑크 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
        style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}
      />

      <div className="pl-2">
        {/* 행1: 프로필 이미지 + 이름 + 상태칩 */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
            style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}
          >
            {instructor.profile_image_url ? (
              <img src={instructor.profile_image_url} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
              instructor.display_name?.charAt(0) || 'I'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {instructor.display_name || '익명'}
              </span>
              {isActive ? (
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">
                  활동중
                </span>
              ) : (
                <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                  활동종료
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 행2: 메인뱃지(specialties[0]) + 보조텍스트(연수강사) */}
        {mainSpecialty && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
              style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}
            >
              {mainSpecialty}
            </span>
            <span className="text-xs text-gray-400">연수강사</span>
          </div>
        )}

        {/* 행3: 연수대상 + 경력 */}
        {infoParts.length > 0 && (
          <div className="text-sm text-gray-600 mb-2 truncate">
            {infoParts.join(' · ')}
          </div>
        )}

        {/* 정보 그리드 */}
        <div className="space-y-1.5 text-sm text-gray-600">
          {/* 활동지역 */}
          {instructor.available_regions && instructor.available_regions.length > 0 && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{instructor.available_regions.join(', ')}</span>
            </div>
          )}

          {/* 활동이력 */}
          {instructor.activity_history && (
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="truncate">{instructor.activity_history}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileInstructorCard;

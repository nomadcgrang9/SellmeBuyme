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
      `}
    >
      {/* 좌측 색상 바 - 핑크 */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl"
        style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}
      />

      <div className="pl-2">
        <div className="flex items-start gap-3">
          {/* 프로필 이미지 */}
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

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            {/* 이름 + 연수강사 뱃지 */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-900 truncate">
                {instructor.display_name || '익명'}
              </span>
              <span
                className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-medium"
                style={{
                  color: INSTRUCTOR_MARKER_COLORS.text,
                  borderColor: INSTRUCTOR_MARKER_COLORS.base,
                  backgroundColor: INSTRUCTOR_MARKER_COLORS.light,
                }}
              >
                연수강사
              </span>
            </div>

            {/* 전문분야 */}
            {instructor.specialties && instructor.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {instructor.specialties.slice(0, 2).map((specialty, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 bg-pink-50 text-pink-600 rounded-full">
                    {specialty}
                  </span>
                ))}
                {instructor.specialties.length > 2 && (
                  <span className="text-xs text-gray-400">+{instructor.specialties.length - 2}</span>
                )}
              </div>
            )}

            {/* 활동지역 */}
            {instructor.available_regions && instructor.available_regions.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">
                  {instructor.available_regions.slice(0, 2).join(', ')}
                  {instructor.available_regions.length > 2 && ` 외 ${instructor.available_regions.length - 2}곳`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileInstructorCard;

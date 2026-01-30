import React from 'react';
import type { InstructorMarker } from '@/types/instructorMarkers';

interface InstructorDetailPanelProps {
  instructor: InstructorMarker | null;
  isOpen: boolean;
  onClose: () => void;
  onEmailClick?: (email: string) => void;
  onDirectionsClick?: (instructor: InstructorMarker) => void;
}

export const InstructorDetailPanel: React.FC<InstructorDetailPanelProps> = ({
  instructor,
  isOpen,
  onClose,
  onEmailClick,
  onDirectionsClick,
}) => {
  if (!isOpen || !instructor) return null;

  // 전문분야 표시
  const getSpecialtiesDisplay = () => {
    const parts: string[] = [...instructor.specialties];
    if (instructor.custom_specialty) {
      parts.push(instructor.custom_specialty);
    }
    return parts.join(', ') || '전문분야 미지정';
  };

  // 연수대상 표시
  const getTargetDisplay = () => {
    if (instructor.target_audience && instructor.target_audience.length > 0) {
      return instructor.target_audience.join(', ');
    }
    return null;
  };

  return (
    <div className="w-[260px] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
      {/* 헤더 - 핑크 톤 */}
      <div className="px-4 py-3 border-b border-pink-100 bg-pink-50/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-800 text-sm">강사 정보</h4>
          <button
            onClick={onClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
            aria-label="닫기"
            title="닫기"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 프로필 이미지 + 이름 */}
        <div className="flex items-center gap-3">
          {instructor.profile_image_url ? (
            <img
              src={instructor.profile_image_url}
              alt={instructor.display_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-pink-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center border-2 border-pink-200">
              <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{instructor.display_name}</p>
            {instructor.experience_years && (
              <p className="text-xs text-gray-500">경력 {instructor.experience_years}</p>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 전문분야 */}
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <p className="text-xs text-gray-500">전문분야</p>
            <p className="text-sm text-gray-800">{getSpecialtiesDisplay()}</p>
          </div>
        </div>

        {/* 연수대상 */}
        {getTargetDisplay() && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">연수대상</p>
              <p className="text-sm text-gray-800">{getTargetDisplay()}</p>
            </div>
          </div>
        )}

        {/* 활동 가능 지역 */}
        {instructor.available_regions && instructor.available_regions.length > 0 && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">활동 가능 지역</p>
              <p className="text-sm text-gray-800">{instructor.available_regions.join(', ')}</p>
            </div>
          </div>
        )}

        {/* 활동이력 */}
        {instructor.activity_history && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-pink-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">활동이력</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{instructor.activity_history}</p>
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2">
          {/* 길찾기 버튼 */}
          <button
            onClick={() => onDirectionsClick?.(instructor)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            길찾기
          </button>
          {/* 이메일 연락 버튼 */}
          <button
            onClick={() => onEmailClick?.(instructor.email)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-pink-500 hover:bg-pink-600 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            이메일
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructorDetailPanel;

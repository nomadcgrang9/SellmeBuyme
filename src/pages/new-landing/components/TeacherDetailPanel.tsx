import React from 'react';
import type { TeacherMarker } from '@/types/markers';

interface TeacherDetailPanelProps {
  teacher: TeacherMarker | null;
  isOpen: boolean;
  onClose: () => void;
  onEmailClick?: (email: string) => void;
  onDirectionsClick?: (teacher: TeacherMarker) => void;
}

export const TeacherDetailPanel: React.FC<TeacherDetailPanelProps> = ({
  teacher,
  isOpen,
  onClose,
  onEmailClick,
  onDirectionsClick,
}) => {
  if (!isOpen || !teacher) return null;

  // 카테고리 표시 텍스트 생성
  const getCategoryDisplay = () => {
    const parts: string[] = [];
    if (teacher.primary_category) {
      parts.push(teacher.primary_category);
    }
    if (teacher.sub_categories && teacher.sub_categories.length > 0) {
      parts.push(teacher.sub_categories.join(', '));
    }
    if (teacher.other_subject) {
      parts.push(teacher.other_subject);
    }
    return parts.join(' · ') || '분야 미지정';
  };

  // 학교급 표시
  const getSchoolLevelDisplay = () => {
    if (teacher.preferred_school_levels && teacher.preferred_school_levels.length > 0) {
      return teacher.preferred_school_levels.join(', ');
    }
    if (teacher.school_levels && teacher.school_levels.length > 0) {
      return teacher.school_levels.join(', ');
    }
    return null;
  };

  return (
    <div className="w-[260px] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
      {/* 헤더 - 스카이블루 톤 */}
      <div className="px-4 py-3 border-b border-sky-100 bg-sky-50/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-800 text-sm">구직자 정보</h4>
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
        {/* 프로필 이미지 + 닉네임 */}
        <div className="flex items-center gap-3">
          {teacher.profile_image_url ? (
            <img
              src={teacher.profile_image_url}
              alt={teacher.nickname}
              className="w-12 h-12 rounded-full object-cover border-2 border-sky-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center border-2 border-sky-200">
              <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div>
            <p className="font-bold text-gray-900">{teacher.nickname}</p>
            {teacher.experience_years && (
              <p className="text-xs text-gray-500">경력 {teacher.experience_years}</p>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 분야 */}
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div>
            <p className="text-xs text-gray-500">희망 분야</p>
            <p className="text-sm text-gray-800">{getCategoryDisplay()}</p>
          </div>
        </div>

        {/* 학교급 */}
        {getSchoolLevelDisplay() && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">희망 학교급</p>
              <p className="text-sm text-gray-800">{getSchoolLevelDisplay()}</p>
            </div>
          </div>
        )}

        {/* 활동 가능 지역 */}
        {teacher.available_regions && teacher.available_regions.length > 0 && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">활동 가능 지역</p>
              <p className="text-sm text-gray-800">{teacher.available_regions.join(', ')}</p>
            </div>
          </div>
        )}

        {/* 자기소개 */}
        {teacher.introduction && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">자기소개</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{teacher.introduction}</p>
            </div>
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2">
          {/* 길찾기 버튼 */}
          <button
            onClick={() => onDirectionsClick?.(teacher)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            길찾기
          </button>
          {/* 이메일 연락 버튼 */}
          <button
            onClick={() => onEmailClick?.(teacher.email)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-lg transition-colors"
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

export default TeacherDetailPanel;

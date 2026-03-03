import React, { useEffect } from 'react';
import type { InstructorMarker } from '@/types/instructorMarkers';
import { useAuthStore } from '@/stores/authStore';

interface MobileInstructorDetailProps {
  instructor: InstructorMarker;
  onClose: () => void;
}

const MobileInstructorDetail: React.FC<MobileInstructorDetailProps> = ({ instructor, onClose }) => {
  const { user } = useAuthStore();

  // 바디 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

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

  // Gmail compose URL 생성
  const handleEmailClick = () => {
    const subject = encodeURIComponent(`[학교일자리] ${instructor.display_name}님에게 연락드립니다`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(instructor.email)}&su=${subject}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden shadow-2xl animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 색상 바 - 핑크 */}
        <div className="h-1.5 rounded-t-2xl bg-pink-400" />

        {/* 헤더: 프로필 + 이름 + 닫기 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {instructor.profile_image_url ? (
                <img
                  src={instructor.profile_image_url}
                  alt={instructor.display_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-pink-200 flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center border-2 border-pink-200 flex-shrink-0">
                  <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{instructor.display_name}</p>
                {instructor.experience_years && (
                  <p className="text-xs text-gray-500">경력 {instructor.experience_years}</p>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-600 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          <div className="px-5 py-4 space-y-4">
            {/* 전문분야 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">전문분야</p>
                <p className="text-gray-900">{getSpecialtiesDisplay()}</p>
              </div>
            </div>

            {/* 연수대상 */}
            {getTargetDisplay() && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">연수대상</p>
                  <p className="text-gray-900">{getTargetDisplay()}</p>
                </div>
              </div>
            )}

            {/* 활동 가능 지역 */}
            {instructor.available_regions && instructor.available_regions.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">활동 가능 지역</p>
                  <p className="text-gray-900">{instructor.available_regions.join(', ')}</p>
                </div>
              </div>
            )}

            {/* 활동이력 */}
            {instructor.activity_history && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">활동이력</p>
                  <p className="text-gray-900 whitespace-pre-wrap">{instructor.activity_history}</p>
                </div>
              </div>
            )}

            {/* 전화번호 */}
            {user && instructor.phone_number && instructor.phone_public && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">연락처</p>
                  <a
                    href={`tel:${instructor.phone_number}`}
                    className="text-sm text-pink-600 hover:underline"
                  >
                    {instructor.phone_number}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex gap-2">
            {/* 전화 */}
            {user && instructor.phone_number && instructor.phone_public ? (
              <a
                href={`tel:${instructor.phone_number}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl font-medium text-sm active:bg-gray-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                전화
              </a>
            ) : (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-gray-100 text-gray-400 rounded-xl font-medium text-sm cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                전화
              </button>
            )}
            {/* 이메일 */}
            <button
              onClick={handleEmailClick}
              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-pink-500 text-white rounded-xl font-medium text-sm active:bg-pink-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              이메일
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileInstructorDetail;

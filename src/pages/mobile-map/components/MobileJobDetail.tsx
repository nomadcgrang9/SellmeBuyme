import React, { useEffect } from 'react';
import type { JobPostingCard } from '@/types';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';
import { getSchoolLevelFromJob, SCHOOL_LEVEL_MARKER_COLORS } from '@/lib/constants/markerColors';

interface MobileJobDetailProps {
  job: JobPostingCard;
  onClose: () => void;
  onDirections?: (job: JobPostingCard) => void;
}

const MobileJobDetail: React.FC<MobileJobDetailProps> = ({ job, onClose, onDirections }) => {
  // 학교급 추출 및 색상
  const schoolLevel = getSchoolLevelFromJob(job);
  const schoolColors = SCHOOL_LEVEL_MARKER_COLORS[schoolLevel];

  // 바디 스크롤 방지
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // 길찾기 - 부모 컴포넌트에서 처리
  const handleDirections = () => {
    if (onDirections) {
      onDirections(job);
      onClose(); // 상세 패널 닫기
    }
  };

  // 전화하기
  const handleCall = () => {
    const phone = job.contact || job.structured_content?.contact?.phone;
    if (phone) {
      window.location.href = `tel:${phone.replace(/[^0-9]/g, '')}`;
    }
  };

  // 원본 링크
  const handleSourceLink = () => {
    if (job.source_url) {
      window.open(job.source_url, '_blank');
    }
  };

  // D-day 스타일
  const getDdayStyle = () => {
    if (job.daysLeft === undefined) return 'bg-gray-100 text-gray-600';
    if (job.daysLeft <= 1) return 'bg-red-500 text-white';
    if (job.daysLeft <= 3) return 'bg-red-100 text-red-600';
    return 'bg-blue-100 text-blue-600';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute inset-x-0 bottom-0 bg-white rounded-t-3xl max-h-[90vh] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 학교급별 상단 색상 바 */}
        <div
          className="h-1 rounded-t-3xl"
          style={{ backgroundColor: schoolColors.fill }}
        />

        {/* 핸들 */}
        <div className="flex justify-center pt-2 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pb-4 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: schoolColors.fill + '20',
                    color: schoolColors.text,
                  }}
                >
                  {schoolLevel}
                </span>
                <span className="text-sm text-gray-500">{job.organization}</span>
                {job.isUrgent && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    🔥 긴급
                  </span>
                )}
                {job.daysLeft !== undefined && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getDdayStyle()}`}>
                    D-{job.daysLeft}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900 leading-snug">{job.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 -mr-2 text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 콘텐츠 */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <div className="px-5 py-4 space-y-5">
            {/* 태그 */}
            {job.tags && job.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {job.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 기본 정보 */}
            <div className="space-y-3">
              {job.location && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">위치</p>
                    <p className="text-gray-900">{formatLocationDisplay(job.location)}</p>
                  </div>
                </div>
              )}

              {job.compensation && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">급여</p>
                    <p className="text-gray-900">{job.compensation}</p>
                  </div>
                </div>
              )}

              {job.deadline && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">마감일</p>
                    <p className="text-gray-900">{job.deadline}</p>
                  </div>
                </div>
              )}

              {job.work_period && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">근무기간</p>
                    <p className="text-gray-900">{job.work_period}</p>
                  </div>
                </div>
              )}
            </div>

            {/* 상세 내용 */}
            {job.detail_content && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">상세 내용</h3>
                <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                  {job.detail_content}
                </div>
              </div>
            )}

            {/* 자격요건 */}
            {job.qualifications && job.qualifications.length > 0 && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">자격요건</h3>
                <ul className="space-y-2">
                  {job.qualifications.map((qual, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>{qual}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 연락처 */}
            {(job.contact || job.structured_content?.contact) && (
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-3">연락처</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {job.contact && <p>{job.contact}</p>}
                  {job.structured_content?.contact?.phone && (
                    <p>전화: {job.structured_content.contact.phone}</p>
                  )}
                  {job.structured_content?.contact?.email && (
                    <p>이메일: {job.structured_content.contact.email}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white safe-area-inset-bottom">
          <div className="flex gap-3">
            {/* 전화하기 */}
            {(job.contact || job.structured_content?.contact?.phone) && (
              <button
                onClick={handleCall}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium active:bg-gray-200"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                전화
              </button>
            )}

            {/* 길찾기 */}
            <button
              onClick={handleDirections}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-medium active:bg-blue-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              길찾기
            </button>
          </div>

          {/* 원본 링크 */}
          {job.source_url && (
            <button
              onClick={handleSourceLink}
              className="w-full mt-3 py-2.5 text-sm text-gray-500 flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              원본 공고 보기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileJobDetail;

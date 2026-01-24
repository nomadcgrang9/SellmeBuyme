import React from 'react';
import type { JobPostingCard } from '@/types';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';

interface JobDetailPanelProps {
  job: JobPostingCard | null;
  isOpen: boolean;
  onClose: () => void;
  onDirectionsClick?: (job: JobPostingCard) => void;
}

export const JobDetailPanel: React.FC<JobDetailPanelProps> = ({
  job,
  isOpen,
  onClose,
  onDirectionsClick,
}) => {
  if (!isOpen || !job) return null;

  const isUrgent = job.daysLeft !== undefined && job.daysLeft <= 3;
  const isNearDeadline = job.daysLeft !== undefined && job.daysLeft <= 7;

  return (
    <div className="w-[260px] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
      {/* 헤더 - 라이트 모노톤 */}
      <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-800 text-sm">상세 정보</h4>
          <div className="flex items-center gap-2">
            {job.daysLeft !== undefined && job.daysLeft <= 5 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                job.daysLeft === 0
                  ? 'bg-red-500 text-white'
                  : job.daysLeft <= 3
                    ? 'bg-red-100 text-red-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                {job.daysLeft === 0 ? 'D-Day' : `D-${job.daysLeft}`}
              </span>
            )}
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
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 기관명 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">기관명</p>
          <p className="text-sm font-bold text-gray-900">{job.organization || '기관 정보 없음'}</p>
        </div>

        {/* 공고 제목 */}
        <div>
          <p className="text-xs text-gray-500 mb-1">공고 제목</p>
          <p className="text-sm font-semibold text-gray-800 leading-snug">{job.title}</p>
        </div>

        <hr className="border-gray-100" />

        {/* 위치 */}
        {job.location && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">위치</p>
              <p className="text-sm text-gray-800">{formatLocationDisplay(job.location)}</p>
            </div>
          </div>
        )}

        {/* 보수 */}
        {job.compensation && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">보수</p>
              <p className="text-sm font-medium text-gray-900">{job.compensation}</p>
            </div>
          </div>
        )}

        {/* 마감일 */}
        {job.deadline && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">마감일</p>
              <p className="text-sm text-gray-800">{job.deadline}</p>
            </div>
          </div>
        )}

        {/* 근무기간 */}
        {job.work_period && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">근무기간</p>
              <p className="text-sm text-gray-800">{job.work_period}</p>
            </div>
          </div>
        )}

        {/* 접수기간 */}
        {job.application_period && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">접수기간</p>
              <p className="text-sm text-gray-800">{job.application_period}</p>
            </div>
          </div>
        )}

        {/* 연락처 */}
        {job.contact && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">연락처</p>
              <p className="text-sm text-gray-800">{job.contact}</p>
            </div>
          </div>
        )}

        {/* 태그 - 스크롤 영역 내 (높이 확장으로 스크롤 없이 보임) */}
        {job.tags && job.tags.length > 0 && (
          <>
            <hr className="border-gray-100" />
            <div>
              <p className="text-xs text-gray-500 mb-2">태그</p>
              <div className="flex flex-wrap gap-1.5">
                {job.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 하단 버튼 - 2등분 (길찾기: 검정, 원문링크: 파랑) */}
      <div className="p-4 border-t border-gray-100 flex-shrink-0">
        <div className="flex gap-2">
          {/* 길찾기 버튼 */}
          <button
            onClick={() => onDirectionsClick?.(job)}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            길찾기
          </button>
          {/* 원문 링크 버튼 */}
          {job.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-white bg-[#3B82F6] hover:bg-[#2563EB] rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              원문 링크
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetailPanel;

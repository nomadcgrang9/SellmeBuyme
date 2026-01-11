import React, { useMemo } from 'react';
import type { JobPostingCard } from '@/types';
import { useSearchStore } from '@/stores/searchStore';

interface JobCardProps {
  job: JobPostingCard;
  onClick?: () => void;
  onDirectionsClick?: (job: JobPostingCard) => void;
  themeColor?: 'default' | 'orange' | 'blue' | 'green' | 'purple';
}

const themeColors = {
  default: { bar: 'from-[#8B9BF7] to-[#5B6EF7]', text: 'text-[#5B6EF7]' },
  orange: { bar: 'from-orange-300 to-orange-500', text: 'text-orange-500' },
  blue: { bar: 'from-blue-300 to-blue-500', text: 'text-blue-500' },
  green: { bar: 'from-green-300 to-green-500', text: 'text-green-500' },
  purple: { bar: 'from-purple-300 to-purple-500', text: 'text-purple-500' },
};

export const JobCard: React.FC<JobCardProps> = ({ job, onClick, onDirectionsClick, themeColor = 'default' }) => {
  const isUrgent = job.daysLeft !== undefined && job.daysLeft <= 3;
  const colors = themeColors[themeColor];
  const { filters } = useSearchStore();

  // 선택된 과목 필터와 관련된 태그를 먼저 보여주도록 정렬
  const sortedTags = useMemo(() => {
    if (!job.tags || job.tags.length === 0) return [];
    if (filters.subject.length === 0) return job.tags;

    const selectedSubjects = filters.subject;
    return [...job.tags].sort((a, b) => {
      const aMatches = selectedSubjects.some(sub => a.includes(sub));
      const bMatches = selectedSubjects.some(sub => b.includes(sub));
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      return 0;
    });
  }, [job.tags, filters.subject]);

  return (
    <article
      className="group relative cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden flex flex-col min-h-[240px] transition-all duration-300 ease-out group-hover:shadow-none group-hover:rounded-b-none group-hover:border-b-0 group-hover:z-40">
        {/* 상단 컬러 바 */}
        <div className={`h-1 bg-gradient-to-r ${colors.bar}`} />

        <div className="flex h-full flex-col p-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-sm font-semibold ${colors.text}`}>공고</span>
            <div className="flex items-center gap-2">
              {job.isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  긴급
                </span>
              )}
            </div>
          </div>

          {/* 기관명 */}
          <h3 className="text-lg font-extrabold text-gray-900 mb-1 line-clamp-1" style={{ letterSpacing: '-0.4px' }}>
            {job.organization}
          </h3>

          {/* 제목 */}
          <p className="text-base font-semibold text-gray-700 leading-snug mb-2 line-clamp-1">
            {job.title}
          </p>

          {/* 태그 */}
          <div className="flex flex-wrap gap-1.5 max-h-[44px] overflow-hidden">
            {sortedTags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 기본 정보 */}
          <div className="mt-3 space-y-1.5 text-sm text-gray-700">
            {/* 위치 */}
            <div className="flex items-center gap-2 truncate">
              <svg className="w-4 h-4 text-[#7aa3cc] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-medium truncate">{job.location}</span>
            </div>

            {/* 보수 */}
            <div className="flex items-center gap-2 truncate">
              <svg className="w-4 h-4 text-[#7aa3cc] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-gray-900 truncate">{job.compensation}</span>
            </div>

            {/* 마감일 */}
            <div className="flex items-center gap-2 truncate">
              <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium truncate">{job.deadline}</span>
              {job.daysLeft !== undefined && (
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isUrgent ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  D-{job.daysLeft}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 데스크톱 호버 확장 영역 */}
      <div
        className="hidden md:block absolute inset-x-0 top-full z-50 pointer-events-none opacity-0 translate-y-1 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-b-lg rounded-t-none border border-t-0 border-gray-200 bg-white shadow-2xl p-4 space-y-3">
          {/* 공고 제목 (전체) */}
          <div className="flex items-start gap-2 text-sm text-gray-700">
            <svg className="w-[18px] h-[18px] text-[#2563EB] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">공고 제목</p>
              <p className="font-semibold">{job.title}</p>
            </div>
          </div>

          {/* 근무기간 */}
          {job.work_period && (
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <svg className="w-[18px] h-[18px] text-[#1D4ED8] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">근무기간</p>
                <p className="font-semibold">{job.work_period}</p>
              </div>
            </div>
          )}

          {/* 접수기간 */}
          {job.application_period && (
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <svg className="w-[18px] h-[18px] text-[#2563EB] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">접수기간</p>
                <p className="font-semibold">{job.application_period}</p>
              </div>
            </div>
          )}

          {/* 연락처 */}
          {job.contact && (
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <svg className="w-[18px] h-[18px] text-[#2563EB] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">문의</p>
                <p className="font-semibold">{job.contact}</p>
              </div>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-2 pt-1 text-sm font-semibold flex-wrap">
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 rounded-lg bg-gray-100 text-gray-900 px-3 py-2 hover:bg-gray-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                원문링크
              </a>
            )}
            <button
              type="button"
              className="flex-1 min-w-[70px] inline-flex items-center justify-center gap-1 rounded-lg bg-green-50 text-green-600 px-3 py-2 hover:bg-green-100 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDirectionsClick?.(job);
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              길찾기
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default JobCard;

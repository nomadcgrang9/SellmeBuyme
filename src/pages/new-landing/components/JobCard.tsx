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
  const isNearDeadline = job.daysLeft !== undefined && job.daysLeft <= 7;
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
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden flex flex-col transition-all duration-300 ease-out group-hover:shadow-md group-hover:border-gray-300 group-hover:rounded-b-none group-hover:border-b-0 group-hover:z-40">
        {/* 상단 컬러 바 */}
        <div className={`h-0.5 bg-gradient-to-r ${colors.bar}`} />

        <div className="flex flex-col p-3">
          {/* 헤더: 기관명 + D-day/긴급 뱃지 */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-[13px] font-bold text-gray-900 line-clamp-1 flex-1" style={{ letterSpacing: '-0.3px' }}>
              {job.organization}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              {job.isUrgent && (
                <span className="px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold">
                  긴급
                </span>
              )}
              {job.daysLeft !== undefined && (
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isUrgent
                      ? 'bg-red-100 text-red-700'
                      : isNearDeadline
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  D-{job.daysLeft}
                </span>
              )}
            </div>
          </div>

          {/* 제목 */}
          <p className="text-xs text-gray-600 leading-snug mb-2 line-clamp-2">
            {job.title}
          </p>

          {/* 위치 + 보수 (한 줄로 압축) */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
            <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="truncate">{job.location}</span>
            <span className="text-gray-300">|</span>
            <span className="font-medium text-gray-700 truncate">{job.compensation}</span>
          </div>

          {/* 태그 - 높이 제한 제거, 최대 3개 표시 */}
          {sortedTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {sortedTags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                >
                  {tag}
                </span>
              ))}
              {sortedTags.length > 3 && (
                <span className="text-[10px] text-gray-400">
                  +{sortedTags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 데스크톱 호버 확장 영역 - 컴팩트 버전 */}
      <div
        className="hidden md:block absolute inset-x-0 top-full z-50 pointer-events-none opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-b-lg rounded-t-none border border-t-0 border-gray-300 bg-white shadow-lg p-2.5 space-y-2">
          {/* 마감일 */}
          <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
            <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{job.deadline}</span>
          </div>

          {/* 근무기간 (있을 때만) */}
          {job.work_period && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <svg className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{job.work_period}</span>
            </div>
          )}

          {/* 버튼 영역 */}
          <div className="flex gap-1.5 pt-1">
            {job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center rounded bg-gray-100 text-gray-700 px-2 py-1.5 text-[11px] font-medium hover:bg-gray-200 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                원문
              </a>
            )}
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-[#5B6EF7] text-white px-2 py-1.5 text-[11px] font-medium hover:bg-[#4A5DE6] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDirectionsClick?.(job);
              }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

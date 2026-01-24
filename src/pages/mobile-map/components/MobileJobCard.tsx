import React from 'react';
import type { JobPostingCard } from '@/types';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';

interface MobileJobCardProps {
  job: JobPostingCard;
  isSelected: boolean;
  onClick: () => void;
  onDetailClick: () => void;
}

const MobileJobCard: React.FC<MobileJobCardProps> = ({
  job,
  isSelected,
  onClick,
  onDetailClick,
}) => {
  // D-day 색상
  const getDdayStyle = () => {
    if (job.daysLeft === undefined) return null;
    if (job.daysLeft <= 1) return 'bg-red-500 text-white';
    if (job.daysLeft <= 3) return 'bg-red-100 text-red-600';
    if (job.daysLeft <= 7) return 'bg-orange-100 text-orange-600';
    return 'bg-blue-100 text-blue-600';
  };

  // 요일 계산
  const getDeadlineWithDay = () => {
    if (!job.deadline) return null;
    const deadlineStr = job.deadline.replace(/^~\s*/, '').trim();
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const parts = deadlineStr.split('.');

    if (parts.length >= 2) {
      const year = parts.length === 3 ? parseInt(parts[0]) : new Date().getFullYear();
      const month = parseInt(parts.length === 3 ? parts[1] : parts[0]) - 1;
      const day = parseInt(parts.length === 3 ? parts[2] : parts[1]);
      const date = new Date(year, month, day);

      if (!isNaN(date.getTime())) {
        const dayOfWeek = dayNames[date.getDay()];
        return `${deadlineStr}(${dayOfWeek})`;
      }
    }
    return deadlineStr;
  };

  return (
    <div
      onClick={onClick}
      className={`
        relative bg-white rounded-2xl p-4
        transition-all duration-200 active:scale-[0.98]
        ${isSelected
          ? 'ring-2 ring-blue-500 shadow-lg'
          : 'shadow-md hover:shadow-lg'
        }
      `}
    >
      {/* 상단: 기관명 + D-day */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 truncate flex-1">{job.organization}</span>
        {job.daysLeft !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-2 ${getDdayStyle()}`}>
            D-{job.daysLeft}
          </span>
        )}
      </div>

      {/* 제목 */}
      <h3 className="font-semibold text-gray-900 line-clamp-2 mb-3 leading-snug">
        {job.title}
      </h3>

      {/* 태그들 */}
      {job.tags && job.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {job.tags.slice(0, 3).map((tag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full"
            >
              {tag}
            </span>
          ))}
          {job.tags.length > 3 && (
            <span className="text-xs text-gray-400">+{job.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* 정보 그리드 */}
      <div className="space-y-1.5 text-sm text-gray-600">
        {/* 위치 */}
        {job.location && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{formatLocationDisplay(job.location)}</span>
          </div>
        )}

        {/* 보수 */}
        {job.compensation && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">{job.compensation}</span>
          </div>
        )}

        {/* 마감일 */}
        {job.deadline && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{getDeadlineWithDay()}</span>
          </div>
        )}
      </div>

      {/* 상세보기 버튼 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDetailClick();
        }}
        className="
          absolute bottom-3 right-3
          px-3 py-1.5 text-xs font-medium
          text-blue-600 bg-blue-50 rounded-lg
          active:bg-blue-100 transition-colors
        "
      >
        상세보기
      </button>
    </div>
  );
};

export default MobileJobCard;

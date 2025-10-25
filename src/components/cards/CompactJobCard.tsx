import { JobPostingCard } from '@/types';
import { IconMapPin, IconCoin, IconClock } from '@tabler/icons-react';

interface CompactJobCardProps {
  job: JobPostingCard;
  onClick?: () => void;
}

export default function CompactJobCard({ job, onClick }: CompactJobCardProps) {
  return (
    <article
      className="card-interactive bg-white border border-gray-200 rounded-lg animate-slide-up overflow-hidden h-full cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {/* 상단 컬러 바 */}
      <div className="h-0.5 bg-gradient-to-r from-primary to-[#8fb4d6]" />
      
      <div className="flex h-full flex-col p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#7aa3cc]">공고</span>
          {job.isUrgent && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
              🔥 긴급
            </span>
          )}
        </div>

        {/* 기관명 */}
        <h3 className="text-lg font-extrabold text-gray-900 mb-1 line-clamp-1" style={{ letterSpacing: '-0.4px' }}>
          {job.organization}
        </h3>

        {/* 제목 */}
        <p className="text-base font-semibold text-gray-700 leading-snug mb-2 line-clamp-1">
          {job.title}
        </p>

        {/* 태그 (최대 2개) */}
        <div className="mb-4 flex flex-wrap gap-2">
          {job.tags.slice(0, 3).map((tag, index) => {
            const tagColors = [
              'bg-[#e8f1f8] text-[#5a8ab8]',
              'bg-green-100 text-green-700',
              'bg-indigo-100 text-indigo-700'
            ];
            return (
              <span
                key={index}
                className={`rounded-full px-2.5 py-1 text-sm font-semibold ${tagColors[index % tagColors.length]}`}
              >
                {tag}
              </span>
            );
          })}
        </div>

        {/* 정보 */}
        <div className="mt-auto space-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <IconMapPin size={16} stroke={1.5} className="text-[#7aa3cc] flex-shrink-0" />
            <span className="font-medium truncate">{job.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconCoin size={16} stroke={1.5} className="text-[#7db8a3] flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{job.compensation}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconClock size={16} stroke={1.5} className="text-orange-500 flex-shrink-0" />
            <span className="font-medium truncate">
              {job.deadline}
            </span>
            {job.daysLeft !== undefined && (
              <span
                className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                  job.daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                D-{job.daysLeft}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

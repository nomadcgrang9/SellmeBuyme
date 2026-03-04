import { memo, useState } from 'react';
import { JobPostingCard } from '@/types';
import { IconMapPin, IconCoin, IconClock, IconStar } from '@tabler/icons-react';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';
import { useAuthStore } from '@/stores/authStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useToastStore } from '@/stores/toastStore';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';

interface CompactJobCardProps {
  job: JobPostingCard;
  onClick?: () => void;
}

function CompactJobCard({ job, onClick }: CompactJobCardProps) {
  const user = useAuthStore((s) => s.user);
  const isBookmarkedFn = useBookmarkStore((s) => s.isBookmarked);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const { showToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const bookmarked = isBookmarkedFn(job.id);

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { showToast('로그인이 필요합니다', 'error'); return; }
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (bookmarked) {
        removeFromStore(job.id);
        await removeBookmark(user.id, job.id, 'job');
        showToast('즐겨찾기에서 제거했습니다', 'info');
      } else {
        addToStore(job.id);
        await addBookmark(user.id, job.id, 'job');
        showToast('즐겨찾기에 추가했습니다', 'success');
      }
    } catch {
      if (bookmarked) addToStore(job.id); else removeFromStore(job.id);
      showToast('오류가 발생했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <article
      className="card-interactive bg-white border border-gray-200 rounded-lg animate-slide-up overflow-hidden h-full min-h-[235px] cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="flex h-full flex-col p-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#68B2FF]">공고</span>
          <div className="flex items-center gap-1">
            {job.isUrgent && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                🔥 긴급
              </span>
            )}
            {/* 즐겨찾기 별 버튼 */}
            <button
              onClick={handleBookmarkToggle}
              disabled={isLoading}
              title={bookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              className={`p-1 rounded-full transition-all duration-200 ${bookmarked ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'
                } disabled:opacity-50`}
            >
              <IconStar
                size={16}
                fill={bookmarked ? 'currentColor' : 'none'}
                stroke={bookmarked ? 'none' : 'currentColor'}
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>

        {/* 기관명 */}
        <h3 className="text-base font-extrabold text-gray-900 mb-1 line-clamp-1" style={{ letterSpacing: '-0.3px' }}>
          {job.organization}
        </h3>

        {/* 제목 */}
        <p className="text-sm font-semibold text-gray-700 leading-snug mb-2 line-clamp-1">
          {job.title}
        </p>

        {/* 태그 */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {job.tags.slice(0, 2).map((tag, index) => {
            const tagColors = ['bg-[#e8f1f8] text-[#5a8ab8]', 'bg-green-100 text-green-700'];
            return (
              <span key={index} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tagColors[index % tagColors.length]}`}>
                {tag}
              </span>
            );
          })}
        </div>

        {/* 정보 */}
        <div className="mt-3 space-y-1 text-xs text-gray-700">
          <div className="flex items-center gap-1.5">
            <IconMapPin size={14} stroke={1.5} className="text-[#7aa3cc] flex-shrink-0" />
            <span className="font-medium truncate">{formatLocationDisplay(job.location, job.metropolitan_region)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IconCoin size={14} stroke={1.5} className="text-[#7aa3cc] flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{job.compensation}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IconClock size={14} stroke={1.5} className="text-orange-500 flex-shrink-0" />
            <span className="font-medium truncate">{job.deadline}</span>
            {job.daysLeft !== undefined && (
              <span className={`ml-auto rounded-full px-1.5 py-0.5 text-xs font-semibold ${job.daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                D-{job.daysLeft}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(CompactJobCard);

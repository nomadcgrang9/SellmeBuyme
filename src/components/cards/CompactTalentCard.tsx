import { memo, useState } from 'react';
import { TalentCard as TalentCardType } from '@/types';
import { IconMapPin, IconBriefcase, IconStar } from '@tabler/icons-react';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useToastStore } from '@/stores/toastStore';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';

interface CompactTalentCardProps {
  talent: TalentCardType;
  onClick?: () => void;
}

function CompactTalentCard({ talent, onClick }: CompactTalentCardProps) {
  const user = useAuthStore((s) => s.user);
  const isOwner = Boolean(user && talent.user_id && user.id === talent.user_id);
  const isBookmarkedFn = useBookmarkStore((s) => s.isBookmarked);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const { showToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const bookmarked = isBookmarkedFn(talent.id);

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!talent.user_id) return;
    useChatStore.getState().openChat(talent.user_id, 'talent', talent.id);
  };

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { showToast('로그인이 필요합니다', 'error'); return; }
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (bookmarked) {
        removeFromStore(talent.id);
        await removeBookmark(user.id, talent.id, 'talent');
        showToast('즐겨찾기에서 제거했습니다', 'info');
      } else {
        addToStore(talent.id);
        await addBookmark(user.id, talent.id, 'talent');
        showToast('즐겨찾기에 추가했습니다', 'success');
      }
    } catch {
      if (bookmarked) addToStore(talent.id); else removeFromStore(talent.id);
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
      <div className="flex flex-1 flex-col p-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#7db8a3]">인력풀</span>
          <div className="flex items-center gap-1">
            {talent.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7db8a3] text-white text-xs font-bold rounded-full">
                ✓ 인증
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
            {/* 채팅 버튼 */}
            {user && !isOwner && talent.user_id && (
              <button
                onClick={handleChatClick}
                className="p-1.5 hover:bg-emerald-50 rounded-full transition-colors"
                title="채팅하기"
              >
                <MessageCircle className="w-4 h-4 text-emerald-600" />
              </button>
            )}
          </div>
        </div>

        {/* 이름 */}
        <h3 className="text-base font-extrabold text-gray-900 mb-1 line-clamp-1" style={{ letterSpacing: '-0.3px' }}>
          {talent.name}
        </h3>

        {/* 전문 분야 */}
        <p className="text-sm font-semibold text-gray-700 leading-snug mb-2 line-clamp-1">
          {talent.specialty}
        </p>

        {/* 태그 */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {talent.tags.slice(0, 3).map((tag, index) => {
            const tagColors = ['bg-[#e5f4f0] text-[#5a9d85]', 'bg-[#dff0ea] text-[#5a9d85]', 'bg-cyan-100 text-cyan-700'];
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
            <span className="font-medium truncate">{formatLocationDisplay(talent.location)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IconBriefcase size={14} stroke={1.5} className="text-purple-500 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{talent.experience}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(CompactTalentCard);

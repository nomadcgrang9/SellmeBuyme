import { memo } from 'react';
import { TalentCard as TalentCardType } from '@/types';
import { IconMapPin, IconBriefcase, IconStar } from '@tabler/icons-react';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { createOrGetChatRoom } from '@/lib/supabase/chat';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';

interface CompactTalentCardProps {
  talent: TalentCardType;
  onClick?: () => void;
}

function CompactTalentCard({ talent, onClick }: CompactTalentCardProps) {
  // Zustand selector 최적화: 개별 구독
  const user = useAuthStore((s) => s.user);
  const isOwner = Boolean(user && talent.user_id && user.id === talent.user_id);

  const handleChatClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      alert('로그인이 필요한 기능입니다');
      return;
    }

    if (!talent.user_id) {
      alert('이 인력과는 채팅할 수 없습니다');
      return;
    }

    try {
      const { data: roomId, error } = await createOrGetChatRoom({
        other_user_id: talent.user_id,
        context_type: 'talent',
        context_card_id: talent.id,
      });

      if (error || !roomId) {
        console.error('채팅방 생성 실패:', error);
        alert('채팅방을 생성할 수 없습니다');
        return;
      }

      window.location.href = `/chat/${roomId}`;
    } catch (err) {
      console.error('채팅 시작 오류:', err);
      alert('채팅을 시작할 수 없습니다');
    }
  };

  return (
    <article
      className="card-interactive bg-white border border-gray-200 rounded-lg animate-slide-up overflow-hidden h-full min-h-[235px] cursor-pointer shadow-sm hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      {/* 추천 카드 섹션에서는 상단 컬러 바 제거 */}

      <div className="flex flex-1 flex-col p-3">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-[#7db8a3]">인력풀</span>
          <div className="flex items-center gap-2">
            {talent.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#7db8a3] text-white text-xs font-bold rounded-full">
                ✓ 인증
              </span>
            )}
            {/* 채팅 버튼 (본인 카드가 아니고 user_id가 있을 때만) */}
            {user && !isOwner && talent.user_id && (
              <button
                onClick={handleChatClick}
                className="p-1.5 hover:bg-emerald-50 rounded-full transition-colors"
                title="채팅하기"
              >
                <MessageCircle className="w-5 h-5 text-emerald-600" />
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

        {/* 태그 (최대 2개) */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {talent.tags.slice(0, 3).map((tag, index) => {
            const tagColors = [
              'bg-[#e5f4f0] text-[#5a9d85]',
              'bg-[#dff0ea] text-[#5a9d85]',
              'bg-cyan-100 text-cyan-700'
            ];
            return (
              <span
                key={index}
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tagColors[index % tagColors.length]}`}
              >
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
          <div className="flex items-center gap-1.5">
            <IconStar size={14} stroke={1.5} className="text-yellow-500 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              {talent.rating.toFixed(1)}
            </span>
            <span className="font-medium text-gray-500">({talent.reviewCount})</span>
          </div>
        </div>
      </div>
    </article>
  );
}

export default memo(CompactTalentCard);

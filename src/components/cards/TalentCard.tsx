import { TalentCard as TalentCardType } from '@/types';
import { IconMapPin, IconBriefcase, IconStar, IconPhone, IconAt } from '@tabler/icons-react';
import { MessageCircle } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getTalentImage, handleImageError } from '@/lib/utils/cardImages';
import { createOrGetChatRoom } from '@/lib/supabase/chat';

interface TalentCardProps {
  talent: TalentCardType;
  onEditClick?: (card: TalentCardType) => void;
  isHighlight?: boolean;
}

export default function TalentCard({ talent, onEditClick, isHighlight }: TalentCardProps) {
  const { user } = useAuthStore((s) => ({ user: s.user }));
  const isOwner = Boolean(user && talent.user_id && user.id === talent.user_id);

  // specialty 기반 이미지 경로 결정
  const imageUrl = getTalentImage(talent.specialty);

  // 채팅 시작 핸들러
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

      // 채팅방으로 이동
      window.location.href = `/chat/${roomId}`;
    } catch (err) {
      console.error('채팅 시작 오류:', err);
      alert('채팅을 시작할 수 없습니다');
    }
  };

  return (
    <article
      className={`card-interactive bg-white border rounded-lg shadow-md animate-slide-up overflow-hidden flex flex-col h-full transition-all duration-300 ${
        isHighlight
          ? 'border-[#2f855a] ring-4 ring-[#7db8a3] ring-opacity-50 animate-pulse shadow-xl'
          : 'border-gray-200'
      }`}
      style={{ minHeight: '240px', maxHeight: '240px' }}
    >
      {/* 상단 컬러 바 (인력=그린) */}
      <div className={`h-1 bg-gradient-to-r from-[#7db8a3] to-[#6fb59b] flex-shrink-0 ${isHighlight ? 'h-2' : ''}`} />

      <div className="flex flex-1 p-4 gap-3">
        {/* 좌측: 텍스트 정보 */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#2f855a]">인력</span>
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

          {/* 이름 */}
          <h3 className="text-lg font-extrabold text-gray-900 mb-1 line-clamp-1 break-keep overflow-hidden">
            {talent.name}
          </h3>

          {/* 전문 분야 */}
          <p className="text-base font-semibold text-gray-700 leading-snug mb-2 line-clamp-1 break-keep overflow-hidden">
            {talent.specialty}
          </p>

          {/* 태그 (최대 2개) */}
          <div className="mb-4 flex flex-wrap gap-2">
            {talent.tags.slice(0, 2).map((tag, index) => (
              <span
                key={index}
                className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 정보 */}
          <div className="mt-auto space-y-1.5 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <IconMapPin size={16} stroke={1.5} className="text-[#2f855a] flex-shrink-0" />
            <span className="font-medium truncate">{talent.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <IconBriefcase size={16} stroke={1.5} className="text-[#3b8c6e] flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate">{talent.experience}</span>
          </div>
          {talent.phone && (
            <div className="flex items-center gap-2">
              <IconPhone size={16} stroke={1.5} className="text-emerald-600 flex-shrink-0" />
              <span className="font-medium truncate">{talent.phone}</span>
            </div>
          )}
          {talent.email && (
            <div className="flex items-center gap-2">
              <IconAt size={16} stroke={1.5} className="text-emerald-600 flex-shrink-0" />
              <span className="font-medium truncate">{talent.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <IconStar size={16} stroke={1.5} className="text-yellow-500 flex-shrink-0" />
            <span className="font-medium text-gray-900">
              {talent.rating.toFixed(1)}
            </span>
            <span className="font-medium text-gray-500">({talent.reviewCount})</span>
          </div>
          {isOwner && onEditClick && (
            <div className="pt-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditClick(talent); }}
                className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 px-3 py-2 hover:bg-emerald-100 transition-colors text-sm font-semibold"
              >
                수정하기
              </button>
            </div>
          )}
          </div>
        </div>

        {/* 우측: 동그란 프로필 이미지 (specialty 기반 자동 매핑) */}
        <div className="flex-shrink-0">
          <img
            src={imageUrl}
            alt={`${talent.name} 프로필`}
            className="w-20 h-20 rounded-full object-cover shadow-md"
            onError={(e) => handleImageError(e, 'talent')}
          />
        </div>
      </div>
    </article>
  );
}

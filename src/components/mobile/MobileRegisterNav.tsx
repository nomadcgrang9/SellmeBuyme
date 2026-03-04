/**
 * 모바일 하단 네비게이션바
 * 5개 버튼: 공고보기, 구직자보기, 강사보기, 채팅, 즐겨찾기
 */

import { MapPin, User, Star, MessageCircle } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import PresentationGraph from '@solar-icons/react/csr/business/PresentationGraph';

// 메인 컬러 (스카이블루)
const ACTIVE_COLOR = '#4facfe';

interface MobileRegisterNavProps {
  /** 공고 레이어 표시 여부 */
  showJobLayer: boolean;
  /** 구직자 레이어 표시 여부 */
  showSeekerLayer: boolean;
  /** 강사 레이어 표시 여부 */
  showInstructorLayer: boolean;
  /** 공고 레이어 토글 */
  onJobLayerToggle: () => void;
  /** 구직자 레이어 토글 */
  onSeekerLayerToggle: () => void;
  /** 강사 레이어 토글 */
  onInstructorLayerToggle: () => void;
  /** 채팅 버튼 클릭 */
  onChatClick: () => void;
  /** 즐겨찾기 버튼 클릭 */
  onBookmarkClick: () => void;
}

export default function MobileRegisterNav({
  showJobLayer,
  showSeekerLayer,
  showInstructorLayer,
  onJobLayerToggle,
  onSeekerLayerToggle,
  onInstructorLayerToggle,
  onChatClick,
  onBookmarkClick,
}: MobileRegisterNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200"
      style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {/* 1. 공고보기 토글 */}
        <button
          onClick={onJobLayerToggle}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label={`공고보기 ${showJobLayer ? '켜짐' : '꺼짐'}`}
        >
          <MapPin
            size={20}
            strokeWidth={2}
            style={{ color: showJobLayer ? ACTIVE_COLOR : '#9CA3AF' }}
          />
          <span
            className="text-[10px] mt-0.5 font-medium"
            style={{ color: showJobLayer ? ACTIVE_COLOR : '#9CA3AF' }}
          >
            공고보기
          </span>
        </button>

        {/* 2. 구직자보기 토글 */}
        <button
          onClick={onSeekerLayerToggle}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label={`구직자보기 ${showSeekerLayer ? '켜짐' : '꺼짐'}`}
        >
          <User
            size={20}
            strokeWidth={2}
            style={{ color: showSeekerLayer ? ACTIVE_COLOR : '#9CA3AF' }}
          />
          <span
            className="text-[10px] mt-0.5 font-medium"
            style={{ color: showSeekerLayer ? ACTIVE_COLOR : '#9CA3AF' }}
          >
            구직자보기
          </span>
        </button>

        {/* 3. 강사보기 토글 */}
        <button
          onClick={onInstructorLayerToggle}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label={`강사보기 ${showInstructorLayer ? '켜짐' : '꺼짐'}`}
        >
          <PresentationGraph
            size={20}
            color={showInstructorLayer ? ACTIVE_COLOR : '#9CA3AF'}
          />
          <span
            className="text-[10px] mt-0.5 font-medium"
            style={{ color: showInstructorLayer ? ACTIVE_COLOR : '#9CA3AF' }}
          >
            강사보기
          </span>
        </button>

        {/* 4. 채팅 */}
        <ChatNavButton onClick={onChatClick} />

        {/* 5. 즐겨찾기 */}
        <button
          onClick={onBookmarkClick}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label="즐겨찾기"
        >
          <Star size={20} strokeWidth={2} className="text-gray-400" />
          <span className="text-[10px] mt-0.5 font-medium text-gray-400">즐겨찾기</span>
        </button>
      </div>
    </nav>
  );
}

/** 채팅 네비게이션 버튼 (노란 N 배지 포함) */
function ChatNavButton({ onClick }: { onClick: () => void }) {
  const chatUnreadCount = useChatStore((s) => s.totalUnreadCount);

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
      aria-label="채팅"
    >
      <div className="relative">
        <MessageCircle size={20} strokeWidth={2} className="text-gray-400" />
        {chatUnreadCount > 0 && (
          <span className="absolute -top-1.5 -right-2 w-4 h-4 flex items-center justify-center rounded-full bg-yellow-400 text-gray-800 text-[10px] font-bold shadow-sm">
            N
          </span>
        )}
      </div>
      <span className="text-[10px] mt-0.5 font-medium text-gray-400">채팅</span>
    </button>
  );
}

/**
 * 모바일 하단 등록탭 네비게이션바
 * 6개 버튼: 공고보기, 구직자보기, 채팅, 즐겨찾기, 구직등록, 공고등록
 */

import { MapPin, User, MessageCircle, Star, Plus, FileText } from 'lucide-react';

// 메인 컬러 (스카이블루)
const ACTIVE_COLOR = '#4facfe';

interface MobileRegisterNavProps {
  /** 공고 레이어 표시 여부 */
  showJobLayer: boolean;
  /** 구직자 레이어 표시 여부 */
  showSeekerLayer: boolean;
  /** 공고 레이어 토글 */
  onJobLayerToggle: () => void;
  /** 구직자 레이어 토글 */
  onSeekerLayerToggle: () => void;
  /** 구직등록 버튼 클릭 */
  onJobSeekerRegister: () => void;
  /** 공고등록 버튼 클릭 */
  onJobPostRegister: () => void;
  /** 채팅 버튼 클릭 (미구현) */
  onChatClick: () => void;
  /** 즐겨찾기 버튼 클릭 (미구현) */
  onBookmarkClick: () => void;
  /** 로그인 여부 */
  isLoggedIn: boolean;
}

export default function MobileRegisterNav({
  showJobLayer,
  showSeekerLayer,
  onJobLayerToggle,
  onSeekerLayerToggle,
  onJobSeekerRegister,
  onJobPostRegister,
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

        {/* 3. 채팅 (미구현) */}
        <button
          onClick={onChatClick}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label="채팅"
        >
          <MessageCircle size={20} strokeWidth={2} className="text-gray-400" />
          <span className="text-[10px] mt-0.5 font-medium text-gray-400">채팅</span>
        </button>

        {/* 4. 즐겨찾기 (미구현) */}
        <button
          onClick={onBookmarkClick}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label="즐겨찾기"
        >
          <Star size={20} strokeWidth={2} className="text-gray-400" />
          <span className="text-[10px] mt-0.5 font-medium text-gray-400">즐겨찾기</span>
        </button>

        {/* 5. 구직등록 */}
        <button
          onClick={onJobSeekerRegister}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label="구직등록"
        >
          <Plus size={20} strokeWidth={2.5} className="text-gray-500" />
          <span className="text-[10px] mt-0.5 font-medium text-gray-500">구직등록</span>
        </button>

        {/* 6. 공고등록 */}
        <button
          onClick={onJobPostRegister}
          className="flex flex-col items-center justify-center flex-1 h-full transition-colors"
          aria-label="공고등록"
        >
          <FileText size={20} strokeWidth={2} className="text-gray-500" />
          <span className="text-[10px] mt-0.5 font-medium text-gray-500">공고등록</span>
        </button>
      </div>
    </nav>
  );
}

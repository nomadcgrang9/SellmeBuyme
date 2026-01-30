/**
 * 우측 사이드바: 로그인 + 등록 버튼들 + 즐겨찾기 + 채팅
 * 화이트 글래스모피즘 디자인
 *
 * 레이아웃:
 * ┌──────────────┐
 * │    로그인    │
 * │══════════════│
 * │  + 구직등록  │
 * │──────────────│
 * │  + 공고등록  │
 * │──────────────│
 * │ 교원연수     │ ← 핑크 강조
 * │ 강사등록     │
 * │──────────────│
 * │   즐겨찾기   │
 * │──────────────│
 * │    채팅      │
 * └──────────────┘
 */

import { Plus, FileText, Star, MessageCircle, User } from 'lucide-react';
import PresentationGraph from '@solar-icons/react/csr/business/PresentationGraph';

interface LayerToggleBarProps {
  /** 구직등록 버튼 클릭 */
  onRegisterClick: () => void;
  /** 공고등록 버튼 클릭 */
  onJobPostClick: () => void;
  /** 즐겨찾기 버튼 클릭 */
  onFavoritesClick?: () => void;
  /** 채팅 버튼 클릭 */
  onChatClick?: () => void;
  /** 교원연수 강사등록 버튼 클릭 */
  onInstructorRegisterClick?: () => void;
  /** 로그인 버튼 클릭 */
  onLoginClick: () => void;
  /** 로그인 여부 */
  isLoggedIn?: boolean;
  /** 사용자 프로필 이미지 URL */
  userProfileImage?: string | null;
  /** 사용자 이름 (이니셜용) */
  userName?: string | null;
  // Legacy props (unused but kept for compatibility)
  showJobLayer?: boolean;
  showSeekerLayer?: boolean;
  showInstructorLayer?: boolean;
  onJobLayerToggle?: () => void;
  onSeekerLayerToggle?: () => void;
  onInstructorLayerToggle?: () => void;
}

// 화이트 글래스모피즘 스타일
const glassStyle = {
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.08)',
};

export default function LayerToggleBar({
  onRegisterClick,
  onJobPostClick,
  onFavoritesClick,
  onChatClick,
  onInstructorRegisterClick,
  onLoginClick,
  isLoggedIn = false,
  userProfileImage,
  userName,
}: LayerToggleBarProps) {
  // 이니셜 생성 (이름 첫 글자)
  const getInitial = () => {
    if (userName) return userName.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div
      className="flex flex-col w-[100px] rounded-2xl overflow-hidden"
      style={glassStyle}
    >
      {/* 1. 로그인/프로필 버튼 (최상단) - 일반 스타일로 등록버튼 강조 */}
      {isLoggedIn ? (
        <button
          onClick={onLoginClick}
          className="flex items-center justify-center py-2.5 transition-all duration-200 hover:bg-gray-100"
          aria-label="프로필"
          title="프로필 설정"
        >
          {userProfileImage ? (
            <img
              src={userProfileImage}
              alt="프로필"
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-200 text-gray-600 text-sm font-medium">
              {getInitial()}
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={onLoginClick}
          className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 transition-all duration-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          aria-label="로그인"
          title="로그인"
        >
          <User size={18} strokeWidth={2} />
          <span>로그인</span>
        </button>
      )}

      {/* 구분선 (두꺼운) */}
      <div className="h-px bg-gray-200" />

      {/* 2. 구직등록 버튼 - 아이콘 배지 강조 */}
      <button
        onClick={onRegisterClick}
        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 transition-all duration-200 hover:bg-gray-50"
        aria-label="구직등록"
        title={isLoggedIn ? '구직자로 등록하기' : '로그인 후 등록 가능'}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
          style={{
            background: 'rgba(59, 130, 246, 0.9)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <Plus size={20} strokeWidth={2.5} className="text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500">구직등록</span>
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 3. 공고등록 버튼 - 아이콘 배지 강조 */}
      <button
        onClick={onJobPostClick}
        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 transition-all duration-200 hover:bg-gray-50"
        aria-label="공고등록"
        title={isLoggedIn ? '공고 등록하기' : '로그인 후 등록 가능'}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
          style={{
            background: 'rgba(16, 185, 129, 0.9)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <FileText size={20} strokeWidth={2} className="text-white" />
        </div>
        <span className="text-xs font-medium text-gray-500">공고등록</span>
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 4. 교원연수 강사등록 버튼 - 아이콘 배지 강조 */}
      <button
        onClick={onInstructorRegisterClick}
        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 transition-all duration-200 hover:bg-gray-50"
        aria-label="교원연수 강사등록"
        title="현직교사도 가능합니다. 다양한 분야의 연수에 교직원과 학부모 대상 강사인력풀로 등록해드립니다"
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
          style={{
            background: 'rgba(236, 72, 153, 0.9)',
            backdropFilter: 'blur(4px)',
          }}
        >
          <PresentationGraph size={20} style={{ color: 'white' }} />
        </div>
        <span className="text-xs font-medium text-gray-500 leading-tight text-center">교원연수<br />강사등록</span>
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 5. 즐겨찾기 버튼 */}
      <button
        onClick={onFavoritesClick}
        className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 transition-all duration-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        aria-label="즐겨찾기"
        title={isLoggedIn ? '즐겨찾기 목록' : '로그인 후 이용 가능'}
      >
        <Star size={18} strokeWidth={2} />
        <span>즐겨찾기</span>
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 6. 채팅 버튼 (최하단) */}
      <button
        onClick={onChatClick}
        className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 transition-all duration-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        aria-label="채팅"
        title={isLoggedIn ? '채팅 목록' : '로그인 후 이용 가능'}
      >
        <MessageCircle size={18} strokeWidth={2} />
        <span>채팅</span>
      </button>
    </div>
  );
}

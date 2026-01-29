/**
 * 레이어 토글 + 구직등록 + 공고등록 + 로그인 통합 바 (세로 레이아웃)
 * 화이트 글래스모피즘 디자인
 *
 * 레이아웃:
 * ┌──────────────┐
 * │    로그인    │
 * │══════════════│
 * │   공고만     │ ✓
 * │     보기     │
 * │──────────────│
 * │   구직자만   │
 * │     보기     │
 * │══════════════│
 * │  + 구직등록  │
 * │──────────────│
 * │  + 공고등록  │
 * │──────────────│
 * │   즐겨찾기   │
 * │──────────────│
 * │    채팅      │
 * └──────────────┘
 */

import { MapPin, User, Plus, Check, FileText, Star, MessageCircle } from 'lucide-react';
import PresentationGraph from '@solar-icons/react/csr/business/PresentationGraph';

interface LayerToggleBarProps {
  /** 공고 레이어 표시 여부 */
  showJobLayer: boolean;
  /** 구직자 레이어 표시 여부 */
  showSeekerLayer: boolean;
  /** 교원연수 강사 레이어 표시 여부 */
  showInstructorLayer: boolean;
  /** 공고 레이어 토글 */
  onJobLayerToggle: () => void;
  /** 구직자 레이어 토글 */
  onSeekerLayerToggle: () => void;
  /** 교원연수 강사 레이어 토글 */
  onInstructorLayerToggle: () => void;
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
  showJobLayer,
  showSeekerLayer,
  showInstructorLayer,
  onJobLayerToggle,
  onSeekerLayerToggle,
  onInstructorLayerToggle,
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
      {/* 1. 로그인/프로필 버튼 (최상단) */}
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-[#68B2FF] to-[#3B82F6] text-white text-sm font-bold">
              {getInitial()}
            </div>
          )}
        </button>
      ) : (
        <button
          onClick={onLoginClick}
          className="py-2.5 text-sm font-medium bg-[#68B2FF] text-white hover:bg-[#5AA3F0] transition-all duration-200"
          aria-label="로그인"
          title="로그인"
        >
          로그인
        </button>
      )}

      {/* 구분선 (두꺼운) */}
      <div className="h-px bg-gray-200" />

      {/* 2. 공고만 보기 토글 (2줄) - 활성시 연한 회색(bg-gray-100)으로 통일 */}
      <button
        onClick={onJobLayerToggle}
        className={`
          relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-2
          transition-all duration-200 text-xs font-medium
          ${showJobLayer
            ? 'bg-gray-100 text-gray-800'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-label={`공고만 보기 ${showJobLayer ? '켜짐' : '꺼짐'}`}
        title="공고 마커 표시/숨김"
      >
        <MapPin size={18} strokeWidth={2} />
        <span>공고만</span>
        <span>보기</span>
        {showJobLayer && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center rounded-full"
            style={{
              width: '14px',
              height: '14px',
              backgroundColor: '#68B2FF', // 테마 컬러
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            <Check size={9} strokeWidth={3} color="#FFFFFF" />
          </span>
        )}
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 3. 구직자만 보기 토글 (2줄) - 활성시 연한 회색(bg-gray-100)으로 통일 */}
      <button
        onClick={onSeekerLayerToggle}
        className={`
          relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-2
          transition-all duration-200 text-xs font-medium
          ${showSeekerLayer
            ? 'bg-gray-100 text-gray-800'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-label={`구직자만 보기 ${showSeekerLayer ? '켜짐' : '꺼짐'}`}
        title="구직자 마커 표시/숨김"
      >
        <User size={18} strokeWidth={2} />
        <span>구직자만</span>
        <span>보기</span>
        {showSeekerLayer && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center rounded-full"
            style={{
              width: '14px',
              height: '14px',
              backgroundColor: '#68B2FF', // 테마 컬러
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            <Check size={9} strokeWidth={3} color="#FFFFFF" />
          </span>
        )}
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 4. 교원연수 강사만 보기 토글 (2줄) */}
      <button
        onClick={onInstructorLayerToggle}
        className={`
          relative flex flex-col items-center justify-center gap-0.5 py-2.5 px-2
          transition-all duration-200 text-xs font-medium
          ${showInstructorLayer
            ? 'bg-pink-50 text-pink-700'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }
        `}
        aria-label={`교원연수 강사만 보기 ${showInstructorLayer ? '켜짐' : '꺼짐'}`}
        title="교원연수 강사 마커 표시/숨김"
      >
        <PresentationGraph size={18} />
        <span>교원연수</span>
        <span>강사만 보기</span>
        {showInstructorLayer && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center rounded-full"
            style={{
              width: '14px',
              height: '14px',
              backgroundColor: '#F9A8D4', // 핑크 테마 컬러
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            }}
          >
            <Check size={9} strokeWidth={3} color="#FFFFFF" />
          </span>
        )}
      </button>

      {/* 구분선 (두꺼운) */}
      <div className="h-px bg-gray-200" />

      {/* 5. 구직등록 버튼 - 호버시 연한 회색 */}
      <button
        onClick={onRegisterClick}
        className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 transition-all duration-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        aria-label="구직등록"
        title={isLoggedIn ? '구직자로 등록하기' : '로그인 후 등록 가능'}
      >
        <Plus size={18} strokeWidth={2.5} />
        <span>구직등록</span>
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 5. 공고등록 버튼 - 호버시 연한 회색 */}
      <button
        onClick={onJobPostClick}
        className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 transition-all duration-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        aria-label="공고등록"
        title={isLoggedIn ? '공고 등록하기' : '로그인 후 등록 가능'}
      >
        <FileText size={18} strokeWidth={2} />
        <span>공고등록</span>
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 6. 교원연수 강사등록 버튼 */}
      <button
        onClick={onInstructorRegisterClick}
        className="flex flex-col items-center justify-center gap-0.5 py-2.5 px-2 transition-all duration-200 text-xs font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        aria-label="교원연수 강사등록"
        title="현직교사도 가능합니다. 다양한 분야의 연수에 교직원과 학부모 대상 강사인력풀로 등록해드립니다"
      >
        <PresentationGraph size={18} />
        <span className="leading-tight text-center">교원연수</span>
        <span className="leading-tight text-center">강사등록</span>
      </button>

      {/* 구분선 (얇은) */}
      <div className="h-px bg-gray-100 mx-2" />

      {/* 7. 즐겨찾기 버튼 - 호버시 연한 회색 */}
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

      {/* 7. 채팅 버튼 (최하단) - 호버시 연한 회색 */}
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

import React, { useState, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { IconStar } from '@tabler/icons-react';
import type { InstructorMarker } from '@/types/instructorMarkers';
import { INSTRUCTOR_MARKER_COLORS } from '@/types/instructorMarkers';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useToastStore } from '@/stores/toastStore';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';
import { toggleInstructorMarkerStatus } from '@/lib/supabase/instructorMarkers';

interface InstructorDetailPanelProps {
  instructor: InstructorMarker | null;
  isOpen: boolean;
  onClose: () => void;
}

export const InstructorDetailPanel: React.FC<InstructorDetailPanelProps> = ({
  instructor,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();

  if (!isOpen || !instructor) return null;

  const isOwner = user?.id === instructor.user_id;
  const [localIsActive, setLocalIsActive] = useState(instructor.is_active !== false);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState<'email' | null>(null);
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);

  const isBookmarked = useBookmarkStore((s) => s.isBookmarked)(instructor.id);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const { showToast } = useToastStore();

  const handleBookmarkToggle = useCallback(async () => {
    if (!user) { showToast('로그인이 필요합니다', 'error'); return; }
    if (isBookmarkLoading) return;
    setIsBookmarkLoading(true);
    try {
      if (isBookmarked) {
        removeFromStore(instructor.id);
        await removeBookmark(user.id, instructor.id, 'experience');
        showToast('즐겨찾기에서 제거했습니다', 'success');
      } else {
        addToStore(instructor.id);
        await addBookmark(user.id, instructor.id, 'experience');
        showToast('즐겨찾기에 추가했습니다', 'success');
      }
    } catch {
      if (isBookmarked) addToStore(instructor.id);
      else removeFromStore(instructor.id);
      showToast('오류가 발생했습니다', 'error');
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [user, isBookmarked, isBookmarkLoading, instructor.id, addToStore, removeFromStore, showToast]);

  // 클립보드 복사
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(instructor.email);
      setCopied('email');
      setTimeout(() => setCopied(null), 1500);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = instructor.email;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied('email');
      setTimeout(() => setCopied(null), 1500);
    }
  };

  // Gmail compose URL 생성
  const handleEmailClick = () => {
    const subject = encodeURIComponent(`[학교일자리] ${instructor.display_name}님에게 연락드립니다`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(instructor.email)}&su=${subject}`;
    window.open(gmailUrl, '_blank');
  };

  // 연수대상 표시
  const getTargetDisplay = () => {
    if (instructor.target_audience && instructor.target_audience.length > 0) {
      return instructor.target_audience.join(', ');
    }
    return null;
  };

  return (
    <div className="w-[260px] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
      {/* 헤더 - 메인 블루 톤 유지 */}
      <div className="px-4 py-3 border-b border-sky-100 bg-sky-50/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-800 text-sm">강사 정보</h4>
          <div className="flex items-center gap-1">
            <button
              onClick={handleBookmarkToggle}
              disabled={isBookmarkLoading}
              className="p-2 text-gray-400 hover:text-yellow-500 transition-colors rounded-lg"
              title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
            >
              <IconStar
                size={18}
                className={isBookmarked ? 'text-yellow-400 fill-yellow-400' : ''}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors active:scale-95"
              aria-label="닫기"
              title="닫기"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 프로필 이미지 + 이름 + 상태칩 */}
        <div className="flex items-center gap-3">
          {instructor.profile_image_url ? (
            <img
              src={instructor.profile_image_url}
              alt={instructor.display_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-sky-200"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center border-2 border-sky-200">
              <svg className="w-6 h-6 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-gray-900">{instructor.display_name}</p>
              {localIsActive ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-medium">
                  활동중
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                  활동종료
                </span>
              )}
            </div>
            {instructor.experience_years && (
              <p className="text-xs text-gray-500">경력 {instructor.experience_years}</p>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 전문분야 - pill 뱃지 */}
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div>
            <p className="text-xs text-gray-500">전문분야</p>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {instructor.specialties.map((s, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}>
                  {s}
                </span>
              ))}
            </div>
            {instructor.custom_specialty && (
              <p className="text-xs text-gray-600 mt-0.5">{instructor.custom_specialty}</p>
            )}
          </div>
        </div>

        {/* 연수대상 */}
        {getTargetDisplay() && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">연수대상</p>
              <p className="text-sm text-gray-800">{getTargetDisplay()}</p>
            </div>
          </div>
        )}

        {/* 활동 가능 지역 */}
        {instructor.available_regions && instructor.available_regions.length > 0 && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">활동 가능 지역</p>
              <p className="text-sm text-gray-800">{instructor.available_regions.join(', ')}</p>
            </div>
          </div>
        )}

        {/* 활동이력 */}
        {instructor.activity_history && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">활동이력</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{instructor.activity_history}</p>
            </div>
          </div>
        )}

        {/* 이메일 - 정보행 */}
        {instructor.email && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">이메일</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleEmailClick}
                  className="text-sm text-sky-600 hover:underline cursor-pointer truncate"
                >
                  {instructor.email}
                </button>
                <button
                  onClick={handleCopyEmail}
                  className="flex-shrink-0 p-1 text-gray-300 hover:text-sky-500 transition-colors rounded"
                  title="이메일 복사"
                >
                  {copied === 'email' ? (
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 전화번호 - 로그인 회원 + phone_public 허용 시에만 표시 */}
        {user && instructor.phone_number && instructor.phone_public && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">연락처</p>
              <a
                href={`tel:${instructor.phone_number}`}
                className="text-sm text-sky-600 hover:underline"
              >
                {instructor.phone_number}
              </a>
            </div>
          </div>
        )}

        {/* 1:1 채팅 버튼 - 본인이 아닐 때만 */}
        {!isOwner && user && instructor.user_id && (
          <button
            onClick={() => {
              useChatStore.getState().openChat(instructor.user_id!, 'experience', instructor.id);
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 transition-colors text-sm font-medium"
          >
            <MessageCircle size={16} />
            <span>1:1 채팅하기</span>
          </button>
        )}

        {/* 활동 상태 토글 - 본인 마커일 때만 */}
        {isOwner && (
          <div className="pt-3 mt-1 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">활동 상태</span>
              <button
                onClick={async () => {
                  if (isToggling) return;
                  setIsToggling(true);
                  const newStatus = !localIsActive;
                  try {
                    await toggleInstructorMarkerStatus(instructor.id, newStatus);
                    setLocalIsActive(newStatus);
                    instructor.is_active = newStatus;
                  } catch (err) {
                    console.error('상태 변경 실패:', err);
                  } finally {
                    setIsToggling(false);
                  }
                }}
                disabled={isToggling}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  localIsActive ? 'bg-pink-500' : 'bg-gray-300'
                } ${isToggling ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  localIsActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {localIsActive ? '활동중 - 학교 담당자에게 보입니다' : '활동종료 - 비공개 상태입니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default InstructorDetailPanel;

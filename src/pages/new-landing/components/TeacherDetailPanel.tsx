import React, { useState } from 'react';
import type { TeacherMarker } from '@/types/markers';
import { CATEGORY_MARKER_COLORS, type PrimaryCategory } from '@/types/markers';
import { useAuthStore } from '@/stores/authStore';
import { toggleTeacherMarkerStatus } from '@/lib/supabase/markers';

interface TeacherDetailPanelProps {
  teacher: TeacherMarker | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TeacherDetailPanel: React.FC<TeacherDetailPanelProps> = ({
  teacher,
  isOpen,
  onClose,
}) => {
  const { user } = useAuthStore();

  if (!isOpen || !teacher) return null;

  // 메인뱃지 로직: sub가 있으면 sub[0]이 메인, 없으면 primary가 메인
  const hasSub = teacher.sub_categories && teacher.sub_categories.length > 0;
  const mainBadge = hasSub ? teacher.sub_categories![0] : (teacher.primary_category || '');
  const subText = hasSub ? teacher.primary_category : '';
  const badgeColor = CATEGORY_MARKER_COLORS[teacher.primary_category as PrimaryCategory] || '#68B2FF';

  // 카테고리 표시 텍스트 생성
  const getCategoryDisplay = () => {
    const parts: string[] = [];
    if (teacher.primary_category) {
      parts.push(teacher.primary_category);
    }
    if (teacher.sub_categories && teacher.sub_categories.length > 0) {
      parts.push(teacher.sub_categories.join(', '));
    }
    if (teacher.other_subject) {
      parts.push(teacher.other_subject);
    }
    return parts.join(' · ') || '분야 미지정';
  };

  // 학교급 표시
  const getSchoolLevelDisplay = () => {
    if (teacher.preferred_school_levels && teacher.preferred_school_levels.length > 0) {
      return teacher.preferred_school_levels.join(', ');
    }
    if (teacher.school_levels && teacher.school_levels.length > 0) {
      return teacher.school_levels.join(', ');
    }
    return null;
  };

  const isOwner = user?.id === teacher.user_id;
  const [localIsActive, setLocalIsActive] = useState(teacher.is_active !== false);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState<'email' | null>(null);

  // 클립보드 복사
  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(teacher.email);
      setCopied('email');
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // fallback: 구형 브라우저
      const ta = document.createElement('textarea');
      ta.value = teacher.email;
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
    const subject = encodeURIComponent(`[학교일자리] ${teacher.nickname}님에게 연락드립니다`);
    const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(teacher.email)}&su=${subject}`;
    window.open(gmailUrl, '_blank');
  };

  return (
    <div className="w-[260px] bg-white/95 backdrop-blur-sm rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
      {/* 헤더 - 스카이블루 톤 */}
      <div className="px-4 py-3 border-b border-sky-100 bg-sky-50/50 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-gray-800 text-sm">구직자 정보</h4>
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

      {/* 내용 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 프로필 이미지 + 닉네임 + 상태칩 */}
        <div className="flex items-center gap-3">
          {teacher.profile_image_url ? (
            <img
              src={teacher.profile_image_url}
              alt={teacher.nickname}
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
              <p className="font-bold text-gray-900">{teacher.nickname}</p>
              {localIsActive ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                  구직중
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                  구직종료
                </span>
              )}
            </div>
            {teacher.experience_years && (
              <p className="text-xs text-gray-500">경력 {teacher.experience_years}</p>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* 분야 */}
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <div>
            <p className="text-xs text-gray-500">희망 분야</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {mainBadge && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full text-white font-medium"
                  style={{ backgroundColor: badgeColor }}
                >
                  {mainBadge}
                </span>
              )}
              {subText && (
                <span className="text-xs text-gray-400">{subText}</span>
              )}
              {!mainBadge && (
                <p className="text-sm text-gray-800">{getCategoryDisplay()}</p>
              )}
            </div>
            {/* 나머지 sub가 있으면 표시 */}
            {hasSub && teacher.sub_categories!.length > 1 && (
              <p className="text-xs text-gray-600 mt-0.5">
                {teacher.sub_categories!.slice(1).join(', ')}
              </p>
            )}
            {teacher.other_subject && (
              <p className="text-xs text-gray-600 mt-0.5">{teacher.other_subject}</p>
            )}
          </div>
        </div>

        {/* 학교급 */}
        {getSchoolLevelDisplay() && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">희망 학교급</p>
              <p className="text-sm text-gray-800">{getSchoolLevelDisplay()}</p>
            </div>
          </div>
        )}

        {/* 활동 가능 지역 */}
        {teacher.available_regions && teacher.available_regions.length > 0 && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">활동 가능 지역</p>
              <p className="text-sm text-gray-800">{teacher.available_regions.join(', ')}</p>
            </div>
          </div>
        )}

        {/* 자기소개 */}
        {teacher.introduction && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">자기소개</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{teacher.introduction}</p>
            </div>
          </div>
        )}

        {/* 이메일 - 정보행 */}
        {teacher.email && (
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
                  {teacher.email}
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
        {user && teacher.phone_number && teacher.phone_public && (
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <div>
              <p className="text-xs text-gray-500">연락처</p>
              <a
                href={`tel:${teacher.phone_number}`}
                className="text-sm text-sky-600 hover:underline"
              >
                {teacher.phone_number}
              </a>
            </div>
          </div>
        )}

        {/* 구직 상태 토글 - 본인 마커일 때만 */}
        {isOwner && (
          <div className="pt-3 mt-1 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">구직 상태</span>
              <button
                onClick={async () => {
                  if (isToggling) return;
                  setIsToggling(true);
                  const newStatus = !localIsActive;
                  try {
                    await toggleTeacherMarkerStatus(teacher.id, newStatus);
                    setLocalIsActive(newStatus);
                    teacher.is_active = newStatus;
                  } catch (err) {
                    console.error('상태 변경 실패:', err);
                  } finally {
                    setIsToggling(false);
                  }
                }}
                disabled={isToggling}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  localIsActive ? 'bg-emerald-500' : 'bg-gray-300'
                } ${isToggling ? 'opacity-50' : ''}`}
              >
                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  localIsActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`} />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {localIsActive ? '구직중 - 다른 사용자에게 표시됩니다' : '구직종료 - 비공개 상태입니다'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDetailPanel;

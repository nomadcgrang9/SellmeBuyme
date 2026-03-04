import { ReactNode, useState, useCallback } from 'react';
import { JobPostingCard } from '@/types';
import {
  IconX,
  IconMapPin,
  IconCoin,
  IconClock,
  IconCalendar,
  IconPhone,
  IconFileDownload,
  IconExternalLink,
  IconBook,
  IconEdit,
  IconStar
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';
import { useToastStore } from '@/stores/toastStore';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';

type StatItem = {
  icon: typeof IconMapPin;
  accent: string;
  label: string;
  value: ReactNode;
};

interface JobDetailModalProps {
  job: JobPostingCard;
  isOpen: boolean;
  onClose: () => void;
  onEditClick?: (job: JobPostingCard) => void;
}

export default function JobDetailModal({ job, isOpen, onClose, onEditClick }: JobDetailModalProps) {
  const { user } = useAuthStore((state) => ({ user: state.user }));
  const isBookmarkedFn = useBookmarkStore((s) => s.isBookmarked);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const { showToast } = useToastStore();
  const [isBookmarkLoading, setIsBookmarkLoading] = useState(false);
  const isBookmarked = isBookmarkedFn(job.id);

  const handleBookmarkToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { showToast('로그인이 필요합니다', 'error'); return; }
    if (isBookmarkLoading) return;
    setIsBookmarkLoading(true);
    try {
      if (isBookmarked) {
        removeFromStore(job.id);
        await removeBookmark(user.id, job.id, 'job');
        showToast('즐겨찾기에서 제거했습니다', 'success');
      } else {
        addToStore(job.id);
        await addBookmark(user.id, job.id, 'job');
        showToast('즐겨찾기에 추가했습니다', 'success');
      }
    } catch (err) {
      console.error('[JobDetailModal] 북마크 토글 실패:', err);
      if (isBookmarked) addToStore(job.id); else removeFromStore(job.id);
      showToast('오류가 발생했습니다', 'error');
    } finally {
      setIsBookmarkLoading(false);
    }
  }, [user, isBookmarked, isBookmarkLoading, job.id, addToStore, removeFromStore, showToast]);

  // 소유권 확인
  const isOwner = user && job.user_id === user.id && job.source === 'user_posted';
  if (!isOpen) return null;

  const structured = job.structured_content ?? null;
  const formatText = (value?: string | null) => {
    const trimmed = value?.toString().trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  };
  const rawDeadline = job.deadline
    ? `${job.deadline}${job.daysLeft !== undefined ? ` (D-${job.daysLeft})` : ''}`
    : undefined;
  const deadline = formatText(rawDeadline);
  const location = formatText(job.location ? formatLocationDisplay(job.location, job.metropolitan_region) : undefined);
  const compensation = formatText(job.compensation);
  const workPeriod = formatText(structured?.overview?.work_period || job.work_period);
  const applicationPeriod = formatText(structured?.overview?.application_period || job.application_period);
  // 연락처 정보 추출 (이름, 전화번호, 이메일)
  const contactNameRaw = formatText(structured?.contact?.name);
  const contactPhoneRaw = formatText(structured?.contact?.phone);
  const contactEmailRaw = formatText(structured?.contact?.email);
  const fallbackContact = formatText(job.contact);

  let fallbackContactName: string | undefined;
  let fallbackContactPhone: string | undefined;
  let fallbackContactEmail: string | undefined;

  if (fallbackContact) {
    // 전화번호 추출
    const phoneMatch = fallbackContact.match(/\d{2,4}[\-\s]?\d{3,4}[\-\s]?\d{4}/);
    if (phoneMatch) {
      fallbackContactPhone = phoneMatch[0].replace(/\s+/g, '');
      if (!fallbackContactPhone.includes('-') && fallbackContactPhone.length >= 9) {
        const digits = fallbackContactPhone;
        const area = digits.length === 9 ? digits.slice(0, 2) : digits.slice(0, 3);
        const mid = digits.length === 9 ? digits.slice(2, 5) : digits.slice(3, digits.length - 4);
        const tail = digits.slice(-4);
        fallbackContactPhone = `${area}-${mid}-${tail}`;
      }
    }

    // 이메일 추출
    const emailMatch = fallbackContact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      fallbackContactEmail = emailMatch[0];
    }

    // 이름 추출 (전화번호와 이메일 제거 후)
    const cleaned = fallbackContact
      .replace(phoneMatch ? phoneMatch[0] : '', '')
      .replace(emailMatch ? emailMatch[0] : '', '')
      .split(/\n|\|/)
      .map((segment) => segment.replace(/[\p{Zs}\t]+/gu, ' ').trim())
      .find((segment) => segment.length > 0);

    if (cleaned) {
      fallbackContactName = cleaned;
    }
  }

  const contactName = contactNameRaw ?? fallbackContactName;
  const contactPhone = contactPhoneRaw ?? fallbackContactPhone;
  const contactEmail = contactEmailRaw ?? fallbackContactEmail;

  const contactItems = [
    contactName ? { label: '담당자', value: contactName } : null,
    contactPhone ? { label: '전화번호', value: contactPhone } : null,
    contactEmail ? { label: '이메일', value: contactEmail } : null
  ].filter(Boolean) as { label: string; value: string }[];

  const buildStat = (
    icon: typeof IconMapPin,
    accent: string,
    label: string,
    value: ReactNode
  ): StatItem => ({ icon, accent, label, value });

  const primaryStats: StatItem[] = [];
  if (location) {
    primaryStats.push(buildStat(IconMapPin, 'text-[#7aa3cc]', '위치', location));
  }
  if (compensation) {
    primaryStats.push(buildStat(IconCoin, 'text-[#7db8a3]', '급여', compensation));
  }
  if (deadline) {
    primaryStats.push(buildStat(IconClock, 'text-orange-500', '마감일', deadline));
  }

  const secondaryStats: StatItem[] = [];
  if (workPeriod) {
    secondaryStats.push(buildStat(IconCalendar, 'text-blue-500', '근무기간', workPeriod));
  }
  if (applicationPeriod) {
    secondaryStats.push(buildStat(IconCalendar, 'text-indigo-500', '접수기간', applicationPeriod));
  }

  const qualifications = job.qualifications && job.qualifications.length > 0
    ? job.qualifications
    : structured?.qualifications?.filter((item) => item && item.trim().length > 0) ?? [];
  const workTime = formatText(job.work_time);
  const headingLine = [job.organization, job.title].filter(Boolean).join(' ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-[#8fb4d6] p-4 text-white">
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {/* 즐겨찾기 별 버튼 */}
            <button
              onClick={handleBookmarkToggle}
              disabled={isBookmarkLoading}
              title={isBookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              className={`p-1.5 rounded-full transition-all duration-200 ${isBookmarked
                ? 'text-amber-300 hover:bg-white/20'
                : 'text-white/60 hover:text-amber-300 hover:bg-white/20'
                } disabled:opacity-50`}
            >
              <IconStar
                size={20}
                fill={isBookmarked ? 'currentColor' : 'none'}
                stroke={isBookmarked ? 'none' : 'currentColor'}
                strokeWidth={1.5}
              />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <IconX size={24} />
            </button>
          </div>

          <div className="pr-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold opacity-90">공고</span>
              {job.isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  🔥 긴급
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold leading-tight md:text-2xl">
              {headingLine}
            </h2>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-3 sm:p-5 sm:space-y-4">
          {/* 상단 요약 카드 */}
          <div className="space-y-2.5 sm:space-y-3">
            {primaryStats.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-2">
                {primaryStats.map(({ icon: StatIcon, accent, label, value }) => (
                  <div key={label} className="flex items-start gap-1.5 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                    <StatIcon size={20} className={`${accent} flex-shrink-0 mt-0.5`} />
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                      <div className="font-semibold text-gray-900 leading-tight break-words">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {secondaryStats.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {secondaryStats.map(({ icon: StatIcon, accent, label, value }) => (
                  <div key={label} className="flex items-start gap-1.5 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                    <StatIcon size={20} className={`${accent} flex-shrink-0 mt-0.5`} />
                    <div>
                      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
                      <div className="font-semibold text-gray-900 leading-tight break-words">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {workTime && (
              <div className="flex items-start gap-1.5 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                <IconClock size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">근무시간</div>
                  <div className="font-semibold text-gray-900 break-words">{workTime}</div>
                </div>
              </div>
            )}
          </div>

          {/* 문의 정보 */}
          {contactItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <IconPhone size={20} />
                문의
              </h3>
              <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
                  {contactItems.map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-2 text-sm text-gray-900">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {label}
                      </span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 자격 요건 */}
          {qualifications.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <IconBook size={20} />
                자격 요건
              </h3>
              <div className="bg-gray-50 rounded-lg p-2.5 sm:p-3">
                <p className="text-sm text-gray-700 leading-relaxed">
                  {qualifications.join(', ')}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* source에 따라 첨부파일/공고문 버튼 분기 */}
            {job.source === 'user_posted' ? (
              // 직접등록 공고 - 첨부파일 다운로드
              job.attachment_url ? (
                <a
                  href={job.attachment_url}
                  download
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <IconFileDownload size={20} />
                  첨부파일
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                >
                  <IconFileDownload size={20} />
                  첨부파일 없음
                </button>
              )
            ) : (
              // 크롤링 공고 - 공고문 다운로드
              job.attachment_url ? (
                <a
                  href={job.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <IconFileDownload size={20} />
                  공고문 다운로드
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                >
                  <IconFileDownload size={20} />
                  공고문 준비 중
                </button>
              )
            )}
            {/* 원문링크 - 크롤링 공고에만 표시 */}
            {job.source !== 'user_posted' && job.source_url && (
              <a
                href={job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                <IconExternalLink size={20} />
                원문링크
              </a>
            )}
            {/* 수정하기 - 본인 공고만 */}
            {isOwner && onEditClick && (
              <button
                type="button"
                onClick={() => onEditClick(job)}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-600 font-semibold rounded-lg hover:bg-amber-100 transition-colors"
              >
                <IconEdit size={20} />
                수정하기
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

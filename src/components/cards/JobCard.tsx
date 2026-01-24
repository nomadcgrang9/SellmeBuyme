import { useState, useRef, memo } from 'react';
import { JobPostingCard } from '@/types';
import {
  IconMapPin,
  IconCoin,
  IconClock,
  IconCalendar,
  IconPhone,
  IconExternalLink,
  IconBook,
  IconAlertCircle,
  IconHeart
} from '@tabler/icons-react';
import MapPopup from '@/components/map/MapPopup';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';
import { useAuthStore } from '@/stores/authStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';
import { useToastStore } from '@/stores/toastStore';

interface JobCardProps {
  job: JobPostingCard;
  cardIndex?: number;
  onClick?: () => void;
  onEditClick?: (job: JobPostingCard) => void;
}

function JobCard({ job, cardIndex = 0, onClick, onEditClick }: JobCardProps) {
  const [showMapModal, setShowMapModal] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const expansionRef = useRef<HTMLDivElement>(null);

  // Zustand selector 최적화: 개별 구독
  const user = useAuthStore((s) => s.user);
  const isBookmarked = useBookmarkStore((s) => s.isBookmarked);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const showToast = useToastStore((s) => s.showToast);

  // 소유권 확인: 로그인 사용자 && 사용자 등록 공고 && 본인 공고
  const isOwner = user && job.user_id === user.id && job.source === 'user_posted';
  const bookmarked = isBookmarked(job.id);

  // 북마크 토글 핸들러
  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    console.log('[JobCard] 북마크 토글 시작:', { jobId: job.id, userId: user?.id, bookmarked });
    
    if (!user) {
      console.warn('[JobCard] 로그인 필요');
      showToast('로그인이 필요합니다', 'error');
      return;
    }

    try {
      if (bookmarked) {
        // 북마크 제거
        console.log('[JobCard] 북마크 제거 시작');
        removeFromStore(job.id);
        await removeBookmark(user.id, job.id, 'job');
        console.log('[JobCard] 북마크 제거 완료');
        showToast('북마크를 제거했습니다', 'success');
      } else {
        // 북마크 추가
        console.log('[JobCard] 북마크 추가 시작');
        addToStore(job.id);
        await addBookmark(user.id, job.id, 'job');
        console.log('[JobCard] 북마크 추가 완료');
        showToast('북마크했습니다', 'success');
      }
    } catch (error) {
      console.error('[JobCard] 북마크 토글 실패:', error);
      console.error('[JobCard] 에러 상세:', { name: (error as Error).name, message: (error as Error).message });
      // 실패 시 롤백
      if (bookmarked) {
        addToStore(job.id);
      } else {
        removeFromStore(job.id);
      }
      showToast('북마크 처리에 실패했습니다', 'error');
    }
  };

  // 태그 중복 제거 및 정규화
  const normalizedTags = job.tags.map(tag =>
    tag
      .replace(/학교안전지킴이/g, '학생보호인력')
      .replace(/계약제교사/g, '기간제교사')
      .replace(/시간강사/g, '방과후강사')
  );
  const uniqueTags = Array.from(new Set(normalizedTags)).slice(0, 2);

  const primaryQualification = job.qualifications && job.qualifications.length > 0
    ? job.qualifications[0]
    : undefined;

  const condensedQualification = primaryQualification
    ? primaryQualification
        .replace(/\s*\(\s*예:\s*[^)]*\)/g, '')
        .replace(/(있는\s*자|대상자|지원자)$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    : undefined;

  const hasOverlayContent = Boolean(
    job.application_period ||
    job.work_period ||
    condensedQualification ||
    job.contact ||
    job.source_url ||
    job.form_payload ||
    job.source === 'user_posted'
  );

  return (
    <>
      <article
        ref={cardRef}
        className="group relative"
        onClick={onClick}
      >
        <div
          className="bg-white border border-gray-200 rounded-lg shadow-md animate-slide-up overflow-hidden flex flex-col min-h-[240px] cursor-pointer transition-all duration-300 ease-out group-hover:shadow-none group-hover:rounded-b-none group-hover:border-b-0 group-hover:z-40"
        >
          {/* 상단 컬러 바 */}
          <div className="h-1 bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF]" />

          <div className="flex h-full flex-col p-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#68B2FF]">공고</span>
              <div className="flex items-center gap-2">
                {job.isUrgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                    🔥 긴급
                  </span>
                )}
                {/* 북마크 버튼 */}
                <button
                  onClick={handleBookmarkToggle}
                  className="transition-colors hover:scale-110 transform duration-200"
                  aria-label={bookmarked ? '북마크 제거' : '북마크 추가'}
                  title={bookmarked ? '북마크 제거' : '북마크 추가'}
                >
                  <IconHeart
                    size={20}
                    stroke={1.5}
                    fill={bookmarked ? 'currentColor' : 'none'}
                    className={bookmarked ? 'text-red-500' : 'text-gray-300 hover:text-red-400'}
                  />
                </button>
              </div>
            </div>

            {/* 기관명 */}
            <h3 className="text-lg font-extrabold text-gray-900 mb-1 line-clamp-1" style={{ letterSpacing: '-0.4px' }}>
              {job.organization}
            </h3>

            {/* 제목 */}
            <p className="text-base font-semibold text-gray-700 leading-snug mb-2 line-clamp-1">
              {job.title}
            </p>

            {/* 태그 (중복 제거) */}
            <div className="flex flex-wrap gap-1.5 max-h-[44px] overflow-hidden">
              {uniqueTags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* 기본 정보 */}
            <div className="mt-3 space-y-1.5 text-sm text-gray-700">
              <div className="flex items-center gap-2 truncate">
                <IconMapPin size={16} stroke={1.5} className="text-[#7aa3cc] flex-shrink-0" />
                <span className="font-medium truncate">{formatLocationDisplay(job.location)}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <IconCoin size={16} stroke={1.5} className="text-[#7aa3cc] flex-shrink-0" />
                <span className="font-medium text-gray-900 truncate">{job.compensation}</span>
              </div>
              <div className="flex items-center gap-2 truncate">
                <IconClock size={16} stroke={1.5} className="text-orange-500 flex-shrink-0" />
                <span className="font-medium truncate">
                  {job.deadline}
                </span>
                {job.daysLeft !== undefined && (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
                      job.daysLeft <= 3 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    D-{job.daysLeft}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 데스크톱 호버 확장 영역 */}
        {hasOverlayContent && (
          <div
            ref={expansionRef}
            className="hidden md:block absolute inset-x-0 top-full z-50 pointer-events-none opacity-0 translate-y-1 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:pointer-events-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="rounded-b-lg rounded-t-none border border-gray-200 bg-white shadow-2xl p-4 space-y-3">
              {job.application_period && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <IconCalendar size={18} stroke={1.5} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">접수기간</p>
                    <p className="font-semibold">{job.application_period}</p>
                  </div>
                </div>
              )}

              {job.work_period && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <IconCalendar size={18} stroke={1.5} className="text-[#1D4ED8] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">근무기간</p>
                    <p className="font-semibold">{job.work_period}</p>
                  </div>
                </div>
              )}

              {job.work_time && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <IconClock size={18} stroke={1.5} className="text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">근무시간</p>
                    <p className="font-semibold">{job.work_time}</p>
                  </div>
                </div>
              )}

              {condensedQualification && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <IconBook size={18} stroke={1.5} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">필수 자격</p>
                    <p className="font-semibold text-gray-900 leading-snug line-clamp-2">{condensedQualification}</p>
                  </div>
                </div>
              )}

              {job.contact && (
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <IconPhone size={18} stroke={1.5} className="text-[#2563EB] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-0.5">문의</p>
                    <p className="font-semibold">{job.contact}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1 text-sm font-semibold flex-wrap">
                {job.source_url && (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1 rounded-lg bg-gray-100 text-gray-900 px-3 py-2 hover:bg-gray-200 transition-colors"
                    onClick={(event) => event.stopPropagation()}
                  >
                    원문링크
                  </a>
                )}

                {/* 지도보기 버튼 */}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowMapModal(true);
                  }}
                  className="flex-1 min-w-[80px] inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 px-3 py-2 hover:bg-blue-100 transition-colors"
                >
                  지도보기
                </button>

                {onClick && (
                  <button
                    type="button"
                    onClick={() => onClick()}
                    className="flex-1 min-w-[80px] inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    상세보기
                  </button>
                )}

                {/* 수정하기 버튼 (소유자만) */}
                {isOwner && onEditClick && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditClick(job);
                    }}
                    className="flex-1 min-w-[80px] inline-flex items-center justify-center rounded-lg bg-amber-50 text-amber-600 px-3 py-2 hover:bg-amber-100 transition-colors"
                  >
                    수정하기
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </article>

      {/* 지도 팝업 모달 */}
      <MapPopup
        isOpen={showMapModal}
        onClose={() => setShowMapModal(false)}
        organization={job.organization}
        location={job.location}
        workPeriod={job.work_period}
        workTime={job.work_time}
        applicationPeriod={job.application_period}
        contact={job.contact}
      />
    </>
  );
}

export default memo(JobCard);
import { useState, useRef } from 'react';
import { JobPostingCard } from '@/types';
import {
  IconMapPin,
  IconCoin,
  IconClock,
  IconCalendar,
  IconPhone,
  IconExternalLink,
  IconBook,
  IconAlertCircle
} from '@tabler/icons-react';
import MapPopup from '@/components/map/MapPopup';

interface JobCardProps {
  job: JobPostingCard;
  cardIndex?: number;
  onClick?: () => void;
}

export default function JobCard({ job, cardIndex = 0, onClick }: JobCardProps) {
  const [showMapModal, setShowMapModal] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const expansionRef = useRef<HTMLDivElement>(null);

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
    job.source_url
  );

  return (
    <>
      <article
        ref={cardRef}
        className="group relative"
        onClick={onClick}
      >
        <div
          className="bg-white border border-gray-200 rounded-lg shadow-md animate-slide-up flex flex-col min-h-[240px] cursor-pointer transition-all duration-300 ease-out group-hover:shadow-none group-hover:rounded-b-none group-hover:border-b-0 group-hover:z-40"
          style={{ overflow: 'visible' }}
        >
          {/* 상단 컬러 바 */}
          <div className="h-0.5 bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF]" />

          <div className="flex h-full flex-col p-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#68B2FF]">공고</span>
              {job.isUrgent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  🔥 긴급
                </span>
              )}
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
                <span className="font-medium truncate">{job.location}</span>
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

              <div className="flex gap-2 pt-1 text-sm font-semibold">
                {job.source_url && (
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-gray-100 text-gray-900 px-3 py-2 hover:bg-gray-200 transition-colors"
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
                  className="flex-1 inline-flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 px-3 py-2 hover:bg-blue-100 transition-colors"
                >
                  지도보기
                </button>

                {onClick && (
                  <button
                    type="button"
                    onClick={() => onClick()}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    상세보기
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
        contact={job.contact}
      />
    </>
  );
}
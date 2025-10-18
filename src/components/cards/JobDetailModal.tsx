import { ReactNode } from 'react';
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
  IconBook
} from '@tabler/icons-react';

interface JobDetailModalProps {
  job: JobPostingCard;
  isOpen: boolean;
  onClose: () => void;
}

export default function JobDetailModal({ job, isOpen, onClose }: JobDetailModalProps) {
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
  const location = formatText(job.location);
  const compensation = formatText(job.compensation);
  const workPeriod = formatText(structured?.overview?.work_period || job.work_period);
  const applicationPeriod = formatText(structured?.overview?.application_period || job.application_period);
  const contactNameRaw = formatText(structured?.contact?.name);
  const contactPhoneRaw = formatText(structured?.contact?.phone);
  const fallbackContact = formatText(job.contact);
  let fallbackContactName: string | undefined;
  let fallbackContactPhone: string | undefined;

  if (fallbackContact) {
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

    const cleaned = fallbackContact
      .replace(phoneMatch ? phoneMatch[0] : '', '')
      .split(/\n|\|/)
      .map((segment) => segment.replace(/[\p{Zs}\t]+/gu, ' ').trim())
      .find((segment) => segment.length > 0);

    if (cleaned) {
      fallbackContactName = cleaned;
    }
  }

  const contactName = contactNameRaw ?? fallbackContactName;
  const contactPhone = contactPhoneRaw ?? fallbackContactPhone;
  let contactValue: ReactNode | undefined;

  if (contactName || contactPhone) {
    contactValue = (
      <div className="flex flex-col gap-0.5">
        {contactName && <span>{contactName}</span>}
        {contactPhone && <span className="text-sm text-gray-600">{contactPhone}</span>}
      </div>
    );
  } else if (fallbackContact) {
    contactValue = fallbackContact;
  }

  const stats: {
    icon: typeof IconMapPin;
    accent: string;
    label: string;
    value: ReactNode;
  }[] = [];

  if (location) {
    stats.push({ icon: IconMapPin, accent: 'text-[#7aa3cc]', label: '위치', value: location });
  }
  if (compensation) {
    stats.push({ icon: IconCoin, accent: 'text-[#7db8a3]', label: '급여', value: compensation });
  }
  if (deadline) {
    stats.push({ icon: IconClock, accent: 'text-orange-500', label: '마감일', value: deadline });
  }
  if (workPeriod) {
    stats.push({ icon: IconCalendar, accent: 'text-blue-500', label: '근무기간', value: workPeriod });
  }
  if (applicationPeriod) {
    stats.push({ icon: IconCalendar, accent: 'text-indigo-500', label: '접수기간', value: applicationPeriod });
  }
  if (contactValue) {
    stats.push({ icon: IconPhone, accent: 'text-blue-600', label: '문의', value: contactValue });
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
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <IconX size={24} />
          </button>
          
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
        <div className="p-5 space-y-4">
          {/* 상단 요약 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.map(({ icon: StatIcon, accent, label, value }) => (
              <div key={label} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <StatIcon size={20} className={`${accent} flex-shrink-0 mt-0.5`} />
                <div>
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className="font-semibold text-gray-900 leading-tight break-words">{value}</div>
                </div>
              </div>
            ))}
            {workTime && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <IconClock size={20} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 mb-1">근무시간</div>
                  <div className="font-semibold text-gray-900 break-words">{workTime}</div>
                </div>
              </div>
            )}
          </div>

          {/* 자격 요건 */}
          {qualifications.length > 0 && (
            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <IconBook size={20} />
                자격 요건
              </h3>
              <ul className="space-y-1.5 text-sm text-gray-700">
                {qualifications.map((qualification, index) => (
                  <li key={index} className="flex gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{qualification}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {job.attachment_url ? (
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
            )}
            {job.source_url && (
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
          </div>

        </div>
      </div>
    </div>
  );
}

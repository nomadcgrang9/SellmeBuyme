import { ReactNode } from 'react';
import { ExperienceCard as ExperienceCardType } from '@/types';
import {
  IconX,
  IconMapPin,
  IconSchool,
  IconUsers,
  IconPhone,
  IconAt,
  IconEdit
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';

type StatItem = {
  icon: typeof IconMapPin;
  accent: string;
  label: string;
  value: ReactNode;
};

interface ExperienceDetailModalProps {
  experience: ExperienceCardType;
  isOpen: boolean;
  onClose: () => void;
  onEditClick?: (experience: ExperienceCardType) => void;
  onDeleteClick?: (experience: ExperienceCardType) => void;
}

export default function ExperienceDetailModal({
  experience,
  isOpen,
  onClose,
  onEditClick,
  onDeleteClick
}: ExperienceDetailModalProps) {
  const { user } = useAuthStore((state) => ({ user: state.user }));

  // 소유권 확인
  const isOwner = Boolean(user && experience.user_id && user.id === experience.user_id);

  if (!isOpen) return null;

  const buildStat = (
    icon: typeof IconMapPin,
    accent: string,
    label: string,
    value: ReactNode
  ): StatItem => ({ icon, accent, label, value });

  const primaryStats: StatItem[] = [];

  // 지역
  if (experience.locationSummary) {
    primaryStats.push(buildStat(IconMapPin, 'text-gray-500', '지역', experience.locationSummary));
  }

  // 대상 학교급
  if (experience.targetSchoolLevels.length > 0) {
    primaryStats.push(
      buildStat(IconSchool, 'text-gray-500', '대상', experience.targetSchoolLevels.join(', '))
    );
  }

  // 운영 방식
  if (experience.operationTypes.length > 0) {
    primaryStats.push(
      buildStat(IconUsers, 'text-gray-500', '운영방식', experience.operationTypes.join(', '))
    );
  }

  // 수용 인원
  if (experience.capacity) {
    primaryStats.push(buildStat(IconUsers, 'text-gray-500', '수용인원', experience.capacity));
  }

  // 연락처 정보
  const contactItems = [
    { label: '전화번호', value: experience.contactPhone, icon: IconPhone },
    { label: '이메일', value: experience.contactEmail, icon: IconAt }
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 - 노란 그라디언트 */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] p-4 text-gray-900">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <IconX size={24} />
          </button>

          <div className="pr-10 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">체험</span>
            </div>
            <h2 className="text-xl font-extrabold leading-tight md:text-2xl">
              {experience.programTitle}
            </h2>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-3 sm:p-5 sm:space-y-4">
          {/* 카테고리 태그 */}
          {experience.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {experience.categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium"
                >
                  {cat}
                </span>
              ))}
            </div>
          )}

          {/* 상단 요약 카드 */}
          {primaryStats.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
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

          {/* 프로그램 소개 */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">프로그램 소개</h3>
            <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
              {experience.introduction}
            </p>
          </div>

          {/* 연락처 */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">연락처</h3>
            <div className="space-y-2">
              {contactItems.map(({ label, value, icon: ContactIcon }) => (
                <div key={label} className="flex items-center gap-2">
                  <ContactIcon size={18} className="text-gray-500 flex-shrink-0" />
                  <div className="text-sm">
                    <span className="text-gray-500">{label}: </span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="flex justify-between gap-2 pt-2">
            {isOwner && (
              <div className="flex gap-2">
                {onDeleteClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteClick(experience);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-semibold"
                  >
                    <span>삭제하기</span>
                  </button>
                )}
                {onEditClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(experience);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    <IconEdit size={18} />
                    <span>수정하기</span>
                  </button>
                )}
              </div>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] text-gray-900 hover:from-[#f4c96b] hover:to-[#ebb850] transition-colors font-semibold"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

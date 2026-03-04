import { ReactNode, useState, useCallback } from 'react';
import { ExperienceCard as ExperienceCardType } from '@/types';
import {
  IconX,
  IconMapPin,
  IconSchool,
  IconUsers,
  IconPhone,
  IconAt,
  IconEdit,
  IconStar
} from '@tabler/icons-react';
import { useAuthStore } from '@/stores/authStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useToastStore } from '@/stores/toastStore';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';

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
  const isBookmarkedFn = useBookmarkStore((s) => s.isBookmarked);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const { showToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const bookmarked = isBookmarkedFn(experience.id);

  // 소유권 확인
  const isOwner = Boolean(user && experience.user_id && user.id === experience.user_id);

  const handleBookmarkToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { showToast('로그인이 필요합니다', 'error'); return; }
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (bookmarked) {
        removeFromStore(experience.id);
        await removeBookmark(user.id, experience.id, 'experience');
        showToast('즐겨찾기에서 제거했습니다', 'info');
      } else {
        addToStore(experience.id);
        await addBookmark(user.id, experience.id, 'experience');
        showToast('즐겨찾기에 추가했습니다', 'success');
      }
    } catch {
      if (bookmarked) addToStore(experience.id); else removeFromStore(experience.id);
      showToast('오류가 발생했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, bookmarked, isLoading, experience.id, addToStore, removeFromStore, showToast]);

  if (!isOpen) return null;

  const buildStat = (icon: typeof IconMapPin, accent: string, label: string, value: ReactNode): StatItem =>
    ({ icon, accent, label, value });

  const primaryStats: StatItem[] = [];
  if (experience.locationSummary) primaryStats.push(buildStat(IconMapPin, 'text-gray-500', '지역', experience.locationSummary));
  if (experience.targetSchoolLevels.length > 0) primaryStats.push(buildStat(IconSchool, 'text-gray-500', '대상', experience.targetSchoolLevels.join(', ')));
  if (experience.operationTypes.length > 0) primaryStats.push(buildStat(IconUsers, 'text-gray-500', '운영방식', experience.operationTypes.join(', ')));
  if (experience.capacity) primaryStats.push(buildStat(IconUsers, 'text-gray-500', '수용인원', experience.capacity));

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
          <div className="absolute top-3 right-3 flex items-center gap-1">
            {/* 즐겨찾기 별 버튼 */}
            <button
              onClick={handleBookmarkToggle}
              disabled={isLoading}
              title={bookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              className={`p-1.5 rounded-full transition-all duration-200 ${bookmarked ? 'text-amber-600 hover:bg-black/10' : 'text-gray-600/60 hover:text-amber-600 hover:bg-black/10'
                } disabled:opacity-50`}
            >
              <IconStar
                size={20}
                fill={bookmarked ? 'currentColor' : 'none'}
                stroke={bookmarked ? 'none' : 'currentColor'}
                strokeWidth={1.5}
              />
            </button>
            {/* 수정 버튼 - 본인만 */}
            {user && experience.user_id === user.id && onEditClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditClick(experience); }}
                className="p-1.5 text-gray-600/60 hover:text-blue-600 hover:bg-black/10 rounded-full transition-colors"
                title="수정"
              >
                <IconEdit size={20} stroke={1.5} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <IconX size={24} />
            </button>
          </div>

          <div className="pr-20 space-y-1">
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
                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium">
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
                    onClick={(e) => { e.stopPropagation(); onDeleteClick(experience); }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-semibold"
                  >
                    <span>삭제하기</span>
                  </button>
                )}
                {onEditClick && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEditClick(experience); }}
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

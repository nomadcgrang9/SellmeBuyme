import { useState, useCallback } from 'react';
import { TalentCard } from '@/types';
import { IconX, IconMapPin, IconBriefcase, IconShieldCheck, IconPhone, IconAt, IconId, IconStar, IconPencil } from '@tabler/icons-react';
import { formatLocationDisplay } from '@/lib/constants/regionHierarchy';
import { useAuthStore } from '@/stores/authStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useToastStore } from '@/stores/toastStore';
import { addBookmark, removeBookmark } from '@/lib/supabase/queries';

interface TalentDetailModalProps {
  talent: TalentCard;
  isOpen: boolean;
  onClose: () => void;
  onEditClick?: (talent: TalentCard) => void;
}

export default function TalentDetailModal({ talent, isOpen, onClose, onEditClick }: TalentDetailModalProps) {
  const { user } = useAuthStore();
  const isBookmarkedFn = useBookmarkStore((s) => s.isBookmarked);
  const addToStore = useBookmarkStore((s) => s.addBookmark);
  const removeFromStore = useBookmarkStore((s) => s.removeBookmark);
  const { showToast } = useToastStore();
  const [isLoading, setIsLoading] = useState(false);
  const bookmarked = isBookmarkedFn(talent.id);

  const handleBookmarkToggle = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) { showToast('로그인이 필요합니다', 'error'); return; }
    if (isLoading) return;
    setIsLoading(true);
    try {
      if (bookmarked) {
        removeFromStore(talent.id);
        await removeBookmark(user.id, talent.id, 'talent');
        showToast('즐겨찾기에서 제거했습니다', 'info');
      } else {
        addToStore(talent.id);
        await addBookmark(user.id, talent.id, 'talent');
        showToast('즐겨찾기에 추가했습니다', 'success');
      }
    } catch {
      if (bookmarked) addToStore(talent.id); else removeFromStore(talent.id);
      showToast('오류가 발생했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user, bookmarked, isLoading, talent.id, addToStore, removeFromStore, showToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#c5e3d8] text-[#0F172A] text-xs font-bold rounded-full">
              {talent.isVerified && <IconShieldCheck size={14} stroke={1.5} />} 인력
            </span>
            <h2 className="text-lg font-extrabold text-gray-900">{talent.name}</h2>
          </div>
          <div className="flex items-center gap-1">
            {/* 즐겨찾기 별 버튼 */}
            <button
              onClick={handleBookmarkToggle}
              disabled={isLoading}
              title={bookmarked ? '즐겨찾기 해제' : '즐겨찾기 추가'}
              className={`p-1.5 rounded-full transition-all duration-200 ${bookmarked ? 'text-amber-400 hover:bg-amber-50' : 'text-gray-300 hover:text-amber-400 hover:bg-amber-50'
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
            {user && talent.user_id === user.id && onEditClick && (
              <button
                onClick={(e) => { e.stopPropagation(); onEditClick(talent); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                title="수정"
              >
                <IconPencil size={18} stroke={1.5} />
              </button>
            )}
            <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded transition-colors">
              <IconX size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div className="text-base font-semibold text-gray-800">{talent.specialty}</div>

          {talent.tags && talent.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {talent.tags.slice(0, 8).map((tag, i) => (
                <span key={i} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-sm font-medium text-gray-700">{tag}</span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-gray-700">
              <IconMapPin size={18} stroke={1.5} className="text-emerald-600" />
              <span className="font-medium">{formatLocationDisplay(talent.location)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700">
              <IconBriefcase size={18} stroke={1.5} className="text-emerald-600" />
              <span className="font-medium">{talent.experience}</span>
            </div>
            {talent.license && (
              <div className="flex items-center gap-2 text-gray-700">
                <IconId size={18} stroke={1.5} className="text-emerald-600" />
                <span className="font-medium">{talent.license}</span>
              </div>
            )}
            {talent.phone && user && (
              <div className="flex items-center gap-2 text-gray-700">
                <IconPhone size={18} stroke={1.5} className="text-emerald-600" />
                <span className="font-medium">{talent.phone}</span>
              </div>
            )}
            {talent.email && (
              <div className="flex items-center gap-2 text-gray-700">
                <IconAt size={18} stroke={1.5} className="text-emerald-600" />
                <span className="font-medium">{talent.email}</span>
              </div>
            )}
          </div>

          {talent.introduction && (
            <div className="mt-2">
              <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">자기소개</div>
              <div className="whitespace-pre-wrap leading-relaxed text-gray-800">{talent.introduction}</div>
            </div>
          )}

          {onEditClick && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => onEditClick(talent)}
                className="px-3 py-1.5 text-sm font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                수정하기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

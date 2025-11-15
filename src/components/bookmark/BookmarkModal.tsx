import { useEffect, useState } from 'react';
import { IconX, IconHeartFilled } from '@tabler/icons-react';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import { fetchBookmarkedCards } from '../../lib/supabase/queries';
import { Card } from '../../types';
import CardGrid from '../cards/CardGrid';
import { useAuthStore } from '../../stores/authStore';

type ExperienceCardType = Extract<Card, { type: 'experience' }>;

interface BookmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCardClick?: (card: Card) => void;
  onJobEditClick?: (card: Card) => void;
  onTalentEditClick?: (card: Card) => void;
  onExperienceEditClick?: (card: ExperienceCardType) => void;
  onExperienceDeleteClick?: (card: ExperienceCardType) => void;
  onOpenChatModal?: (roomId: string) => void;
}

export default function BookmarkModal({
  isOpen,
  onClose,
  onCardClick,
  onJobEditClick,
  onTalentEditClick,
  onExperienceEditClick,
  onExperienceDeleteClick,
  onOpenChatModal
}: BookmarkModalProps) {
  const { user } = useAuthStore();
  const bookmarkCount = useBookmarkStore((state) => state.bookmarkCount);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadBookmarkedCards();
    }
  }, [isOpen, user]);

  const loadBookmarkedCards = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const bookmarkedCards = await fetchBookmarkedCards(user.id);
      setCards(bookmarkedCards);
    } catch (error) {
      console.error('북마크 카드 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF]">
              <IconHeartFilled size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">내 북마크</h2>
              <p className="text-sm text-gray-500">총 {bookmarkCount}개</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <IconX size={24} className="text-gray-600" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#68B2FF] mx-auto mb-4"></div>
                <p className="text-gray-500">로딩 중...</p>
              </div>
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <IconHeartFilled size={32} className="text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-2">북마크가 비어있습니다</p>
              <p className="text-sm text-gray-500">관심있는 카드를 북마크해보세요</p>
            </div>
          ) : (
            <CardGrid
              cards={cards}
              onCardClick={onCardClick}
              onJobEditClick={onJobEditClick}
              onTalentEditClick={onTalentEditClick}
              onExperienceEditClick={onExperienceEditClick}
              onExperienceDeleteClick={onExperienceDeleteClick}
              onOpenChatModal={onOpenChatModal}
            />
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { IconHeartFilled, IconArrowLeft } from '@tabler/icons-react';
import { useBookmarkStore } from '../stores/bookmarkStore';
import { fetchBookmarkedCards } from '../lib/supabase/queries';
import { Card } from '../types';
import CardGrid from '../components/cards/CardGrid';
import { useAuthStore } from '../stores/authStore';

type ExperienceCardType = Extract<Card, { type: 'experience' }>;

interface BookmarkPageProps {
  onBack: () => void;
  onCardClick?: (card: Card) => void;
  onJobEditClick?: (card: Card) => void;
  onTalentEditClick?: (card: Card) => void;
  onExperienceEditClick?: (card: ExperienceCardType) => void;
  onExperienceDeleteClick?: (card: ExperienceCardType) => void;
  onOpenChatModal?: (roomId: string) => void;
}

export default function BookmarkPage({
  onBack,
  onCardClick,
  onJobEditClick,
  onTalentEditClick,
  onExperienceEditClick,
  onExperienceDeleteClick,
  onOpenChatModal
}: BookmarkPageProps) {
  const { user } = useAuthStore();
  const bookmarkCount = useBookmarkStore((state) => state.bookmarkCount);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadBookmarkedCards();
    }
  }, [user]);

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

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 md:relative md:z-auto overflow-y-auto">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="뒤로가기"
          >
            <IconArrowLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF]">
              <IconHeartFilled size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">내 북마크</h1>
            </div>
          </div>
          <div className="w-10" /> {/* 스페이서 */}
        </div>
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-500">총 {bookmarkCount}개</p>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="p-4">
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
  );
}

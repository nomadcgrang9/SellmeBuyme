import { useState } from 'react';
import { IconPlus, IconLoader2 } from '@tabler/icons-react';
import { usePromoCardManager } from '@/hooks/usePromoCardManager';
import PromoCardListItem from './PromoCardListItem';
import PromoCardEditModal from './PromoCardEditModal';
import type { PromoCardSettings } from '@/types';

interface PromoCardListManagerProps {
  userId: string | null;
}

export default function PromoCardListManager({ userId }: PromoCardListManagerProps) {
  const {
    cards,
    loading,
    error,
    collectionId,
    fetchCards,
    createCard,
    deleteCard,
    moveUp,
    moveDown
  } = usePromoCardManager();

  const [editingCard, setEditingCard] = useState<PromoCardSettings | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (card: PromoCardSettings) => {
    setEditingCard(card);
    setIsModalOpen(true);
  };

  const handleCreate = async () => {
    // 새 카드 생성 (기본값으로)
    setEditingCard(null);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCard(null);
  };

  const handleModalSave = async () => {
    await fetchCards();
    handleModalClose();
  };

  const handleDelete = async (cardId: string) => {
    await deleteCard(cardId);
  };

  if (loading && cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-slate-500">
          <IconLoader2 size={20} className="animate-spin" />
          <span>프로모 카드를 불러오는 중...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={fetchCards}
          className="mt-3 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!collectionId) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">활성 컬렉션을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">프로모 카드 관리</h3>
          <p className="text-sm text-slate-500 mt-1">
            메인 페이지 추천 섹션에 표시될 프로모 카드를 관리합니다.
          </p>
        </div>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 transition-colors"
        >
          <IconPlus size={18} />
          새 카드 추가
        </button>
      </div>

      {/* 카드 목록 */}
      {cards.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-300 rounded-lg">
          <p className="text-slate-500">등록된 프로모 카드가 없습니다.</p>
          <button
            onClick={handleCreate}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            첫 번째 카드 만들기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card, index) => (
            <PromoCardListItem
              key={card.cardId}
              card={card}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onMoveUp={moveUp}
              onMoveDown={moveDown}
              isFirst={index === 0}
              isLast={index === cards.length - 1}
            />
          ))}
        </div>
      )}

      {/* 편집 모달 */}
      <PromoCardEditModal
        key={editingCard?.cardId || 'new'}
        card={editingCard}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSave={handleModalSave}
        userId={userId}
      />
    </div>
  );
}

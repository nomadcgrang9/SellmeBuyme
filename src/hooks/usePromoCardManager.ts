import { useState, useCallback, useEffect } from 'react';
import { fetchPromoCards, createPromoCard, deletePromoCard, swapCardOrder } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import type { PromoCardSettings } from '@/types';

interface UsePromoCardManagerResult {
  cards: PromoCardSettings[];
  loading: boolean;
  error: string | null;
  collectionId: string | null;
  fetchCards: () => Promise<void>;
  createCard: (data?: Partial<PromoCardSettings>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  moveUp: (cardId: string) => Promise<void>;
  moveDown: (cardId: string) => Promise<void>;
}

export function usePromoCardManager(): UsePromoCardManagerResult {
  const [cards, setCards] = useState<PromoCardSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectionId, setCollectionId] = useState<string | null>(null);

  // 카드 목록 조회
  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 활성 컬렉션 조회
      const { data: collections, error: collError } = await supabase
        .from('promo_card_collections')
        .select('id, is_active')
        .eq('is_active', true)
        .limit(1);

      if (collError || !collections || collections.length === 0) {
        throw new Error('활성 컬렉션을 찾을 수 없습니다.');
      }

      const activeCollectionId = collections[0].id;
      setCollectionId(activeCollectionId);

      // 카드 목록 조회
      const data = await fetchPromoCards({ onlyActive: false });
      setCards(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '카드 목록을 불러오는 중 오류가 발생했습니다.';
      setError(message);
      console.error('카드 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 새 카드 생성
  const createCard = useCallback(async (data?: Partial<PromoCardSettings>) => {
    if (!collectionId) {
      setError('컬렉션 ID가 없습니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createPromoCard(collectionId, data ?? {});
      await fetchCards();
    } catch (err) {
      const message = err instanceof Error ? err.message : '카드 생성 중 오류가 발생했습니다.';
      setError(message);
      console.error('카드 생성 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [collectionId, fetchCards]);

  // 카드 삭제
  const deleteCard = useCallback(async (cardId: string) => {
    setLoading(true);
    setError(null);

    try {
      await deletePromoCard(cardId);
      await fetchCards();
    } catch (err) {
      const message = err instanceof Error ? err.message : '카드 삭제 중 오류가 발생했습니다.';
      setError(message);
      console.error('카드 삭제 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchCards]);

  // 카드 위로 이동
  const moveUp = useCallback(async (cardId: string) => {
    const currentIndex = cards.findIndex(card => card.cardId === cardId);

    if (currentIndex <= 0) {
      return; // 첫 번째 카드이거나 찾을 수 없음
    }

    const currentCard = cards[currentIndex];
    const previousCard = cards[currentIndex - 1];

    if (!currentCard.cardId || !previousCard.cardId) {
      return; // cardId가 없으면 중단
    }

    setLoading(true);
    setError(null);

    try {
      await swapCardOrder(currentCard.cardId, previousCard.cardId);
      await fetchCards();
    } catch (err) {
      const message = err instanceof Error ? err.message : '카드 순서 변경 중 오류가 발생했습니다.';
      setError(message);
      console.error('카드 순서 변경 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [cards, fetchCards]);

  // 카드 아래로 이동
  const moveDown = useCallback(async (cardId: string) => {
    const currentIndex = cards.findIndex(card => card.cardId === cardId);

    if (currentIndex < 0 || currentIndex >= cards.length - 1) {
      return; // 마지막 카드이거나 찾을 수 없음
    }

    const currentCard = cards[currentIndex];
    const nextCard = cards[currentIndex + 1];

    if (!currentCard.cardId || !nextCard.cardId) {
      return; // cardId가 없으면 중단
    }

    setLoading(true);
    setError(null);

    try {
      await swapCardOrder(currentCard.cardId, nextCard.cardId);
      await fetchCards();
    } catch (err) {
      const message = err instanceof Error ? err.message : '카드 순서 변경 중 오류가 발생했습니다.';
      setError(message);
      console.error('카드 순서 변경 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [cards, fetchCards]);

  // 초기 로드
  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  return {
    cards,
    loading,
    error,
    collectionId,
    fetchCards,
    createCard,
    deleteCard,
    moveUp,
    moveDown
  };
}

import { memo } from 'react';
import type { Card } from '@/types';
import JobCard from './JobCard';
import TalentCard from './TalentCard';
import ExperienceCard from './ExperienceCard';
import EmptyState, { SearchEmptyState, FilterEmptyState } from '@/components/common/EmptyState';
import CardSkeleton from '@/components/common/CardSkeleton';

type ExperienceCardType = Extract<Card, { type: 'experience' }>;

interface CardGridProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
  onJobEditClick?: (card: Card) => void;
  onTalentEditClick?: (card: Card) => void;
  onExperienceEditClick?: (card: ExperienceCardType) => void;
  onExperienceDeleteClick?: (card: ExperienceCardType) => void;
  highlightTalentId?: string | null;
  onOpenChatModal?: (roomId: string) => void;
  /** 로딩 상태 */
  loading?: boolean;
  /** 검색어 (빈 상태 표시용) */
  searchQuery?: string;
  /** 필터 초기화 핸들러 */
  onResetFilters?: () => void;
  /** 검색어 클릭 핸들러 */
  onSuggestionClick?: (suggestion: string) => void;
  /** 뷰 타입 */
  viewType?: 'job' | 'talent' | 'experience' | 'all';
}

function CardGrid({
  cards,
  onCardClick,
  onJobEditClick,
  onTalentEditClick,
  onExperienceEditClick,
  onExperienceDeleteClick,
  highlightTalentId,
  onOpenChatModal,
  loading = false,
  searchQuery,
  onResetFilters,
  onSuggestionClick,
  viewType = 'job',
}: CardGridProps) {
  // 로딩 중일 때 스켈레톤 표시
  if (loading) {
    return (
      <CardSkeleton
        count={6}
        type={viewType === 'all' ? 'job' : viewType}
      />
    );
  }

  // 카드가 없을 때 빈 상태 표시
  if (cards.length === 0) {
    // 검색어가 있는 경우
    if (searchQuery) {
      return (
        <SearchEmptyState
          query={searchQuery}
          onReset={onResetFilters}
          onSuggestionClick={onSuggestionClick}
        />
      );
    }

    // 필터만 적용된 경우
    if (onResetFilters) {
      return <FilterEmptyState onReset={onResetFilters} />;
    }

    // 기본 빈 상태
    const viewTypeLabels = {
      job: '학교공고',
      talent: '구직교사',
      experience: '체험 프로그램',
      all: '공고',
    };

    return (
      <EmptyState
        title={`표시할 ${viewTypeLabels[viewType]}가 없어요`}
        description="잠시 후 다시 확인해 주세요"
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      {cards.map((card, index) => (
        <div key={card.id}>
          {card.type === 'job' ? (
            <JobCard
              job={card}
              cardIndex={index}
              onClick={() => onCardClick?.(card)}
              onEditClick={onJobEditClick}
            />
          ) : card.type === 'talent' ? (
            <TalentCard
              talent={card}
              onEditClick={onTalentEditClick}
              isHighlight={highlightTalentId === card.id}
              onOpenChatModal={onOpenChatModal}
            />
          ) : (
            <ExperienceCard
              card={card}
              onCardClick={() => onCardClick?.(card)}
              onEditClick={onExperienceEditClick}
              onDeleteClick={onExperienceDeleteClick}
              onOpenChatModal={onOpenChatModal}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default memo(CardGrid);

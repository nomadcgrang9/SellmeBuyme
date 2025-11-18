import type { Card } from '@/types';
import JobCard from './JobCard';
import TalentCard from './TalentCard';
import ExperienceCard from './ExperienceCard';

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
}

export default function CardGrid({ cards, onCardClick, onJobEditClick, onTalentEditClick, onExperienceEditClick, onExperienceDeleteClick, highlightTalentId, onOpenChatModal }: CardGridProps) {
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

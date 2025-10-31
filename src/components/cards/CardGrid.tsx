import { Card } from '@/types';
import JobCard from './JobCard';
import TalentCard from './TalentCard';

interface CardGridProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
  onJobEditClick?: (card: Card) => void;
  onTalentEditClick?: (card: Card) => void;
}

export default function CardGrid({ cards, onCardClick, onJobEditClick, onTalentEditClick }: CardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <TalentCard talent={card} onEditClick={onTalentEditClick} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

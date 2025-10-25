import { Card } from '@/types';
import JobCard from './JobCard';
import TalentCard from './TalentCard';

interface CardGridProps {
  cards: Card[];
  onCardClick?: (card: Card) => void;
}

export default function CardGrid({ cards, onCardClick }: CardGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card) => (
        <div key={card.id}>
          {card.type === 'job' ? (
            <JobCard
              job={card}
              onClick={() => onCardClick?.(card)}
            />
          ) : (
            <TalentCard talent={card} />
          )}
        </div>
      ))}
    </div>
  );
}

import { Card, JobPostingCard } from '@/types';
import { useState } from 'react';
import JobCard from './JobCard';
import TalentCard from './TalentCard';
import JobDetailModal from './JobDetailModal';

interface CardGridProps {
  cards: Card[];
}

export default function CardGrid({ cards }: CardGridProps) {
  const [selectedJob, setSelectedJob] = useState<JobPostingCard | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div key={card.id}>
            {card.type === 'job' ? (
              <JobCard 
                job={card} 
                onClick={() => setSelectedJob(card)}
              />
            ) : (
              <TalentCard talent={card} />
            )}
          </div>
        ))}
      </div>

      {/* 모달 */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </>
  );
}

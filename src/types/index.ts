export interface JobPostingCard {
  id: string;
  type: 'job';
  isUrgent?: boolean;
  organization: string;
  title: string;
  tags: string[];
  location: string;
  compensation: string;
  deadline: string;
  daysLeft?: number;
}

export interface TalentCard {
  id: string;
  type: 'talent';
  isVerified: boolean;
  name: string;
  specialty: string;
  tags: string[];
  location: string;
  experience: string;
  rating: number;
  reviewCount: number;
}

export type Card = JobPostingCard | TalentCard;

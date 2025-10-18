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
  work_period?: string;
  application_period?: string;
  work_time?: string;
  contact?: string;
  detail_content?: string;
  attachment_url?: string;
  source_url?: string;
  qualifications?: string[];
  structured_content?: StructuredJobContent | null;
}

export interface StructuredJobContent {
  overview?: {
    organization?: string | null;
    field?: string | null;
    headcount?: string | null;
    work_period?: string | null;
    application_period?: string | null;
    duty_summary?: string | null;
  } | null;
  qualifications?: string[] | null;
  preferred?: string[] | null;
  application?: {
    method?: string | null;
    documents?: string[] | null;
  } | null;
  contact?: {
    department?: string | null;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  notes?: string[] | null;
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

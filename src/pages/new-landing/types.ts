export interface Job {
  id: string;
  schoolName: string;
  title: string;
  location: string;
  dDay: number; // e.g., 5 means D-5
  imageUrl: string;
  subjects: string[];
  schoolLevel: 'Elementary' | 'Middle' | 'High' | 'Special';
  jobType: 'FullTime' | 'Contract' | 'PartTime' | 'AfterSchool';
  isUrgent?: boolean;
  sourceUrl?: string;
}

export interface FilterState {
  location: string;
  schoolLevel: string;
  jobType: string;
  subject: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  theme: 'neon-blue' | 'midnight-purple' | 'sunset-vibes';
  backgroundImage?: string;
}
import { Card, JobPostingCard, TalentCard } from '@/types';

export const aiRecommendations: Card[] = [
  {
    id: 'rec-1',
    type: 'job',
    isUrgent: true,
    organization: '수원 OO초등학교',
    title: '대체교사 긴급 모집',
    tags: ['초등전학년'],
    location: '수원',
    compensation: '시급 35,000원',
    deadline: '~ 10.17',
    daysLeft: 1,
  },
  {
    id: 'rec-2',
    type: 'job',
    organization: '용인 XX중학교',
    title: '코딩 방과후 강사',
    tags: ['파이썬', 'AI'],
    location: '용인',
    compensation: '시급 30,000원',
    deadline: '~ 10.25',
  },
  {
    id: 'rec-3',
    type: 'talent',
    isVerified: true,
    name: '김OO 강사',
    specialty: '초등 과학실험 전문',
    tags: ['STEAM', '영재교육'],
    location: '수원/용인/화성',
    experience: '경력 8년',
    rating: 4.9,
    reviewCount: 23,
  },
  {
    id: 'rec-4',
    type: 'job',
    organization: '성남 △△초등학교',
    title: '영어 원어민 보조',
    tags: ['회화', 'TEE'],
    location: '성남',
    compensation: '시급 40,000원',
    deadline: '~ 11.05',
  },
];


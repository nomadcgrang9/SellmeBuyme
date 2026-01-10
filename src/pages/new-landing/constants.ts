import { Job, Banner } from './types';

export const LOCATIONS = ['서울', '세종', '인천', '대전', '광주', '대구', '울산', '부산', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
export const SCHOOL_LEVELS = ['유치원', '초등학교', '중학교', '고등학교', '특수학교', '기타'];
export const JOB_TYPES = ['기간제', '교사', '시간강사', '강사', '기타'];
export const SUBJECTS = ['국어', '영어', '수학', '사회', '과학', '체육', '음악', '미술', '정보', '보건', '사서', '상담'];

export const MOCK_BANNERS: Banner[] = [
  {
    id: '1',
    title: '전국 모든 학교 공고,\n이제 한눈에 확인하세요.',
    subtitle: '여기저기 흩어진 채용 정보를 쌤찾기z가 한 곳에 모았습니다.',
    theme: 'neon-blue',
    backgroundImage: '/hero-bg-1.jpg.jpg'
  },
  {
    id: '2',
    title: '나에게 딱 맞는 학교 공고,\n놓치지 말고 실시간으로',
    subtitle: '맞춤형 필터로 당신의 위치와 조건에 최적화된 공고를 추천합니다.',
    theme: 'midnight-purple',
    backgroundImage: '/hero-bg-2..jpg'
  }
];

export const MOCK_JOBS: Job[] = [
  {
    id: 'j1',
    schoolName: '서울과학고등학교',
    title: '2025학년도 수학과 기간제 교원 채용',
    location: '서울 종로구',
    dDay: 5,
    imageUrl: 'https://picsum.photos/400/300?random=10',
    subjects: ['수학', '담임'],
    schoolLevel: 'High',
    jobType: 'Contract',
    isUrgent: true,
    sourceUrl: 'https://www.goe.go.kr'
  },
  {
    id: 'j2',
    schoolName: '경기초등학교',
    title: '방과후 영어 강사 모집 (오후반)',
    location: '서울 서대문구',
    dDay: 2,
    imageUrl: 'https://picsum.photos/400/300?random=11',
    subjects: ['영어', '방과후'],
    schoolLevel: 'Elementary',
    jobType: 'AfterSchool',
    sourceUrl: 'https://www.sen.go.kr'
  },
  {
    id: 'j3',
    schoolName: '부산국제중학교',
    title: '국어과 시간강사 채용 공고',
    location: '부산 부산진구',
    dDay: 14,
    imageUrl: 'https://picsum.photos/400/300?random=12',
    subjects: ['국어', '문학'],
    schoolLevel: 'Middle',
    jobType: 'PartTime',
    sourceUrl: 'https://www.pen.go.kr'
  },
  {
    id: 'j4',
    schoolName: '세종예술고등학교',
    title: '음악(피아노) 전공 실기 강사',
    location: '세종시',
    dDay: 7,
    imageUrl: 'https://picsum.photos/400/300?random=13',
    subjects: ['음악', '예술'],
    schoolLevel: 'High',
    jobType: 'PartTime',
    sourceUrl: 'https://www.sje.go.kr'
  },
  {
    id: 'j5',
    schoolName: '한민고등학교',
    title: '정보/컴퓨터 정교사 채용',
    location: '경기 파주시',
    dDay: 20,
    imageUrl: 'https://picsum.photos/400/300?random=14',
    subjects: ['정보', '컴퓨터'],
    schoolLevel: 'High',
    jobType: 'FullTime',
    isUrgent: true,
    sourceUrl: 'https://www.goe.go.kr'
  },
  {
    id: 'j6',
    schoolName: '대구남산고등학교',
    title: '체육과 기간제 교사 모집',
    location: '대구 수성구',
    dDay: 3,
    imageUrl: 'https://picsum.photos/400/300?random=15',
    subjects: ['체육'],
    schoolLevel: 'High',
    jobType: 'Contract',
    sourceUrl: 'https://www.dge.go.kr'
  },
  {
    id: 'j7',
    schoolName: '광주수피아여자중학교',
    title: '보건 교사 (산가 대체)',
    location: '광주 남구',
    dDay: 1,
    imageUrl: 'https://picsum.photos/400/300?random=16',
    subjects: ['보건'],
    schoolLevel: 'Middle',
    jobType: 'Contract',
    sourceUrl: 'https://www.gen.go.kr'
  },
  {
    id: 'j8',
    schoolName: '제주국제학교',
    title: 'Chemistry Teacher (Full-time)',
    location: '제주 서귀포시',
    dDay: 30,
    imageUrl: 'https://picsum.photos/400/300?random=17',
    subjects: ['과학', '화학', '영어'],
    schoolLevel: 'High',
    jobType: 'FullTime',
    sourceUrl: 'https://www.jje.go.kr'
  }
];
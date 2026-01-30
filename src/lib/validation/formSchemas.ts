import { z } from 'zod';

// ========================================
// 공고 등록 폼 스키마
// ========================================

export const jobPostingSchema = z.object({
  // 기본 정보
  organization: z.string().min(1, '학교/기관명을 입력해주세요'),
  title: z.string().min(1, '공고 제목을 입력해주세요'),

  // 학교급
  schoolLevel: z.object({
    kindergarten: z.boolean(),
    elementary: z.boolean(),
    secondary: z.boolean(),
    high: z.boolean(),
    special: z.boolean(),
    adultTraining: z.boolean(),
    other: z.string().optional(),
  }).refine(
    (data: { kindergarten: boolean; elementary: boolean; secondary: boolean; high: boolean; special: boolean; adultTraining: boolean; other?: string }) =>
      data.kindergarten ||
      data.elementary ||
      data.secondary ||
      data.high ||
      data.special ||
      data.adultTraining ||
      (data.other && data.other.length > 0),
    { message: '최소 하나의 학교급을 선택해주세요' }
  ),

  // 과목 (중등 또는 성인대상 체크 시 필수)
  subject: z.string().optional(),

  // 근무 지역
  location: z.object({
    seoul: z.array(z.string()).optional(),
    gyeonggi: z.array(z.string()).optional(),
  }).refine(
    (data: { seoul?: string[]; gyeonggi?: string[] }) =>
      (data.seoul && data.seoul.length > 0) ||
      (data.gyeonggi && data.gyeonggi.length > 0),
    { message: '최소 하나의 지역을 선택해주세요' }
  ),

  // 급여/처우
  compensation: z.string().optional(),

  // 모집기간
  recruitmentStart: z.string().min(1, '모집 시작일을 입력해주세요'),
  recruitmentEnd: z.string().min(1, '모집 마감일을 입력해주세요'),
  isOngoing: z.boolean(),

  // 근무기간
  workStart: z.string().min(1, '근무 시작일을 입력해주세요'),
  workEnd: z.string().min(1, '근무 종료일을 입력해주세요'),
  isNegotiable: z.boolean(),

  // 추가 정보
  description: z.string().optional(),

  // 연락처
  phone: z.string().min(1, '전화번호를 입력해주세요'),
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),

  // 공고문 첨부파일 (선택)
  attachment: z.instanceof(File).optional(),
}).refine(
  (data: { schoolLevel: { secondary: boolean; adultTraining: boolean }; subject?: string }) => {
    // 중등 또는 성인대상 체크 시 과목 필수
    if (data.schoolLevel.secondary || data.schoolLevel.adultTraining) {
      return data.subject && data.subject.length > 0;
    }
    return true;
  },
  {
    message: '중등 또는 성인대상 강의연수 선택 시 과목을 입력해주세요',
    path: ['subject']
  }
);

export type JobPostingFormData = z.infer<typeof jobPostingSchema>;

// ========================================
// 인력 등록 폼 스키마
// ========================================

export const talentRegistrationSchema = z.object({
  // 마커 위치 (구/읍/면 단위)
  markerLocation: z.object({
    regionCode: z.string(),
    regionName: z.string().min(1, '지역을 선택해주세요'),
    fullAddress: z.string(),
  }).optional(),

  // 기본 정보
  name: z.string().min(1, '이름을 입력해주세요'),

  // 전문 분야
  specialty: z.object({
    contractTeacher: z.object({
      enabled: z.boolean(),
      kindergarten: z.boolean(),
      elementary: z.boolean(),
      secondary: z.boolean(),
      secondarySubjects: z.string().optional(), // 중등 과목 직접 입력
      special: z.boolean(),
    }),
    careerEducation: z.boolean(),
    counseling: z.boolean(),
    afterSchool: z.boolean(),
    neulbom: z.boolean(),
    cooperativeInstructor: z.boolean(),
    adultTraining: z.boolean(),
    other: z.string().optional(),
  }).refine(
    (data: { contractTeacher: { enabled: boolean }; careerEducation: boolean; counseling: boolean; afterSchool: boolean; neulbom: boolean; cooperativeInstructor: boolean; adultTraining: boolean; other?: string }) =>
      data.contractTeacher.enabled ||
      data.careerEducation ||
      data.counseling ||
      data.afterSchool ||
      data.neulbom ||
      data.cooperativeInstructor ||
      data.adultTraining ||
      (data.other && data.other.length > 0),
    { message: '최소 하나의 전문 분야를 선택해주세요' }
  ),

  // 경력
  experience: z.enum(['신규', '1~3년', '3~5년', '5년 이상']),

  // 희망 지역 (서울/경기 전체 선택 허용)
  location: z.object({
    seoulAll: z.boolean().optional(),
    gyeonggiAll: z.boolean().optional(),
    seoul: z.array(z.string()).optional(),
    gyeonggi: z.array(z.string()).optional(),
  }).refine(
    (data: { seoulAll?: boolean; gyeonggiAll?: boolean; seoul?: string[]; gyeonggi?: string[] }) =>
      Boolean(data.seoulAll) ||
      Boolean(data.gyeonggiAll) ||
      (data.seoul && data.seoul.length > 0) ||
      (data.gyeonggi && data.gyeonggi.length > 0),
    { message: '최소 하나의 지역(서울 전체/경기 전체 또는 개별 시·군·구)을 선택해주세요' }
  ),

  // 자격/면허
  license: z.string().optional(),

  // 자기소개
  introduction: z.string().optional(),

  // 연락처
  phone: z.string().min(1, '전화번호를 입력해주세요'),
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
}).refine(
  (data: { specialty: { contractTeacher: { enabled: boolean; kindergarten: boolean; elementary: boolean; secondary: boolean; special: boolean } } }) => {
    // 기간제교사 선택 시 최소 하나의 학교급 선택 필요
    if (data.specialty.contractTeacher.enabled) {
      const { kindergarten, elementary, secondary, special } = data.specialty.contractTeacher;
      return kindergarten || elementary || secondary || special;
    }
    return true;
  },
  {
    message: '기간제교사 선택 시 최소 하나의 학교급을 선택해주세요',
    path: ['specialty', 'contractTeacher']
  }
).refine(
  (data: { specialty: { contractTeacher: { enabled: boolean; secondary: boolean; secondarySubjects?: string } } }) => {
    // 중등 선택 시 과목 필수
    if (data.specialty.contractTeacher.enabled && data.specialty.contractTeacher.secondary) {
      return data.specialty.contractTeacher.secondarySubjects &&
             data.specialty.contractTeacher.secondarySubjects.length > 0;
    }
    return true;
  },
  {
    message: '중등 선택 시 과목을 입력해주세요',
    path: ['specialty', 'contractTeacher', 'secondarySubjects']
  }
);

export type TalentRegistrationFormData = z.infer<typeof talentRegistrationSchema>;

// ========================================
// 체험 등록 폼 스키마
// ========================================

export const experienceRegistrationSchema = z.object({
  // 프로그램 제목
  programTitle: z.string().min(1, '프로그램 제목을 입력해주세요'),

  // 카테고리
  category: z.array(z.string()).min(1, '최소 하나의 카테고리를 선택해주세요'),

  // 대상 학교급
  targetSchoolLevel: z.array(z.string()).min(1, '최소 하나의 학교급을 선택해주세요'),

  // 희망 지역
  location: z.object({
    seoul: z.array(z.string()).optional(),
    gyeonggi: z.array(z.string()).optional(),
  }).refine(
    (data: { seoul?: string[]; gyeonggi?: string[] }) =>
      (data.seoul && data.seoul.length > 0) ||
      (data.gyeonggi && data.gyeonggi.length > 0),
    { message: '최소 하나의 희망 지역을 선택해주세요' }
  ),

  // 프로그램 소개
  introduction: z.string().min(1, '프로그램 소개를 입력해주세요'),

  // 운영 방식
  operationType: z.array(z.string()).min(1, '최소 하나의 운영 방식을 선택해주세요'),

  // 수용 인원
  capacity: z.string().optional(),

  // 연락처
  phone: z.string().min(1, '전화번호를 입력해주세요'),
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
});

export type ExperienceRegistrationFormData = z.infer<typeof experienceRegistrationSchema>;

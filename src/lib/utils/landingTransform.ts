import type { TalentCard } from '@/types';

/**
 * 랜딩페이지에서 수집한 사용자 입력 데이터
 */
export interface LandingUserInput {
  name: string;
  role: string;  // "교사", "기간제 교사", "강사", "교사이자 강사", "행정인력", "기간제 행정인력", "업체"
  regions: string[];  // ["서울", "경기"]
  fields: string[];  // ["수업·강의", "멘토링"]
  phone: string;
  experience?: string | null;  // "신규", "1~3년", "3~5년", "5년 이상"
}

/**
 * talents 테이블에 저장할 데이터 구조
 */
export interface TalentInsertData {
  name: string;
  specialty: string;
  tags: string[];
  location: string[];
  experience_years: number;
  temp_identifier: string;
  is_guest_registered: boolean;
  registered_via: string;
}

/**
 * 랜딩페이지 입력값을 TalentCard 형식으로 변환 (미리보기용)
 */
export function transformLandingToTalentCard(input: LandingUserInput): TalentCard {
  return {
    id: crypto.randomUUID(),  // 미리보기용 임시 ID
    type: 'talent',
    isVerified: false,
    user_id: null,
    name: input.name,
    specialty: generateSpecialty(input),
    tags: generateTags(input),
    location: formatLocationDisplay(input),
    experience: formatExperienceDisplay(input.experience),
    phone: input.phone || null,
    email: null,
    license: null,
    introduction: null,
    rating: 0,
    reviewCount: 0,
  };
}

/**
 * 랜딩페이지 입력값을 DB 저장 형식으로 변환
 */
export function transformLandingToInsertData(input: LandingUserInput): Omit<TalentInsertData, 'temp_identifier'> {
  return {
    name: input.name,
    specialty: generateSpecialty(input),
    tags: generateTags(input),
    location: formatLocationArray(input),
    experience_years: parseExperienceYears(input.experience),
    is_guest_registered: true,
    registered_via: 'landing',
  };
}

/**
 * specialty 자동 생성
 * 예: "기간제 교사, 수업·강의" or "강사, 멘토링, 방과후·돌봄"
 */
function generateSpecialty(input: LandingUserInput): string {
  const role = input.role;
  const fields = input.fields.slice(0, 2).join(', ');  // 최대 2개
  return fields ? `${role}, ${fields}` : role;
}

/**
 * tags 자동 생성
 * 예: ["기간제", "수업"] or ["강사", "멘토링"]
 */
function generateTags(input: LandingUserInput): string[] {
  const tags: string[] = [];

  // 역할 기반 태그
  if (input.role.includes('기간제')) tags.push('기간제');
  if (input.role.includes('강사')) tags.push('강사');
  if (input.role.includes('교사') && !input.role.includes('기간제')) tags.push('교사');
  if (input.role.includes('행정')) tags.push('행정');
  if (input.role.includes('업체')) tags.push('업체');

  // 분야 기반 태그 (최대 1개 추가)
  if (input.fields.length > 0) {
    const firstField = input.fields[0];
    // "수업·강의" → "수업" 형태로 축약
    const shortField = firstField.split('·')[0];
    if (!tags.includes(shortField)) {
      tags.push(shortField);
    }
  }

  return tags.slice(0, 3);  // 최대 3개
}

/**
 * location 배열 생성 (DB 저장용)
 * 예: ["서울", "경기"]
 */
function formatLocationArray(input: LandingUserInput): string[] {
  return input.regions;
}

/**
 * location 표시 문자열 생성 (TalentCard 표시용)
 * 예: "서울, 경기"
 */
function formatLocationDisplay(input: LandingUserInput): string {
  return input.regions.join(', ');
}

/**
 * 경력 문자열 → experience_years 변환 (DB 저장용)
 */
function parseExperienceYears(exp?: string | null): number {
  if (!exp || exp === '신규') return 0;
  if (exp === '1~3년') return 2;
  if (exp === '3~5년') return 4;
  if (exp === '5년 이상') return 6;
  return 0;
}

/**
 * 경력 표시 문자열 생성 (TalentCard 표시용)
 */
function formatExperienceDisplay(exp?: string | null): string {
  if (!exp || exp === '신규') return '신규';
  if (exp === '1~3년') return '경력 2년';
  if (exp === '3~5년') return '경력 4년';
  if (exp === '5년 이상') return '경력 6년 이상';
  return '신규';
}

/**
 * 전화번호 해싱 (비회원 식별자)
 * 형식: guest_abc123def456
 */
export function hashPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  const hash = btoa(cleaned).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  return `guest_${hash}`;
}

/**
 * LocalStorage에 저장할 등록 정보
 */
export interface RegisteredTalentInfo {
  id: string;
  registered_at: string;
  user_input: LandingUserInput;
}

/**
 * LocalStorage에 등록 정보 저장
 */
export function saveRegisteredTalentToLocalStorage(id: string, input: LandingUserInput): void {
  const info: RegisteredTalentInfo = {
    id,
    registered_at: new Date().toISOString(),
    user_input: input,
  };
  localStorage.setItem('recently_registered_talent', JSON.stringify(info));
}

/**
 * LocalStorage에서 등록 정보 가져오기
 */
export function getRegisteredTalentFromLocalStorage(): RegisteredTalentInfo | null {
  const stored = localStorage.getItem('recently_registered_talent');
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * LocalStorage에서 등록 정보 삭제
 */
export function clearRegisteredTalentFromLocalStorage(): void {
  localStorage.removeItem('recently_registered_talent');
}

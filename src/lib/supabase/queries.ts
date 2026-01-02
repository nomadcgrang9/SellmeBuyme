import { supabase } from './client';
import {
  uploadJobAttachment,
  getJobAttachmentPublicUrl,
  deleteJobAttachment
} from './storage';
import type { User } from '@supabase/supabase-js';
import {
  DEFAULT_CATEGORY,
  DEFAULT_REGION,
  DEFAULT_SORT
} from '@/lib/constants/filters';
import {
  expandProvinceToAllCities,
  isProvinceWideSearch,
  PROVINCE_TO_CITIES,
  PROVINCE_NAMES
} from '@/lib/constants/regionHierarchy';
import type {
  Card,
  CrawlBoard,
  CrawlLog,
  CreateCrawlBoardInput,
  ExperienceCard,
  JobPostingCard,
  SearchFilters,
  SearchQueryParams,
  SearchResponse,
  SortOptionValue,
  StructuredJobContent,
  TalentCard,
  ColorMode,
  PromoCardSettings,
  PromoCardUpdateInput,
  UpdateCrawlBoardInput,
  ViewType
} from '@/types';
import type { ExperienceRegistrationFormData, TalentRegistrationFormData } from '@/lib/validation/formSchemas';

type JobPostingSchoolLevel = {
  kindergarten: boolean;
  elementary: boolean;
  secondary: boolean;
  high: boolean;
  special: boolean;
  adultTraining: boolean;
  other?: string;
};

type JobPostingLocation = {
  seoul?: string[];
  gyeonggi?: string[];
};

const downloadAttachmentFunctionUrl = (() => {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const url = baseUrl ? `${baseUrl}/functions/v1/download-attachment` : null;
  console.log('[downloadAttachmentFunctionUrl] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('[downloadAttachmentFunctionUrl] Generated URL:', url);
  return url;
})();

function isSupabaseStorageUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes('/storage/v1/object/');
  } catch (error) {
    return false;
  }
}

function sanitizeFilenameComponent(value: string) {
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAttachmentFilename(organization: string, originalFilename?: string | null) {
  const sanitizedOrg = sanitizeFilenameComponent(organization || '');
  const baseName = sanitizedOrg.length > 0 ? sanitizedOrg : '공고';

  // URL에 쿼리스트링이 있으면 (경기도 fileDownload.do?fileKey=...) 확장자를 추출하지 않음
  let extension = 'hwp';
  if (originalFilename && !originalFilename.includes('?')) {
    // 쿼리스트링이 없는 경우에만 확장자 추출
    const parts = originalFilename.split('.');
    const lastPart = parts[parts.length - 1];
    // 확장자처럼 보이는 부분만 사용 (길이 2-5자)
    if (lastPart && lastPart.length >= 2 && lastPart.length <= 5 && /^[a-z0-9]+$/i.test(lastPart)) {
      extension = lastPart.toLowerCase();
    }
  }

  const filename = `${baseName} 공고문.${extension}`;
  console.log('[buildAttachmentFilename] organization:', organization, 'originalFilename:', originalFilename, '=> filename:', filename);
  return filename;
}

function buildAttachmentDownloadUrl(originalUrl: string | null, filename?: string) {
  if (!originalUrl) return null;

  console.log('[buildAttachmentDownloadUrl] Called with:', { originalUrl, filename });
  console.log('[buildAttachmentDownloadUrl] downloadAttachmentFunctionUrl:', downloadAttachmentFunctionUrl);

  if (isSupabaseStorageUrl(originalUrl)) {
    console.log('[buildAttachmentDownloadUrl] Supabase Storage URL detected');
    try {
      const url = new URL(originalUrl);
      if (filename?.trim()) {
        url.searchParams.set('download', filename.trim());
      } else {
        url.searchParams.set('download', '');
      }
      return url.toString();
    } catch (error) {
      return originalUrl;
    }
  }

  // 크롤링된 공고: Edge Function을 통해 파일명 변경
  if (downloadAttachmentFunctionUrl && filename) {
    // 구리남양주(goegn.kr)는 SSL 문제로 UUID 형식 다운로드 (원본 URL 사용)
    if (originalUrl.includes('goegn.kr')) {
      console.log('[buildAttachmentDownloadUrl] goegn.kr detected, using original URL (UUID format)');
      return originalUrl;
    }

    const params = new URLSearchParams();
    params.set('url', originalUrl);
    params.set('filename', filename.trim());
    const finalUrl = `${downloadAttachmentFunctionUrl}?${params.toString()}`;
    console.log('[buildAttachmentDownloadUrl] Edge Function URL generated:', finalUrl);
    return finalUrl;
  }

  // 파일명이 없으면 원본 URL 그대로 반환
  console.log('[buildAttachmentDownloadUrl] Returning original URL (no filename or no function URL)');
  return originalUrl;
}

export interface CreateJobPostingInput {
  organization: string;
  title: string;
  schoolLevel: JobPostingSchoolLevel;
  subject?: string;
  location: JobPostingLocation;
  compensation?: string;
  recruitmentStart: string;
  recruitmentEnd: string;
  isOngoing: boolean;
  workStart: string;
  workEnd: string;
  isNegotiable: boolean;
  description?: string;
  phone: string;
  email: string;
  attachmentFile?: File | null;
}

async function ensureUserRow(user: User) {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('사용자 조회 실패:', error);
    throw new Error('사용자 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (data) {
    return;
  }

  const { error: insertError } = await supabase.from('users').insert({
    id: user.id,
    email: user.email,
    role: 'school'
  });

  if (insertError && insertError.code !== '23505') {
    console.error('사용자 정보 생성 실패:', insertError);
    throw new Error('사용자 정보를 생성할 수 없습니다. 잠시 후 다시 시도해주세요.');
  }
}

function summarizeSchoolLevel(level: JobPostingSchoolLevel): string | null {
  const selections: string[] = [];

  if (level.kindergarten) selections.push('유치원');
  if (level.elementary) selections.push('초등');
  if (level.secondary) selections.push('중등');
  if (level.high) selections.push('고등');
  if (level.special) selections.push('특수');
  if (level.adultTraining) selections.push('성인대상');

  const custom = level.other?.trim();
  if (custom) {
    selections.push(custom);
  }

  return selections.length > 0 ? selections.join(', ') : null;
}

function formatLocation(location: JobPostingLocation): string {
  const parts: string[] = [];
  if (location.seoul && location.seoul.length > 0) {
    parts.push(`서울(${location.seoul.join(', ')})`);
  }
  if (location.gyeonggi && location.gyeonggi.length > 0) {
    parts.push(`경기(${location.gyeonggi.join(', ')})`);
  }
  return parts.join(' · ');
}

function buildJobContent(input: CreateJobPostingInput): string {
  const lines: string[] = [];

  if (input.description?.trim()) {
    lines.push(input.description.trim());
  }

  const recruitmentRange = input.isOngoing
    ? '상시 모집'
    : [input.recruitmentStart, input.recruitmentEnd]
        .filter(Boolean)
        .join(' ~ ');

  if (recruitmentRange) {
    lines.push(`모집기간: ${recruitmentRange}`);
  }

  const workRange = input.isNegotiable
    ? '협의 가능'
    : [input.workStart, input.workEnd]
        .filter(Boolean)
        .join(' ~ ');

  if (workRange) {
    lines.push(`근무기간: ${workRange}`);
  }

  if (input.compensation?.trim()) {
    lines.push(`급여/처우: ${input.compensation.trim()}`);
  }

  lines.push(`연락처: 전화 ${input.phone} / 이메일 ${input.email}`);

  return lines.join('\n');
}

export interface UpdateJobPostingInput extends CreateJobPostingInput {
  jobId: string;
  removeAttachment?: boolean;
}

export async function updateJobPosting(input: UpdateJobPostingInput) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('사용자 정보 조회 실패:', userError);
    throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 시도해주세요.');
  }

  if (!user) {
    throw new Error('로그인이 필요합니다. 다시 로그인 후 이용해주세요.');
  }

  // 기존 공고 조회 (소유권 확인)
  const { data: existingJob, error: fetchError } = await supabase
    .from('job_postings')
    .select('user_id, attachment_path')
    .eq('id', input.jobId)
    .single();

  if (fetchError) {
    console.error('공고 조회 실패:', fetchError);
    throw new Error('공고를 찾을 수 없습니다.');
  }

  if (existingJob.user_id !== user.id) {
    throw new Error('이 공고를 수정할 권한이 없습니다.');
  }

  const schoolLevel = summarizeSchoolLevel(input.schoolLevel);
  const location = formatLocation(input.location);
  const content = buildJobContent(input);

  // 첨부파일 처리
  let attachmentPath: string | null = existingJob.attachment_path ?? null;
  let attachmentUrl: string | null = null;

  const shouldDeleteExisting = Boolean(existingJob.attachment_path && (input.removeAttachment || input.attachmentFile));

  if (shouldDeleteExisting) {
    try {
      await deleteJobAttachment(existingJob.attachment_path);
    } catch (deleteError) {
      console.error('기존 첨부파일 삭제 실패:', deleteError);
    }
    attachmentPath = null;
    attachmentUrl = null;
  }

  if (input.attachmentFile) {
    try {
      attachmentPath = await uploadJobAttachment(input.attachmentFile, user.id);
      // 공개 URL 생성 (만료 없음)
      const publicUrl = getJobAttachmentPublicUrl(attachmentPath);
      attachmentUrl = buildAttachmentDownloadUrl(
        publicUrl,
        buildAttachmentFilename(input.organization, input.attachmentFile.name)
      );
    } catch (uploadError) {
      console.error('첨부파일 업로드 실패:', uploadError);
      const message = uploadError instanceof Error ? uploadError.message : '첨부파일 업로드에 실패했습니다.';
      console.warn(`경고: ${message}`);
      // 업로드 실패 시 attachment_url은 null로 유지
      attachmentUrl = null;
    }
  } else if (!input.removeAttachment && attachmentPath) {
    // 기존 파일이 있으면 공개 URL 생성
    const publicUrl = getJobAttachmentPublicUrl(attachmentPath);
    const existingFilename = attachmentPath.split('/').pop() ?? null;
    attachmentUrl = buildAttachmentDownloadUrl(
      publicUrl,
      buildAttachmentFilename(input.organization, existingFilename)
    );
  }

  // 폼 데이터 저장용 payload 생성
  const formPayload = {
    organization: input.organization,
    title: input.title,
    schoolLevel: input.schoolLevel,
    subject: input.subject,
    location: input.location,
    compensation: input.compensation,
    recruitmentStart: input.recruitmentStart,
    recruitmentEnd: input.recruitmentEnd,
    isOngoing: input.isOngoing,
    workStart: input.workStart,
    workEnd: input.workEnd,
    isNegotiable: input.isNegotiable,
    description: input.description,
    phone: input.phone,
    email: input.email
  };

  const payload = {
    organization: input.organization,
    title: input.title,
    location,
    content,
    compensation: input.compensation && input.compensation.trim().length > 0 ? input.compensation : null,
    deadline: input.isOngoing || !input.recruitmentEnd ? null : input.recruitmentEnd,
    school_level: schoolLevel,
    subject: input.subject && input.subject.trim().length > 0 ? input.subject : null,
    application_period: input.isOngoing
      ? '상시 모집'
      : `${input.recruitmentStart} ~ ${input.recruitmentEnd}`,
    work_period: input.isNegotiable
      ? '협의 가능'
      : `${input.workStart} ~ ${input.workEnd}`,
    contact: [input.phone, input.email].filter(Boolean).join(' / '),
    attachment_url: attachmentUrl,
    attachment_path: attachmentPath,
    form_payload: formPayload,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('job_postings')
    .update(payload)
    .eq('id', input.jobId)
    .select()
    .single();

  if (error) {
    console.error('공고 수정 실패:', error);
    throw new Error(error.message || '공고 수정에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  return data;
}

/**
 * 사용자가 업로드한 공고 삭제
 * - 소유권 확인 후 첨부파일이 있으면 Storage에서 함께 제거
 */
export async function deleteJobPosting(jobId: string): Promise<{ id: string }>
{
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
  }
  if (!user) {
    throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');
  }

  // 소유자 확인 및 첨부 경로 조회
  const { data: jobRow, error: fetchError } = await supabase
    .from('job_postings')
    .select('id, user_id, attachment_path')
    .eq('id', jobId)
    .single();

  if (fetchError || !jobRow) {
    throw new Error('공고를 찾을 수 없습니다.');
  }
  if (jobRow.user_id !== user.id) {
    throw new Error('해당 공고를 삭제할 권한이 없습니다.');
  }

  // 첨부파일 제거 (에러는 로그만 남기고 계속 진행)
  if (jobRow.attachment_path) {
    try {
      await deleteJobAttachment(jobRow.attachment_path);
    } catch (e) {
      console.error('첨부파일 삭제 실패:', e);
    }
  }

  const { error: deleteError } = await supabase
    .from('job_postings')
    .delete()
    .eq('id', jobId);

  if (deleteError) {
    console.error('공고 삭제 실패:', deleteError);
    throw new Error(deleteError.message || '공고 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  return { id: jobId };
}

// ============================================================================
// Talent (인력) 등록
// ============================================================================

function summarizeTalentSpecialty(input: TalentRegistrationFormData['specialty']): {
  summary: string;
  tags: string[];
} {
  const tags: string[] = [];

  if (input.contractTeacher.enabled) {
    const levels: string[] = [];
    if (input.contractTeacher.kindergarten) levels.push('유치원');
    if (input.contractTeacher.elementary) levels.push('초등');
    if (input.contractTeacher.secondary) levels.push('중등');
    if (input.contractTeacher.special) levels.push('특수');
    const subjectText = input.contractTeacher.secondary && input.contractTeacher.secondarySubjects
      ? `(${input.contractTeacher.secondarySubjects})`
      : '';
    if (levels.length > 0) {
      tags.push('기간제교사');
    }
    tags.push(...levels.map((l) => `기간제-${l}`));
    if (subjectText) tags.push('중등-과목');
  }

  if (input.careerEducation) tags.push('진로교육');
  if (input.counseling) tags.push('상담교육');
  if (input.afterSchool) tags.push('방과후강사');
  if (input.neulbom) tags.push('늘봄강사');
  if (input.cooperativeInstructor) tags.push('협력강사');
  if (input.adultTraining) tags.push('성인직무연수');
  if (input.other) tags.push('기타');

  const titleParts: string[] = [];
  if (input.contractTeacher.enabled) {
    const lv: string[] = [];
    if (input.contractTeacher.kindergarten) lv.push('유치원');
    if (input.contractTeacher.elementary) lv.push('초등');
    if (input.contractTeacher.secondary) lv.push('중등');
    if (input.contractTeacher.special) lv.push('특수');
    const base = `기간제교사${lv.length ? `(${lv.join('/')}` : ''}`;
    const withParen = input.contractTeacher.secondary && input.contractTeacher.secondarySubjects
      ? `${base}${lv.length ? ')' : ''} ${input.contractTeacher.secondarySubjects}`
      : `${base}${lv.length ? ')' : ''}`;
    titleParts.push(withParen);
  }
  [
    input.careerEducation && '진로교육',
    input.counseling && '상담교육',
    input.afterSchool && '방과후강사',
    input.neulbom && '늘봄',
    input.cooperativeInstructor && '협력강사',
    input.adultTraining && '교직원연수'
  ].filter(Boolean).forEach((t) => titleParts.push(String(t)));

  if (input.other && input.other.trim().length > 0) titleParts.push('기타');

  const summary = titleParts.length > 0 ? titleParts.join(', ') : '인력';
  return { summary, tags };
}

function mapExperienceToYears(exp: TalentRegistrationFormData['experience']): number {
  switch (exp) {
    case '신규':
      return 0;
    case '1~3년':
      return 2;
    case '3~5년':
      return 4;
    case '5년 이상':
      return 6;
    default:
      return 0;
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function buildExperienceLocationSummary(seoul: string[], gyeonggi: string[]): string {
  const parts: string[] = [];

  if (seoul.length > 0) {
    // "서울-강남구" → "강남구" prefix 제거
    const cleanedSeoul = seoul.map(region => region.replace(/^서울-?/, '').replace(/^서울특별시-?/, ''));
    // 서울 전체인지 확인 (25개 자치구)
    if (seoul.length >= 20) {
      parts.push('서울 전체');
    } else {
      parts.push(`서울 ${cleanedSeoul.join(', ')}`);
    }
  }

  if (gyeonggi.length > 0) {
    // "경기-성남시" → "성남시" prefix 제거
    const cleanedGyeonggi = gyeonggi.map(region => region.replace(/^경기-?/, '').replace(/^경기도-?/, ''));
    // 경기 전체인지 확인 (31개 시군)
    if (gyeonggi.length >= 25) {
      parts.push('경기 전체');
    } else {
      parts.push(cleanedGyeonggi.join(', '));
    }
  }

  return parts.length > 0 ? parts.join(' · ') : '지역 미지정';
}

function mapExperienceRowToCard(row: any): ExperienceCard {
  const regionSeoul = normalizeStringArray(row?.region_seoul);
  const regionGyeonggi = normalizeStringArray(row?.region_gyeonggi);
  const categories = normalizeStringArray(row?.categories);
  const targetLevels = normalizeStringArray(row?.target_school_levels);
  const operationTypes = normalizeStringArray(row?.operation_types);

  return {
    id: row?.id,
    type: 'experience',
    user_id: row?.user_id ?? null,
    programTitle: row?.program_title ?? '',
    categories,
    targetSchoolLevels: targetLevels,
    regionSeoul,
    regionGyeonggi,
    locationSummary: buildExperienceLocationSummary(regionSeoul, regionGyeonggi),
    operationTypes,
    capacity: row?.capacity ?? null,
    introduction: row?.introduction ?? '',
    contactPhone: row?.contact_phone ?? '',
    contactEmail: row?.contact_email ?? '',
    status: row?.status ?? 'active',
    createdAt: row?.created_at ?? '',
    updatedAt: row?.updated_at ?? row?.created_at ?? '',
    form_payload: row?.form_payload ?? null,
  };
}

function applyExperienceRegionFilter(cards: ExperienceCard[], region: string): ExperienceCard[] {
  if (!hasFilterValue(region, DEFAULT_REGION)) {
    return cards;
  }

  if (region === '서울 전체') {
    return cards.filter((card) => card.regionSeoul.length > 0);
  }

  if (region === '경기도 전체') {
    return cards.filter((card) => card.regionGyeonggi.length > 0);
  }

  const normalized = region.replace(/\s+/g, '').toLowerCase();

  return cards.filter((card) => {
    const seoulMatch = card.regionSeoul.some((name) => name.replace(/\s+/g, '').toLowerCase().includes(normalized));
    const gyeonggiMatch = card.regionGyeonggi.some((name) => name.replace(/\s+/g, '').toLowerCase().includes(normalized));
    const summaryMatch = card.locationSummary.replace(/\s+/g, '').toLowerCase().includes(normalized);
    return seoulMatch || gyeonggiMatch || summaryMatch;
  });
}

function applyExperienceCategoryFilter(cards: ExperienceCard[], category: string): ExperienceCard[] {
  if (!hasFilterValue(category, DEFAULT_CATEGORY)) {
    return cards;
  }

  const normalized = category.trim().toLowerCase();

  return cards.filter((card) => {
    const titleMatch = card.programTitle.toLowerCase().includes(normalized);
    const introMatch = card.introduction.toLowerCase().includes(normalized);
    const categoryMatch = card.categories.some((item) => item.toLowerCase().includes(normalized));
    return titleMatch || introMatch || categoryMatch;
  });
}

function filterExperiencesByTokenGroups(cards: ExperienceCard[], tokenGroups: TokenGroup[]): ExperienceCard[] {
  if (tokenGroups.length === 0) {
    return cards;
  }

  return cards.filter((card) => {
    const targetFields = [
      card.programTitle,
      card.introduction,
      card.locationSummary,
      card.categories.join(' '),
      card.targetSchoolLevels.join(' '),
      card.operationTypes.join(' '),
      card.contactPhone ?? '',
      card.contactEmail ?? '',
    ].map((field) => field.toLowerCase());

    return tokenGroups.every((group) =>
      group.some((token) => {
        const normalized = token.toLowerCase();
        return targetFields.some((field) => field.includes(normalized));
      })
    );
  });
}

function calculateExperienceRelevance(card: ExperienceCard, tokens: string[], fallbackQuery: string): number {
  const baseTokens = tokens.length > 0
    ? tokens
    : fallbackQuery.trim().length > 0
      ? [fallbackQuery.trim()]
      : [];

  if (baseTokens.length === 0) {
    return 0;
  }

  const normalizedTokens = baseTokens.map((token) => token.toLowerCase());
  const programTitle = card.programTitle.toLowerCase();
  const introduction = card.introduction.toLowerCase();
  const categories = card.categories.map((item) => item.toLowerCase()).join(' ');
  const targetLevels = card.targetSchoolLevels.map((item) => item.toLowerCase()).join(' ');
  const operationTypes = card.operationTypes.map((item) => item.toLowerCase()).join(' ');
  const location = card.locationSummary.toLowerCase();
  const contact = `${card.contactPhone ?? ''} ${card.contactEmail ?? ''}`.toLowerCase();

  let score = 0;

  normalizedTokens.forEach((token) => {
    if (!token) return;

    if (programTitle === token) {
      score += 60;
    } else if (programTitle.includes(token)) {
      score += 40;
    }

    if (categories.includes(token)) {
      score += 30;
    }

    if (location.includes(token)) {
      score += 20;
    }

    if (introduction.includes(token)) {
      score += 15;
    }

    if (targetLevels.includes(token)) {
      score += 12;
    }

    if (operationTypes.includes(token)) {
      score += 10;
    }

    if (contact.includes(token)) {
      score += 5;
    }
  });

  return score;
}

function sortExperiencesByRelevance(cards: ExperienceCard[], tokens: string[], fallbackQuery: string): ExperienceCard[] {
  return [...cards].sort((a, b) => {
    const scoreA = calculateExperienceRelevance(a, tokens, fallbackQuery);
    const scoreB = calculateExperienceRelevance(b, tokens, fallbackQuery);

    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
  });
}

export async function createExperience(data: ExperienceRegistrationFormData): Promise<ExperienceCard> {
  console.log('[DEBUG] createExperience 시작:', data);

  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  console.log('[DEBUG] 사용자 ID:', user?.id || 'null (비인증)');

  if (user) {
    await ensureUserRow(user);
  }

  const categories = normalizeStringArray(data.category);
  const targetLevels = normalizeStringArray(data.targetSchoolLevel);
  const regionSeoul = normalizeStringArray(data.location?.seoul);
  const regionGyeonggi = normalizeStringArray(data.location?.gyeonggi);
  const operationTypes = normalizeStringArray(data.operationType);
  const capacity = data.capacity?.trim() ?? null;
  const phone = data.phone.trim();
  const email = data.email.trim();

  console.log('[DEBUG] 정규화된 데이터:', {
    regionSeoul,
    regionGyeonggi,
    categories,
    targetLevels,
    operationTypes,
  });

  const formPayload: ExperienceRegistrationFormData = {
    ...data,
    capacity: capacity ?? '',
    location: {
      seoul: regionSeoul,
      gyeonggi: regionGyeonggi,
    }
  };

  const insertPayload = {
    user_id: user?.id || null,
    program_title: data.programTitle.trim(),
    categories,
    target_school_levels: targetLevels,
    region_seoul: regionSeoul,
    region_gyeonggi: regionGyeonggi,
    operation_types: operationTypes,
    capacity: capacity && capacity.length > 0 ? capacity : null,
    introduction: data.introduction.trim(),
    contact_phone: phone,
    contact_email: email,
    form_payload: formPayload,
  };

  console.log('[DEBUG] INSERT 페이로드:', insertPayload);

  const { data: inserted, error } = await supabase
    .from('experiences')
    .insert(insertPayload)
    .select('*')
    .single();

  if (inserted) {
    console.log('[DEBUG] INSERT 성공 - 레코드 ID:', inserted.id);
  } else {
    console.log('[DEBUG] INSERT 실패 - inserted가 null/undefined');
  }
  
  if (error) {
    console.log('[DEBUG] INSERT 에러 발생');
    console.log('[DEBUG] 에러 메시지:', String(error.message || ''));
    console.log('[DEBUG] 에러 코드:', String(error.code || ''));
    console.log('[DEBUG] 에러 상세:', String(error.details || ''));
    console.log('[DEBUG] 에러 힌트:', String(error.hint || ''));
  } else {
    console.log('[DEBUG] INSERT 에러 없음');
  }

  if (error || !inserted) {
    const errorMsg = error?.message || '체험 등록에 실패했습니다. 잠시 후 다시 시도해주세요.';
    console.error('[ERROR] 체험 등록 실패:', errorMsg);
    throw new Error(errorMsg);
  }

  console.log('[DEBUG] 체험 등록 성공:', inserted);
  return mapExperienceRowToCard(inserted);
}

export interface UpdateExperienceInput extends ExperienceRegistrationFormData {
  id: string;
}

export async function updateExperience(input: UpdateExperienceInput): Promise<ExperienceCard> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
  const user = userRes.user;
  if (!user) throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');

  const { data: existing, error: fetchErr } = await supabase
    .from('experiences')
    .select('id, user_id')
    .eq('id', input.id)
    .single();

  if (fetchErr || !existing) {
    throw new Error('체험 정보를 찾을 수 없습니다.');
  }
  if (existing.user_id !== user.id) {
    throw new Error('해당 체험을 수정할 권한이 없습니다.');
  }

  const categories = normalizeStringArray(input.category);
  const targetLevels = normalizeStringArray(input.targetSchoolLevel);
  const regionSeoul = normalizeStringArray(input.location?.seoul);
  const regionGyeonggi = normalizeStringArray(input.location?.gyeonggi);
  const operationTypes = normalizeStringArray(input.operationType);
  const capacity = input.capacity?.trim() ?? null;
  const phone = input.phone.trim();
  const email = input.email.trim();

  const formPayload: ExperienceRegistrationFormData = {
    ...input,
    capacity: capacity ?? '',
    location: {
      seoul: regionSeoul,
      gyeonggi: regionGyeonggi,
    }
  };

  const payload = {
    program_title: input.programTitle.trim(),
    categories,
    target_school_levels: targetLevels,
    region_seoul: regionSeoul,
    region_gyeonggi: regionGyeonggi,
    operation_types: operationTypes,
    capacity: capacity && capacity.length > 0 ? capacity : null,
    introduction: input.introduction.trim(),
    contact_phone: phone,
    contact_email: email,
    form_payload: formPayload,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('experiences')
    .update(payload)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error || !updated) {
    console.error('체험 수정 실패:', error);
    throw new Error(error?.message || '체험 수정에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  return mapExperienceRowToCard(updated);
}

export async function deleteExperience(id: string): Promise<{ id: string }> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
  const user = userRes.user;
  if (!user) throw new Error('로그인이 필요합니다. 다시 로그인해 주세요.');

  const { data: existing, error: fetchErr } = await supabase
    .from('experiences')
    .select('id, user_id')
    .eq('id', id)
    .single();

  if (fetchErr || !existing) {
    throw new Error('체험 정보를 찾을 수 없습니다.');
  }
  if (existing.user_id !== user.id) {
    throw new Error('해당 체험을 삭제할 권한이 없습니다.');
  }

  const { error } = await supabase.from('experiences').delete().eq('id', id);
  if (error) {
    console.error('체험 삭제 실패:', error);
    throw new Error(error.message || '체험 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  return { id };
}

export async function fetchExperienceById(id: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('experiences')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('체험 상세 조회 실패:', error);
    return null;
  }

  return data;
}

export async function createTalent(data: TalentRegistrationFormData): Promise<TalentCard> {
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes?.user;

  const { summary, tags } = summarizeTalentSpecialty(data.specialty);
  const experienceYears = mapExperienceToYears(data.experience);

  // location: 선택 지역을 텍스트 배열로 저장 (서울/경기 전체 포함)
  const allSeoul = ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'];
  const allGyeonggi = ['가평군','고양시','과천시','광명시','광주시','구리시','군포시','김포시','남양주시','동두천시','부천시','성남시','수원시','시흥시','안산시','안성시','안양시','양주시','양평군','여주시','연천군','오산시','용인시','의왕시','의정부시','이천시','파주시','평택시','포천시','하남시','화성시'];
  const locations: string[] = [];
  if (data.location?.seoulAll) {
    locations.push(...allSeoul.map((s) => `서울-${s}`));
  } else if (Array.isArray(data.location?.seoul)) {
    locations.push(...data.location.seoul.map((s) => `서울-${s}`));
  }
  if (data.location?.gyeonggiAll) {
    locations.push(...allGyeonggi.map((s) => `경기-${s}`));
  } else if (Array.isArray(data.location?.gyeonggi)) {
    locations.push(...data.location.gyeonggi.map((s) => `경기-${s}`));
  }

  const insertPayload: any = {
    user_id: user?.id || null,
    name: data.name,
    specialty: summary,
    tags,
    location: locations,
    experience_years: experienceYears,
  };

  const { data: inserted, error } = await supabase
    .from('talents')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error || !inserted) {
    console.error('인력 등록 실패:', error);
    throw new Error(error?.message || '인력 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  return mapTalentToCard(inserted);
}

export interface UpdateTalentInput extends TalentRegistrationFormData {
  id: string;
}

export async function updateTalent(input: UpdateTalentInput): Promise<TalentCard> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
  const user = userRes.user;
  if (!user) throw new Error('로그인이 필요합니다.');

  // 소유권 확인
  const { data: existing, error: fetchErr } = await supabase
    .from('talents')
    .select('id, user_id')
    .eq('id', input.id)
    .single();
  if (fetchErr || !existing) throw new Error('인력 정보를 찾을 수 없습니다.');
  if (existing.user_id !== user.id) throw new Error('해당 인력을 수정할 권한이 없습니다.');

  const { summary, tags } = summarizeTalentSpecialty(input.specialty);
  const experienceYears = mapExperienceToYears(input.experience);

  const allSeoul = ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'];
  const allGyeonggi = ['가평군','고양시','과천시','광명시','광주시','구리시','군포시','김포시','남양주시','동두천시','부천시','성남시','수원시','시흥시','안산시','안성시','안양시','양주시','양평군','여주시','연천군','오산시','용인시','의왕시','의정부시','이천시','파주시','평택시','포천시','하남시','화성시'];
  const locations: string[] = [];
  if (input.location?.seoulAll) {
    locations.push(...allSeoul.map((s) => `서울-${s}`));
  } else if (Array.isArray(input.location?.seoul)) {
    locations.push(...input.location.seoul.map((s) => `서울-${s}`));
  }
  if (input.location?.gyeonggiAll) {
    locations.push(...allGyeonggi.map((s) => `경기-${s}`));
  } else if (Array.isArray(input.location?.gyeonggi)) {
    locations.push(...input.location.gyeonggi.map((s) => `경기-${s}`));
  }

  const payload: any = {
    name: input.name,
    specialty: summary,
    tags,
    location: locations,
    experience_years: experienceYears,
    phone: input.phone ?? null,
    email: input.email ?? null,
    license: input.license ?? null,
    introduction: input.introduction ?? null,
    form_payload: input,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from('talents')
    .update(payload)
    .eq('id', input.id)
    .select('*')
    .single();

  if (error || !updated) {
    console.error('인력 수정 실패:', error);
    throw new Error(error?.message || '인력 수정에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }
  return mapTalentToCard(updated);
}

export async function deleteTalent(id: string): Promise<{ id: string }> {
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인해 주세요.');
  const user = userRes.user;
  if (!user) throw new Error('로그인이 필요합니다.');

  const { data: existing, error: fetchErr } = await supabase
    .from('talents')
    .select('id, user_id')
    .eq('id', id)
    .single();
  if (fetchErr || !existing) throw new Error('인력 정보를 찾을 수 없습니다.');
  if (existing.user_id !== user.id) throw new Error('해당 인력을 삭제할 권한이 없습니다.');

  const { error: delErr } = await supabase.from('talents').delete().eq('id', id);
  if (delErr) {
    console.error('인력 삭제 실패:', delErr);
    throw new Error(delErr.message || '인력 삭제에 실패했습니다.');
  }
  return { id };
}

export async function fetchTalentById(id: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('talents')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    console.error('인력 상세 조회 실패:', error);
    return null;
  }
  return data;
}

export async function createJobPosting(input: CreateJobPostingInput) {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    console.error('사용자 정보 조회 실패:', userError);
    throw new Error('사용자 정보를 확인할 수 없습니다. 다시 로그인 후 시도해주세요.');
  }

  if (!user) {
    throw new Error('로그인이 필요합니다. 다시 로그인 후 이용해주세요.');
  }

  await ensureUserRow(user);

  const schoolLevel = summarizeSchoolLevel(input.schoolLevel);
  const location = formatLocation(input.location);
  const content = buildJobContent(input);

  // 첨부파일 업로드 (선택사항)
  let attachmentPath: string | null = null;
  let attachmentUrl: string | null = null;

  if (input.attachmentFile) {
    try {
      attachmentPath = await uploadJobAttachment(input.attachmentFile, user.id);
      // 공개 URL 생성 (만료 없음)
      const publicUrl = getJobAttachmentPublicUrl(attachmentPath);
      attachmentUrl = buildAttachmentDownloadUrl(
        publicUrl,
        buildAttachmentFilename(input.organization, input.attachmentFile.name)
      );
    } catch (uploadError) {
      console.error('첨부파일 업로드 실패:', uploadError);
      // 첨부파일 업로드 실패는 공고 등록을 막지 않음 (경고만 표시)
      const message = uploadError instanceof Error ? uploadError.message : '첨부파일 업로드에 실패했습니다.';
      console.warn(`경고: ${message}`);
      // 업로드 실패 시 attachment_url은 null로 유지
      attachmentUrl = null;
    }
  }

  // 폼 데이터 저장용 payload 생성
  const formPayload = {
    organization: input.organization,
    title: input.title,
    schoolLevel: input.schoolLevel,
    subject: input.subject,
    location: input.location,
    compensation: input.compensation,
    recruitmentStart: input.recruitmentStart,
    recruitmentEnd: input.recruitmentEnd,
    isOngoing: input.isOngoing,
    workStart: input.workStart,
    workEnd: input.workEnd,
    isNegotiable: input.isNegotiable,
    description: input.description,
    phone: input.phone,
    email: input.email
  };

  const payload = {
    user_id: user.id,
    organization: input.organization,
    title: input.title,
    location,
    content,
    compensation: input.compensation && input.compensation.trim().length > 0 ? input.compensation : null,
    deadline: input.isOngoing || !input.recruitmentEnd ? null : input.recruitmentEnd,
    school_level: schoolLevel,
    subject: input.subject && input.subject.trim().length > 0 ? input.subject : null,
    source: 'user_posted' as const,
    application_period: input.isOngoing
      ? '상시 모집'
      : `${input.recruitmentStart} ~ ${input.recruitmentEnd}`,
    work_period: input.isNegotiable
      ? '협의 가능'
      : `${input.workStart} ~ ${input.workEnd}`,
    contact: [input.phone, input.email].filter(Boolean).join(' / '),
    attachment_url: attachmentUrl,
    attachment_path: attachmentPath,
    form_payload: formPayload
  };

  const { data, error } = await supabase
    .from('job_postings')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('공고 등록 실패:', error);
    // 공고 등록 실패 시 업로드된 첨부파일 삭제
    if (attachmentPath) {
      try {
        await deleteJobAttachment(attachmentPath);
      } catch (deleteError) {
        console.error('첨부파일 삭제 실패:', deleteError);
      }
    }
    throw new Error(error.message || '공고 등록에 실패했습니다. 잠시 후 다시 시도해주세요.');
  }

  return data;
}

type RecommendationAiComment = {
  headline?: string;
  description?: string;
  diagnostics?: Record<string, unknown>;
} | null;

type RecommendationCacheRow = {
  cards: Card[] | null;
  ai_comment: RecommendationAiComment;
  profile_snapshot: Record<string, unknown> | null;
  updated_at: string;
};

// 프로모 카드 DB 행 타입
type PromoCardRow = {
  id: string;
  collection_id: string;
  order_index: number;
  insert_position: number;
  is_active: boolean;
  headline: string;
  image_url: string | null;
  background_color: string | null;
  background_color_mode: string | null;
  background_gradient_start: string | null;
  background_gradient_end: string | null;
  font_color: string | null;
  font_size: number | null;
  badge_color: string | null;
  badge_color_mode: string | null;
  badge_gradient_start: string | null;
  badge_gradient_end: string | null;
  image_scale: number | null;
  auto_play: boolean;
  duration: number;
  last_draft_at: string | null;
  last_applied_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

// DB 행을 PromoCardSettings로 변환
function mapPromoCardRow(row: PromoCardRow, collectionId: string): PromoCardSettings {
  return {
    id: collectionId,
    cardId: row.id,
    isActive: row.is_active,
    headline: row.headline,
    imageUrl: row.image_url,
    insertPosition: row.insert_position,
    backgroundColor: row.background_color ?? '#ffffff',
    backgroundColorMode: (row.background_color_mode as ColorMode) ?? 'single',
    backgroundGradientStart: row.background_gradient_start,
    backgroundGradientEnd: row.background_gradient_end,
    fontColor: row.font_color ?? '#1f2937',
    fontSize: row.font_size ?? 28,
    badgeColor: row.badge_color ?? '#dbeafe',
    badgeColorMode: (row.badge_color_mode as ColorMode) ?? 'single',
    badgeGradientStart: row.badge_gradient_start,
    badgeGradientEnd: row.badge_gradient_end,
    imageScale: typeof row.image_scale === 'number' ? row.image_scale : 1,
    autoPlay: row.auto_play,
    duration: row.duration,
    lastDraftAt: row.last_draft_at,
    lastAppliedAt: row.last_applied_at,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// 캐시 유효성 검사: 6시간 이상 지난 캐시는 무효 (Phase 1 개선: 24h → 6h)
export function isCacheValid(updatedAt: string): boolean {
  if (!updatedAt) return false;

  const now = new Date();
  const cacheTime = new Date(updatedAt);
  const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);

  // 6시간 이내만 유효 (더 자주 갱신하여 신규 공고 반영)
  return diffHours < 6;
}

// 프로필 변경 감지: 추천에 영향을 주는 필드만 비교
export function hasProfileChanged(
  cachedProfile: Record<string, unknown> | null,
  currentProfile: Record<string, unknown> | null
): boolean {
  if (!cachedProfile || !currentProfile) return true;
  
  // 추천에 영향을 주는 필드들
  const criticalFields = [
    'interest_regions',
    'teacher_level',
    'preferred_job_types',
    'preferred_subjects',
    'roles'
  ];
  
  for (const field of criticalFields) {
    const cached = JSON.stringify(cachedProfile[field]);
    const current = JSON.stringify(currentProfile[field]);
    if (cached !== current) {
      return true;
    }
  }
  
  return false;
}

/**
 * 스마트 캐시 무효화 판단 (Phase 2 개선)
 * @param cache - 캐시 데이터
 * @param profile - 현재 사용자 프로필
 * @returns 캐시를 무효화해야 하면 true
 */
export function shouldInvalidateCache(
  cache: { cards: unknown[]; updated_at: string; profile_snapshot?: Record<string, unknown> } | null,
  profile: Record<string, unknown> | null
): boolean {
  if (!cache) return true;

  const now = new Date();
  const cacheTime = new Date(cache.updated_at);

  // 조건 1: 6시간 경과 시 무효화
  const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
  if (diffHours >= 6) {
    return true;
  }

  // 조건 2: 캐시 내 마감 지난 공고가 50% 이상일 시 무효화
  const jobs = (cache.cards || []).filter((c: any) => c.type === 'job');
  if (jobs.length > 0) {
    const expired = jobs.filter((job: any) => {
      if (!job.deadline) return false;
      try {
        return new Date(job.deadline).getTime() < now.getTime();
      } catch {
        return false;
      }
    });

    // 절반 이상 만료 시 갱신 필요
    if (expired.length / jobs.length >= 0.5) {
      return true;
    }
  }

  // 조건 3: 프로필 변경 시 무효화
  if (profile && cache.profile_snapshot && hasProfileChanged(cache.profile_snapshot, profile)) {
    return true;
  }

  return false;
}

const ADJACENT_REGIONS: Record<string, string[]> = {
  '서울': ['고양', '광명', '구리', '과천', '성남', '부천'],
  '고양': ['서울', '파주', '김포', '양주'],
  '수원': ['용인', '화성', '의왕', '오산'],
  '용인': ['수원', '화성', '이천', '광주'],
  '화성': ['수원', '용인', '오산', '평택'],
  '시흥': ['안산', '부천', '광명', '인천'],
  '부천': ['서울', '시흥', '김포', '광명'],
  '인천': ['시흥', '김포', '부천', '안산'],
  '김포': ['고양', '인천', '부천'],
  '안산': ['시흥', '인천', '화성'],
  '의정부': ['서울', '양주', '포천'],
  '성남': ['서울', '용인', '하남', '광주'],
  '하남': ['서울', '성남', '남양주'],
  '남양주': ['구리', '하남', '양평'],
  '평택': ['화성', '안성', '천안'],
  '안양': ['의왕', '군포', '과천'],
  '군포': ['안양', '의왕', '안산'],
  '의왕': ['수원', '안양', '군포'],
  '오산': ['수원', '화성', '평택'],
  '광주': ['성남', '용인', '이천'],
  '이천': ['용인', '광주', '여주'],
  '여주': ['이천', '양평'],
  '양평': ['여주', '남양주'],
  '춘천': ['원주', '홍천'],
  '원주': ['이천', '춘천', '제천'],
  '청주': ['세종', '대전', '천안'],
  '대전': ['청주', '세종', '논산'],
  '천안': ['평택', '청주', '아산']
};

const REGION_FALLBACKS = ['경기도', '서울', '인천'];

export function buildRegionFilter(interestRegions: string[] | null | undefined): string[] {
  const result = new Set<string>();

  if (!interestRegions || interestRegions.length === 0) {
    REGION_FALLBACKS.forEach((region) => result.add(region));
    return Array.from(result);
  }

  interestRegions.forEach((region) => {
    if (!region) {
      return;
    }

    result.add(region);

    const adjacent = ADJACENT_REGIONS[region];
    if (adjacent) {
      adjacent.forEach((adjRegion) => result.add(adjRegion));
    }
  });

  if (result.size < 3) {
    REGION_FALLBACKS.forEach((region) => result.add(region));
  }

  return Array.from(result);
}

export function filterByTeacherLevel(
  cards: Card[],
  teacherLevel: string | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!teacherLevel) return cards;

  const normalizedLevel = teacherLevel.toLowerCase().trim();
  const jobCards = cards.filter((card) => card.type === 'job');

  if (normalizedLevel.includes('유치원')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasSignal = tags.some((tag) => tag.includes('유치원')) || title.includes('유치원');
      if (!hasSignal) return true; // 신호 없으면 포함
      return true; // 유치원 신호면 포함
    });
  }

  if (normalizedLevel.includes('초등')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasElementary = tags.some((tag) => tag.includes('초등') || tag.includes('초등학교')) || title.includes('초등');
      const hasMiddle = tags.some((tag) => tag.includes('중등') || tag.includes('중학교')) || title.includes('중등');
      const hasKindergarten = tags.some((tag) => tag.includes('유치원')) || title.includes('유치원');
      const hasSpecial = tags.some((tag) => tag.includes('특수')) || title.includes('특수');
      const hasAnySignal = hasElementary || hasMiddle || hasKindergarten || hasSpecial;
      if (!hasAnySignal) return true; // 신호 없으면 포함
      return hasElementary; // 초등 신호일 때만 포함
    });
  }

  if (normalizedLevel.includes('중등')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasElementary = tags.some((tag) => tag.includes('초등') || tag.includes('초등학교')) || title.includes('초등');
      const hasMiddle = tags.some((tag) => tag.includes('중등') || tag.includes('중학교')) || title.includes('중등');
      const hasAnySignal = hasElementary || hasMiddle;
      if (!hasAnySignal) return true; // 신호 없으면 포함
      return hasMiddle; // 중등 신호일 때만 포함
    });
  }

  if (normalizedLevel.includes('단실')) {
    return jobCards.filter((card) => {
      const title = (card.title ?? '').toLowerCase();
      const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
      const hasSignal = tags.some((tag) => tag.includes('단실') || tag.includes('단실교육')) || title.includes('단실');
      if (!hasSignal) return true; // 신호 없으면 포함
      return true; // 단실 표기된 공고 포함
    });
  }

  return cards;
}

export function filterByJobType(
  cards: Card[],
  preferredJobTypes: string[] | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!preferredJobTypes || preferredJobTypes.length === 0) return cards;

  const jobCards = cards.filter((card) => card.type === 'job');
  const normalizedTypes = preferredJobTypes.map((type) => type.toLowerCase().trim());

  return jobCards.filter((card) => {
    const title = card.title?.toLowerCase() ?? '';
    const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
    const allText = `${title} ${tags.join(' ')}`;

    return normalizedTypes.some((type) => {
      if (type.includes('기간제')) {
        return allText.includes('기간제') || allText.includes('기간');
      }
      if (type.includes('시간제')) {
        return allText.includes('시간제') || allText.includes('시간');
      }
      if (type.includes('협력수업')) {
        return allText.includes('협력') || allText.includes('협력수업');
      }
      return false;
    });
  });
}

export function calculateSubjectScore(
  card: Card,
  preferredSubjects: string[] | null | undefined
): number {
  if (!preferredSubjects || preferredSubjects.length === 0) return 0;
  if (card.type !== 'job') return 0;

  const title = card.title?.toLowerCase() ?? '';
  const tags = Array.isArray(card.tags) ? card.tags.map((t) => t.toLowerCase()) : [];
  const allText = `${title} ${tags.join(' ')}`;

  let score = 0;
  const normalizedSubjects = preferredSubjects.map((s) => s.toLowerCase().trim());

  for (const subject of normalizedSubjects) {
    if (allText.includes(subject)) {
      score += 20;
    }
  }

  return score;
}

export function filterByExperience(
  cards: Card[],
  experienceYears: number | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!experienceYears || experienceYears <= 0) return cards;

  const jobCards = cards.filter((card) => card.type === 'job') as Array<Card & { type: 'job' }>;

  return jobCards.filter((card) => {
    if (card.type !== 'job') return true;
    
    const jobCard = card as any;
    const cardContent = `${jobCard.title ?? ''} ${jobCard.detail_content ?? ''} ${(jobCard.tags ?? []).join(' ')}`.toLowerCase();
    
    // 경력 요구사항 추출 (예: "3년 이상", "5년 경력", "경력 무관")
    const experienceMatch = cardContent.match(/(\d+)\s*년\s*(?:이상|경력|근무)/);
    
    if (!experienceMatch) {
      // 경력 요구사항이 명시되지 않으면 포함
      return true;
    }
    
    const requiredExperience = parseInt(experienceMatch[1], 10);
    
    // 사용자 경력이 요구사항을 충족하면 포함 (여유 1년)
    return experienceYears + 1 >= requiredExperience;
  });
}

export function selectRecommendationCards(
  cards: Card[],
  roles: string[] | null | undefined
): Card[] {
  if (!cards || cards.length === 0) return [];
  if (!roles || roles.length === 0) return cards.slice(0, 6);

  const isTeacher = roles.some((role) =>
    role.toLowerCase().includes('교사') || role.toLowerCase().includes('선생')
  );
  const isInstructor = roles.some((role) =>
    role.toLowerCase().includes('강사') || role.toLowerCase().includes('instructor')
  );
  const isSupport = roles.some((role) =>
    role.toLowerCase().includes('기타') || role.toLowerCase().includes('행정')
  );

  if (!isTeacher && !isInstructor && !isSupport) {
    return cards.slice(0, 6);
  }

  const jobCards = cards.filter((card) => card.type === 'job');
  const talentCards = cards.filter((card) => card.type === 'talent');

  let selected: Card[] = [];

  if (isTeacher) {
    selected.push(...jobCards.slice(0, 4));
    selected.push(...talentCards.slice(0, 2));
  } else if (isInstructor) {
    selected.push(...talentCards.slice(0, 4));
    selected.push(...jobCards.slice(0, 2));
  } else if (isSupport) {
    selected.push(...jobCards.slice(0, 4));
    selected.push(...talentCards.slice(0, 2));
  }

  return selected.slice(0, 6);
}

export async function fetchRecommendationsCache(userId: string): Promise<{
  cards: Card[];
  aiComment: RecommendationAiComment;
  profileSnapshot: Record<string, unknown> | null;
  updatedAt: string;
} | null> {
  const { data, error } = await supabase
    .from('recommendations_cache')
    .select('cards, ai_comment, profile_snapshot, updated_at')
    .eq('user_id', userId)
    .maybeSingle<RecommendationCacheRow>();

  if (error) {
    console.error('추천 캐시 조회 실패:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    cards: data.cards ?? [],
    aiComment: data.ai_comment ?? null,
    profileSnapshot: data.profile_snapshot ?? null,
    updatedAt: data.updated_at
  };
}

/**
 * 최근 신규 공고 조회 (Phase 2: 하이브리드 추천)
 * @param hoursAgo - 몇 시간 전까지의 공고를 조회할지 (기본: 6시간)
 * @param limit - 최대 조회 개수 (기본: 10개)
 * @returns 신규 공고 카드 배열
 */
export async function fetchFreshJobs(hoursAgo: number = 6, limit: number = 10): Promise<Card[]> {
  try {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .gte('created_at', cutoffTime.toISOString())
      .gte('deadline', now.toISOString())  // 마감 안 지난 것만
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('신규 공고 조회 실패:', error);
      return [];
    }

    return (data || []).map(mapJobPostingToCard);
  } catch (err) {
    console.error('신규 공고 조회 예외:', err);
    return [];
  }
}

// Edge Function 호출: 프로필 기반 추천 생성
export async function generateRecommendations(): Promise<{
  cards: Card[];
  aiComment: RecommendationAiComment;
} | null> {
  try {
    // Supabase JS v2: functions.invoke 사용
    const anyClient = supabase as unknown as { functions: { invoke: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }> } };
    const { data, error } = await anyClient.functions.invoke('profile-recommendations', {
      body: {}
    });

    if (error) {
      console.error('추천 생성 실패:', error);
      return null;
    }

    const cards: Card[] = (data as any)?.cards ?? [];
    const aiComment: RecommendationAiComment = ((data as any)?.ai_comment ?? null) as RecommendationAiComment;
    return { cards, aiComment };
  } catch (e) {
    console.error('추천 생성 호출 예외:', e);
    return null;
  }
}

// 단일 프로모 카드 조회 (활성 컬렉션의 첫 번째 카드)
export async function fetchPromoCardSettings(options?: { onlyActive?: boolean }): Promise<PromoCardSettings | null> {
  const { data: collections, error: collError } = await supabase
    .from('promo_card_collections')
    .select('id, is_active')
    .eq('is_active', true)
    .limit(1);

  if (collError || !collections || collections.length === 0) {
    return null;
  }

  const collectionId = collections[0].id;

  const { data: cards, error: cardError } = await supabase
    .from('promo_cards')
    .select('*')
    .eq('collection_id', collectionId)
    .order('order_index', { ascending: true })
    .limit(1)
    .returns<PromoCardRow[]>();

  if (cardError || !cards || cards.length === 0) {
    return null;
  }

  return mapPromoCardRow(cards[0], collectionId);
}

// 여러 프로모 카드 조회 (활성 컬렉션의 모든 카드)
export async function fetchPromoCards(options?: { onlyActive?: boolean }): Promise<PromoCardSettings[]> {
  const { data: collections, error: collError } = await supabase
    .from('promo_card_collections')
    .select('id, is_active')
    .eq('is_active', true)
    .limit(1);

  if (collError || !collections || collections.length === 0) {
    return [];
  }

  const collectionId = collections[0].id;

  let query = supabase
    .from('promo_cards')
    .select('*')
    .eq('collection_id', collectionId);

  // onlyActive 옵션이 true면 활성 카드만 조회
  if (options?.onlyActive === true) {
    query = query.eq('is_active', true);
  }

  const { data: cards, error: cardError } = await query
    .order('order_index', { ascending: true })
    .returns<PromoCardRow[]>();

  if (cardError) {
    console.error('프로모 카드 조회 실패:', cardError);
    throw new Error(`프로모 카드 조회 실패: ${cardError.message}`);
  }

  if (!cards || cards.length === 0) {
    return [];
  }

  return cards.map((card) => mapPromoCardRow(card, collectionId));
}

// 프로모 카드 임시저장
export async function savePromoCardDraft(
  payload: PromoCardUpdateInput,
  options?: { userId?: string | null }
): Promise<PromoCardSettings> {
  const timestamp = new Date().toISOString();
  const userId = options?.userId ?? null;

  // 컬렉션 생성 또는 업데이트
  const { data: collectionRow, error: collectionError } = await supabase
    .from('promo_card_collections')
    .upsert(
      {
        id: payload.id,
        name: payload.headline || '프로모 카드',
        is_active: payload.isActive,
        updated_at: timestamp
      },
      { onConflict: 'id' }
    )
    .select('id')
    .single();

  if (collectionError) {
    throw collectionError;
  }

  const collectionId = collectionRow.id;

  // 기존 카드가 있으면 order_index 유지, 없으면 새로 할당
  let orderIndex = 1;
  if (payload.cardId) {
    const { data: existingCard } = await supabase
      .from('promo_cards')
      .select('order_index')
      .eq('id', payload.cardId)
      .single();

    if (existingCard) {
      orderIndex = existingCard.order_index;
    }
  }

  // 카드 upsert
  const { data: cardRow, error: cardError } = await supabase
    .from('promo_cards')
    .upsert(
      {
        id: payload.cardId,
        collection_id: collectionId,
        order_index: orderIndex,
        insert_position: payload.insertPosition,
        is_active: payload.isActive,
        headline: payload.headline,
        image_url: payload.imageUrl,
        background_color: payload.backgroundColor,
        background_color_mode: payload.backgroundColorMode,
        background_gradient_start: payload.backgroundGradientStart,
        background_gradient_end: payload.backgroundGradientEnd,
        font_color: payload.fontColor,
        font_size: payload.fontSize,
        badge_color: payload.badgeColor,
        badge_color_mode: payload.badgeColorMode,
        badge_gradient_start: payload.badgeGradientStart,
        badge_gradient_end: payload.badgeGradientEnd,
        image_scale: payload.imageScale,
        auto_play: payload.autoPlay,
        duration: payload.duration,
        last_draft_at: timestamp,
        updated_by: userId,
        updated_at: timestamp
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single<PromoCardRow>();

  if (cardError || !cardRow) {
    throw cardError || new Error('카드 저장 실패');
  }

  return mapPromoCardRow(cardRow, collectionId);
}

// 프로모 카드 적용
export async function applyPromoCardSettings(
  payload: PromoCardUpdateInput,
  options?: { userId?: string | null }
): Promise<PromoCardSettings> {
  const timestamp = new Date().toISOString();
  const userId = options?.userId ?? null;

  // 컬렉션 생성 또는 업데이트
  const { data: collectionRow, error: collectionError } = await supabase
    .from('promo_card_collections')
    .upsert(
      {
        id: payload.id,
        name: payload.headline || '프로모 카드',
        is_active: true,
        updated_at: timestamp
      },
      { onConflict: 'id' }
    )
    .select('id')
    .single();

  if (collectionError) {
    throw collectionError;
  }

  const collectionId = collectionRow.id;

  // 다른 컬렉션 비활성화
  await supabase
    .from('promo_card_collections')
    .update({ is_active: false, updated_at: timestamp })
    .neq('id', collectionId);

  // 기존 카드가 있으면 order_index 유지, 없으면 새로 할당
  let orderIndex = 1;
  if (payload.cardId) {
    const { data: existingCard } = await supabase
      .from('promo_cards')
      .select('order_index')
      .eq('id', payload.cardId)
      .single();

    if (existingCard) {
      orderIndex = existingCard.order_index;
    }
  }

  // 카드 upsert
  const { data: cardRow, error: cardError} = await supabase
    .from('promo_cards')
    .upsert(
      {
        id: payload.cardId,
        collection_id: collectionId,
        order_index: orderIndex,
        insert_position: payload.insertPosition,
        is_active: payload.isActive,
        headline: payload.headline,
        image_url: payload.imageUrl,
        background_color: payload.backgroundColor,
        background_color_mode: payload.backgroundColorMode,
        background_gradient_start: payload.backgroundGradientStart,
        background_gradient_end: payload.backgroundGradientEnd,
        font_color: payload.fontColor,
        font_size: payload.fontSize,
        badge_color: payload.badgeColor,
        badge_color_mode: payload.badgeColorMode,
        badge_gradient_start: payload.badgeGradientStart,
        badge_gradient_end: payload.badgeGradientEnd,
        image_scale: payload.imageScale,
        auto_play: payload.autoPlay,
        duration: payload.duration,
        last_applied_at: timestamp,
        updated_by: userId,
        updated_at: timestamp
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single<PromoCardRow>();

  if (cardError || !cardRow) {
    throw cardError || new Error('카드 적용 실패');
  }

  return mapPromoCardRow(cardRow, collectionId);
}

// 새 프로모 카드 생성
export async function createPromoCard(
  collectionId: string,
  data: Partial<PromoCardUpdateInput>,
  options?: { userId?: string | null }
): Promise<PromoCardSettings> {
  const timestamp = new Date().toISOString();
  const userId = options?.userId ?? null;

  // 현재 최대 order_index 조회
  const { data: maxOrderData } = await supabase
    .from('promo_cards')
    .select('order_index')
    .eq('collection_id', collectionId)
    .order('order_index', { ascending: false })
    .limit(1);

  const maxOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].order_index : 0;
  const newOrderIndex = maxOrder + 1;

  // 새 카드 생성
  const { data: cardRow, error: cardError } = await supabase
    .from('promo_cards')
    .insert({
      collection_id: collectionId,
      order_index: newOrderIndex,
      insert_position: data.insertPosition ?? 2,
      is_active: data.isActive ?? true,
      headline: data.headline ?? '새 프로모 카드',
      image_url: data.imageUrl ?? null,
      background_color: data.backgroundColor ?? '#ffffff',
      background_color_mode: data.backgroundColorMode ?? 'single',
      background_gradient_start: data.backgroundGradientStart ?? null,
      background_gradient_end: data.backgroundGradientEnd ?? null,
      font_color: data.fontColor ?? '#1f2937',
      font_size: data.fontSize ?? 24,
      badge_color: data.badgeColor ?? '#dbeafe',
      badge_color_mode: data.badgeColorMode ?? 'single',
      badge_gradient_start: data.badgeGradientStart ?? null,
      badge_gradient_end: data.badgeGradientEnd ?? null,
      image_scale: data.imageScale ?? 1,
      auto_play: data.autoPlay ?? true,
      duration: data.duration ?? 5000,
      last_draft_at: timestamp,
      updated_by: userId,
      created_at: timestamp,
      updated_at: timestamp
    })
    .select('*')
    .single<PromoCardRow>();

  if (cardError || !cardRow) {
    throw cardError || new Error('카드 생성 실패');
  }

  return mapPromoCardRow(cardRow, collectionId);
}

// 기존 프로모 카드 업데이트
export async function updatePromoCard(
  cardId: string,
  data: Partial<PromoCardUpdateInput>,
  options?: { userId?: string | null }
): Promise<PromoCardSettings> {
  const timestamp = new Date().toISOString();
  const userId = options?.userId ?? null;

  // 기존 카드 조회 (collection_id 가져오기)
  const { data: existingCard, error: fetchError } = await supabase
    .from('promo_cards')
    .select('collection_id, order_index')
    .eq('id', cardId)
    .single();

  if (fetchError || !existingCard) {
    throw new Error('카드를 찾을 수 없습니다.');
  }

  // 카드 업데이트
  const { data: cardRow, error: cardError } = await supabase
    .from('promo_cards')
    .update({
      is_active: data.isActive,
      headline: data.headline,
      image_url: data.imageUrl,
      insert_position: data.insertPosition,
      background_color: data.backgroundColor,
      background_color_mode: data.backgroundColorMode,
      background_gradient_start: data.backgroundGradientStart,
      background_gradient_end: data.backgroundGradientEnd,
      font_color: data.fontColor,
      font_size: data.fontSize,
      badge_color: data.badgeColor,
      badge_color_mode: data.badgeColorMode,
      badge_gradient_start: data.badgeGradientStart,
      badge_gradient_end: data.badgeGradientEnd,
      image_scale: data.imageScale,
      auto_play: data.autoPlay,
      duration: data.duration,
      updated_by: userId,
      updated_at: timestamp
    })
    .eq('id', cardId)
    .select('*')
    .single<PromoCardRow>();

  if (cardError || !cardRow) {
    throw cardError || new Error('카드 업데이트 실패');
  }

  return mapPromoCardRow(cardRow, existingCard.collection_id);
}

// 프로모 카드 삭제
export async function deletePromoCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('promo_cards')
    .delete()
    .eq('id', cardId);

  if (error) {
    throw error;
  }
}

// 프로모 이미지 업로드
export async function uploadPromoImage(file: File): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
  const filePath = `promo/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('promo-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('promo-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

// order_index 정규화 (연속된 번호로 재정렬)
export async function normalizeCardOrder(collectionId: string): Promise<void> {
  const timestamp = new Date().toISOString();

  try {
    // 현재 order_index 순서대로 카드 조회
    const { data: cards, error: fetchError } = await supabase
      .from('promo_cards')
      .select('id')
      .eq('collection_id', collectionId)
      .order('order_index', { ascending: true });

    if (fetchError || !cards) {
      throw fetchError || new Error('카드 조회 실패');
    }

    // 1부터 시작하는 연속된 order_index 할당
    for (let i = 0; i < cards.length; i++) {
      const { error: updateError } = await supabase
        .from('promo_cards')
        .update({ order_index: i + 1, updated_at: timestamp })
        .eq('id', cards[i].id);

      if (updateError) {
        throw updateError;
      }
    }

    console.log(`[normalizeCardOrder] ${cards.length}개 카드 정규화 완료`);
  } catch (error) {
    console.error('[normalizeCardOrder] 정규화 실패:', { collectionId, error });
    throw error;
  }
}

// 두 카드의 순서 교환 (UNIQUE 제약조건 회피를 위해 임시값 사용)
export async function swapCardOrder(cardId1: string, cardId2: string): Promise<void> {
  // 두 카드 정보 조회
  const { data: cards, error: fetchError } = await supabase
    .from('promo_cards')
    .select('id, order_index, collection_id')
    .in('id', [cardId1, cardId2]);

  if (fetchError || !cards || cards.length !== 2) {
    throw fetchError || new Error('카드 조회 실패');
  }

  const card1 = cards.find(c => c.id === cardId1);
  const card2 = cards.find(c => c.id === cardId2);

  if (!card1 || !card2) {
    throw new Error('카드를 찾을 수 없습니다');
  }

  // order_index 교환 (임시값을 사용하여 UNIQUE 제약조건 회피)
  const timestamp = new Date().toISOString();
  const tempIndex = -999; // 임시값 (음수로 충돌 방지)

  try {
    // Step 1: card1을 임시값으로 변경
    const { error: update1Error } = await supabase
      .from('promo_cards')
      .update({ order_index: tempIndex, updated_at: timestamp })
      .eq('id', cardId1);

    if (update1Error) {
      throw update1Error;
    }

    // Step 2: card2를 card1의 원래 값으로 변경
    const { error: update2Error } = await supabase
      .from('promo_cards')
      .update({ order_index: card1.order_index, updated_at: timestamp })
      .eq('id', cardId2);

    if (update2Error) {
      throw update2Error;
    }

    // Step 3: card1을 card2의 원래 값으로 변경
    const { error: update3Error } = await supabase
      .from('promo_cards')
      .update({ order_index: card2.order_index, updated_at: timestamp })
      .eq('id', cardId1);

    if (update3Error) {
      throw update3Error;
    }
  } catch (error) {
    console.error('[swapCardOrder] 순서 교환 실패:', {
      cardId1,
      cardId2,
      card1Order: card1.order_index,
      card2Order: card2.order_index,
      error
    });
    throw error;
  }
}

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const EXPERIENCE_JOB_TYPE = 'experience';
const ENABLE_SEARCH_LOGGING = true;

const getHighResolutionTime = () =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

interface SearchLogPayload {
  searchQuery: string;
  tokens: string[];
  viewType: ViewType;
  filters: SearchFilters;
  resultCount: number;
  durationMs: number;
  isError: boolean;
  errorMessage?: string;
}

export async function triggerCrawlBoardRun(boardId: string) {
  const { error } = await supabase.functions.invoke('admin-crawl-run', {
    body: { boardId },
  });

  if (error) {
    console.error('크롤 즉시 실행 실패:', error);
    throw error;
  }
}

export async function triggerCrawlBoardTest(boardId: string) {
  const { data, error } = await supabase.functions.invoke('admin-crawl-test', {
    body: { boardId },
  });

  if (error) {
    console.error('크롤 테스트 실행 실패:', error);
    throw error;
  }

  return data;
}

export interface FetchCrawlBoardsOptions {
  searchKeyword?: string;
  filterActive?: boolean | null;
  filterRegionCode?: string | null;
  filterApproved?: boolean | null;
  useSimilaritySearch?: boolean;
}

export async function fetchCrawlBoards(options?: FetchCrawlBoardsOptions): Promise<CrawlBoard[]> {
  const {
    searchKeyword,
    filterActive,
    filterRegionCode,
    filterApproved,
    useSimilaritySearch = true
  } = options || {};

  // 고급 검색 (pg_trgm + ILIKE 계층적 검색)
  if (useSimilaritySearch && (searchKeyword || filterActive !== undefined || filterRegionCode)) {
    const { data, error } = await supabase.rpc('search_crawl_boards_advanced', {
      search_text: searchKeyword || null,
      filter_active: filterActive ?? null,
      filter_region_code: filterRegionCode || null,
      similarity_threshold: 0.2
    });

    if (error) {
      console.warn('고급 검색 실패, 기본 검색으로 fallback:', error);
      // Fallback to basic search
    } else if (data) {
      return (data ?? []).map(mapCrawlBoardFromDbRow);
    }
  }

  // 기본 검색 (Fallback 또는 옵션 비활성화 시)
  let query = supabase
    .from('crawl_boards')
    .select('*');

  // 활성화 필터
  if (filterActive !== null && filterActive !== undefined) {
    query = query.eq('is_active', filterActive);
  }

  // 지역 코드 필터
  if (filterRegionCode) {
    query = query.eq('region_code', filterRegionCode);
  }

  // 승인 상태 필터
  if (filterApproved === true) {
    query = query.not('approved_at', 'is', null);
  } else if (filterApproved === false) {
    query = query.is('approved_at', null);
  }

  // 검색어 필터 (기본 ILIKE)
  if (searchKeyword) {
    query = query.or(
      `name.ilike.%${searchKeyword}%,` +
      `board_url.ilike.%${searchKeyword}%,` +
      `category.ilike.%${searchKeyword}%,` +
      `region_display_name.ilike.%${searchKeyword}%`
    );
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error('크롤 게시판 조회 실패:', error);
    throw error;
  }

  return (data ?? []).map(mapCrawlBoardFromDbRow);
}

export async function createCrawlBoard(payload: CreateCrawlBoardInput): Promise<CrawlBoard> {
  const { data, error } = await supabase
    .from('crawl_boards')
    .insert(mapCrawlBoardToDbRow(payload))
    .select('*')
    .single();

  if (error) {
    console.error('크롤 게시판 생성 실패:', error);
    throw error;
  }

  return mapCrawlBoardFromDbRow(data);
}

export async function updateCrawlBoard(
  id: string,
  payload: UpdateCrawlBoardInput
): Promise<CrawlBoard> {
  const { data, error } = await supabase
    .from('crawl_boards')
    .update(mapCrawlBoardToDbRow(payload))
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('크롤 게시판 업데이트 실패:', error);
    throw error;
  }

  return mapCrawlBoardFromDbRow(data);
}

/**
 * 크롤 게시판 승인 취소 및 관련 데이터 정리
 *
 * 다음 작업을 트랜잭션으로 수행:
 * 1. job_postings 삭제 (crawl_source_id 기준) - SERVICE_ROLE_KEY 사용
 * 2. crawl_logs 삭제 (board_id 기준) - SERVICE_ROLE_KEY 사용
 * 3. crawl_boards 승인 취소 (approved_at, approved_by NULL) - ANON_KEY
 * 4. dev_board_submissions status → 'pending' - ANON_KEY
 *
 * @param boardId - crawl_boards.id (UUID)
 * @throws Error - 삭제 또는 업데이트 실패 시
 */
export async function unapproveCrawlBoard(boardId: string): Promise<void> {
  try {
    console.log(`[unapproveCrawlBoard] Edge Function 호출 시작 (boardId=${boardId})`);

    // Edge Function 호출 (SERVICE_ROLE_KEY로 RLS 우회)
    const { data, error } = await supabase.functions.invoke(
      'unapprove-crawl-board',
      {
        body: {
          boardId,
        },
      }
    );

    if (error) {
      console.error('[unapproveCrawlBoard] Edge Function 호출 실패:', error);
      throw new Error(`승인 취소 실패: ${error.message}`);
    }

    // 응답 검증
    if (!data?.success) {
      console.error('[unapproveCrawlBoard] Edge Function 응답 오류:', data?.error);
      throw new Error(`승인 취소 실패: ${data?.error || '알 수 없는 오류'}`);
    }

    // 성공 로깅
    const result = data.data;
    console.log(`[unapproveCrawlBoard] 승인 취소 완료:`);
    console.log(`  - job_postings 삭제: ${result.jobsDeleted}개`);
    console.log(`  - crawl_logs 삭제: ${result.logsDeleted}개`);
    console.log(`  - boardId: ${result.boardId}`);
  } catch (error) {
    console.error('[unapproveCrawlBoard] 오류 발생:', error);
    throw error;
  }
}

export async function deleteCrawlBoard(boardId: string): Promise<void> {
  // 먼저 관련 데이터 삭제
  const { error: logsError } = await supabase
    .from('crawl_logs')
    .delete()
    .eq('board_id', boardId);

  if (logsError) {
    console.error('크롤 로그 삭제 실패:', logsError);
    throw logsError;
  }

  const { error: submissionsError } = await supabase
    .from('dev_board_submissions')
    .delete()
    .eq('crawl_board_id', boardId);

  if (submissionsError) {
    console.error('제출 기록 삭제 실패:', submissionsError);
    throw submissionsError;
  }

  // 게시판 삭제
  const { error: boardError } = await supabase
    .from('crawl_boards')
    .delete()
    .eq('id', boardId);

  if (boardError) {
    console.error('게시판 삭제 실패:', boardError);
    throw boardError;
  }
}

export async function fetchCrawlLogs(boardId?: string, status?: string): Promise<CrawlLog[]> {
  let query = supabase
    .from('crawl_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(200);

  if (boardId) {
    query = query.eq('board_id', boardId);
  }

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    console.error('크롤 로그 조회 실패:', error);
    throw error;
  }

  return (data ?? []).map(mapCrawlLogFromDbRow);
}

function mapCrawlBoardFromDbRow(row: any): CrawlBoard {
  return {
    id: row.id,
    name: row.name,
    boardUrl: row.board_url,
    category: row.category,
    description: row.description,
    isActive: row.is_active,
    status: row.status,
    crawlConfig: row.crawl_config ?? {},
    crawlBatchSize: row.crawl_batch_size ?? 20,
    lastCrawledAt: row.last_crawled_at,
    lastSuccessAt: row.last_success_at,
    errorCount: row.error_count ?? 0,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // Regional management fields
    regionCode: row.region_code,
    subregionCode: row.subregion_code,
    regionDisplayName: row.region_display_name,
    schoolLevel: row.school_level,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
  };
}

function mapCrawlBoardToDbRow(payload: Partial<CreateCrawlBoardInput>) {
  const mapped: Record<string, unknown> = {};

  if (payload.name !== undefined) mapped.name = payload.name;
  if (payload.boardUrl !== undefined) mapped.board_url = payload.boardUrl;
  if (payload.category !== undefined) mapped.category = payload.category;
  if (payload.description !== undefined) mapped.description = payload.description;
  if (payload.isActive !== undefined) mapped.is_active = payload.isActive;
  if (payload.status !== undefined) mapped.status = payload.status;
  if (payload.crawlConfig !== undefined) mapped.crawl_config = payload.crawlConfig ?? {};
  if (payload.crawlBatchSize !== undefined) mapped.crawl_batch_size = payload.crawlBatchSize;

  // Regional management fields
  if (payload.regionCode !== undefined) mapped.region_code = payload.regionCode;
  if (payload.subregionCode !== undefined) mapped.subregion_code = payload.subregionCode;
  if (payload.regionDisplayName !== undefined) mapped.region_display_name = payload.regionDisplayName;
  if (payload.schoolLevel !== undefined) mapped.school_level = payload.schoolLevel;

  return mapped;
}

function mapCrawlLogFromDbRow(row: any): CrawlLog {
  return {
    id: row.id,
    boardId: row.board_id,
    status: row.status,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    itemsFound: row.items_found ?? 0,
    itemsNew: row.items_new ?? 0,
    itemsSkipped: row.items_skipped ?? 0,
    aiTokensUsed: row.ai_tokens_used ?? 0,
    errorLog: row.error_log,
    createdAt: row.created_at,
  };
}

async function logSearchEvent(payload: SearchLogPayload): Promise<void> {
  if (!ENABLE_SEARCH_LOGGING) return;

  try {
    const row: Record<string, unknown> = {
      query: payload.searchQuery,
      filters: payload.filters,
      result_count: payload.resultCount
    };

    const { error } = await supabase.from('search_logs').insert(row);

    if (error) {
      console.error('검색 로그 저장 실패:', error);
    }
  } catch (error) {
    console.error('검색 로그 처리 실패:', error);
  }
}

/**
 * 크롤링된 공고 목록 가져오기
 */
export async function fetchJobPostings(limit = 20) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('공고 조회 실패:', error);
    return [];
  }

  // Supabase 데이터를 Card 타입으로 변환
  return (data ?? []).map(mapJobPostingToCard);
}

/**
 * 마감일을 "~ MM.DD" 형식으로 변환
 */
function formatDeadline(deadline: string): string {
  const date = new Date(deadline);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `~ ${month}.${day}`;
}

/**
 * D-day 계산
 */
function calculateDaysLeft(deadline: string): number | undefined {
  const today = new Date();
  const deadlineDate = new Date(deadline);
  const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : undefined;
}

/**
 * 특정 공고 상세 조회
 */
export async function fetchJobPostingById(id: string) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('공고 상세 조회 실패:', error);
    return null;
  }

  return data;
}

/**
 * 검색/필터/정렬이 적용된 카드 목록 조회
 */
export async function searchCards(params: SearchQueryParams = {}): Promise<SearchResponse> {
  const {
    searchQuery = '',
    filters: overrides,
    viewType = 'all',
    limit = DEFAULT_LIMIT,
    offset = DEFAULT_OFFSET,
    lastUpdatedAt,
  } = params;

  const filters = mergeFilters(overrides);
  const normalizedViewType: ViewType = viewType ?? 'all';
  const baseTokens = tokenizeSearchQuery(searchQuery);
  const tokenGroups = buildTokenGroups(baseTokens);
  const tokens = flattenTokenGroups(tokenGroups);
  const startedAt = getHighResolutionTime();

  try {
    let response: SearchResponse;

    if (normalizedViewType === 'all') {
      response = await executeAllSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
        lastUpdatedAt,
      });
    } else if (normalizedViewType === 'talent') {
      response = await executeTalentSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
        lastUpdatedAt,
      });
    } else if (normalizedViewType === 'experience') {
      response = await executeExperienceSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
      });
    } else {
      response = await executeJobSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
        jobType: undefined,
        lastUpdatedAt,
      });
    }

    void logSearchEvent({
      searchQuery,
      tokens,
      viewType: normalizedViewType,
      filters,
      resultCount: response.totalCount,
      durationMs: getHighResolutionTime() - startedAt,
      isError: false,
    });

    return response;
  } catch (error) {
    void logSearchEvent({
      searchQuery,
      tokens,
      viewType: normalizedViewType,
      filters,
      resultCount: 0,
      durationMs: getHighResolutionTime() - startedAt,
      isError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function mergeFilters(overrides?: Partial<SearchFilters>): SearchFilters {
  return {
    region: overrides?.region ?? DEFAULT_REGION,
    category: overrides?.category ?? DEFAULT_CATEGORY,
    sort: overrides?.sort ?? DEFAULT_SORT,
  };
}

function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

type TokenGroup = string[];

function buildTokenGroups(tokens: string[]): TokenGroup[] {
  if (tokens.length === 0) {
    return [];
  }

  const synonymMap: Record<string, string[]> = {
    // 학교급
    '중등': ['중학교', '고등학교'],
    '고등': ['고등학교'],
    '초등': ['초등학교'],
    '유치원': ['유아'],
    '특수': ['특수학교'],

    // 과목 (부분 매칭 지원)
    '일본': ['일본어', '일본인'],
    '중국': ['중국어', '중국인'],
    '영어': ['영어교육', '영어회화', '영어과'],
    '수학': ['수학교육', '수학과'],
    '과학': ['과학교육', '과학과'],
    '체육': ['체육교육', '체육과'],
    '음악': ['음악교육', '음악과'],
    '미술': ['미술교육', '미술과'],

    // 지역 (부분 매칭 지원)
    '화성': ['화성시', '화성교육지원청'],
    '수원': ['수원시', '수원교육지원청'],
    '성남': ['성남시', '성남교육지원청'],
    '고양': ['고양시', '고양교육지원청'],
    '용인': ['용인시', '용인교육지원청'],
    '부천': ['부천시', '부천교육지원청'],
    '안산': ['안산시', '안산교육지원청'],
    '남양주': ['남양주시', '남양주교육지원청'],
    '평택': ['평택시', '평택교육지원청'],
    '의정부': ['의정부시', '의정부교육지원청'],

    // 역할/직무
    '자원봉사': ['자원봉사자', '자원봉사활동'],
    '교사': ['교원', '교육자'],
    '강사': ['교강사', '외부강사']
  };

  return tokens.map((token) => {
    const variants = new Set<string>();
    variants.add(token);

    // 1. 기존 synonymMap 확장
    const synonyms = synonymMap[token];
    if (Array.isArray(synonyms)) {
      synonyms.forEach((synonym) => {
        const trimmed = synonym.trim();
        if (trimmed.length > 0) {
          variants.add(trimmed);
        }
      });
    }

    // 2. 광역시도 키워드인 경우 하위 도시들로 확장
    // 예: "경기" → 의정부, 수원, 성남, 고양 등 경기도 내 모든 도시 포함
    const provinceCities = PROVINCE_TO_CITIES[token];
    if (Array.isArray(provinceCities)) {
      // 광역시도 자체도 검색 패턴에 포함
      variants.add(token);
      variants.add(`${token}도`);
      variants.add(`${token}시`);
      // 하위 도시들 추가
      provinceCities.forEach((city) => {
        const trimmed = city.trim();
        if (trimmed.length > 0) {
          variants.add(trimmed);
        }
      });
    }

    return Array.from(variants);
  });
}

function flattenTokenGroups(groups: TokenGroup[]): string[] {
  const flattened: string[] = [];
  const seen = new Set<string>();
  groups.forEach((group) => {
    group.forEach((token) => {
      if (!seen.has(token)) {
        flattened.push(token);
        seen.add(token);
      }
    });
  });
  return flattened;
}

// 토큰 타입 정의
const TOKEN_TYPES = {
  location: [
    // 광역시도 (17개)
    ...PROVINCE_NAMES,
    // 경기도 주요 도시
    '수원', '성남', '고양', '화성', '용인', '부천', '안산', '남양주', '평택', '의정부',
    '안양', '군포', '의왕', '오산', '이천', '여주', '양평', '김포', '시흥',
    '하남', '구리', '과천', '광명', '양주', '포천', '파주', '안성', '동두천',
    // 강원도 주요 도시
    '춘천', '원주', '강릉', '동해', '태백', '속초', '삼척', '홍천', '횡성', '영월',
    '평창', '정선', '철원', '화천', '양구', '인제', '고성', '양양',
    // 충청도 주요 도시
    '청주', '충주', '제천', '천안', '아산', '논산', '공주', '보령', '서산', '당진',
    // 전라도 주요 도시
    '전주', '군산', '익산', '목포', '여수', '순천', '광양',
    // 경상도 주요 도시
    '포항', '경주', '김천', '안동', '구미', '창원', '진주', '김해', '양산',
    // 제주
    '제주시', '서귀포'
  ],
  schoolLevel: ['초등', '중등', '고등', '유치원', '특수', '초등학교', '중학교', '고등학교', '특수학교', '유아'],
  subject: [
    '수학', '영어', '과학', '체육', '음악', '미술', '국어', '사회', '역사',
    '일본', '일본어', '중국', '중국어', '영어교육', '수학교육', '과학교육',
    '체육교육', '음악교육', '미술교육', '영어과', '수학과', '과학과', '체육과',
    '음악과', '미술과', '영어회화', '일본인', '중국인'
  ],
  role: ['교사', '강사', '자원봉사', '교원', '교육자', '교강사', '외부강사', '자원봉사자', '자원봉사활동'],
};

type ClassifiedTokens = {
  location: TokenGroup[];
  schoolLevel: TokenGroup[];
  subject: TokenGroup[];
  role: TokenGroup[];
  other: TokenGroup[];
};

// 토큰 그룹을 타입별로 분류
function classifyTokenGroups(tokenGroups: TokenGroup[]): ClassifiedTokens {
  const classified: ClassifiedTokens = {
    location: [],
    schoolLevel: [],
    subject: [],
    role: [],
    other: []
  };

  for (const group of tokenGroups) {
    const firstToken = group[0].toLowerCase();
    let matched = false;

    // 지역 체크
    if (TOKEN_TYPES.location.some(k => firstToken.includes(k.toLowerCase()) || k.toLowerCase().includes(firstToken))) {
      classified.location.push(group);
      matched = true;
    }
    // 학교급 체크
    else if (TOKEN_TYPES.schoolLevel.some(k => firstToken.includes(k.toLowerCase()) || k.toLowerCase().includes(firstToken))) {
      classified.schoolLevel.push(group);
      matched = true;
    }
    // 과목 체크
    else if (TOKEN_TYPES.subject.some(k => firstToken.includes(k.toLowerCase()) || k.toLowerCase().includes(firstToken))) {
      classified.subject.push(group);
      matched = true;
    }
    // 역할 체크
    else if (TOKEN_TYPES.role.some(k => firstToken.includes(k.toLowerCase()) || k.toLowerCase().includes(firstToken))) {
      classified.role.push(group);
      matched = true;
    }

    if (!matched) {
      classified.other.push(group);
    }
  }

  return classified;
}

function normalizeToken(token: string): string {
  return token.replace(/[&|!:*<>()"\[\]]+/g, '').trim();
}

function buildWebsearchExpressionFromGroups(groups: TokenGroup[], fallbackQuery: string): string | null {
  if (groups.length === 0) {
    return null;
  }

  const expressions = groups
    .map((group) => group
      .map((token) => normalizeToken(token))
      .filter((token) => token.length > 0))
    .filter((groupTokens) => groupTokens.length > 0)
    .map((groupTokens) => (groupTokens.length > 1 ? `(${groupTokens.join(' | ')})` : groupTokens[0]));

  if (expressions.length > 0) {
    return expressions.join(' & ');
  }

  const fallback = normalizeToken(fallbackQuery);
  return fallback.length > 0 ? fallback : null;
}

function filterJobsByTokenGroups(jobs: any[], tokenGroups: TokenGroup[]): any[] {
  if (tokenGroups.length === 0) {
    return jobs;
  }

  // 토큰을 타입별로 분류
  const classified = classifyTokenGroups(tokenGroups);

  const result = jobs.filter((job) => {
    const title = (job?.title ?? '').toLowerCase();
    const organization = (job?.organization ?? '').toLowerCase();
    const location = (job?.location ?? '').toLowerCase();
    const subject = (job?.subject ?? '').toLowerCase();
    const tags = Array.isArray(job?.tags)
      ? job.tags.map((tag: string) => (tag ?? '').toLowerCase())
      : [];

    // ILIKE 쿼리와 동일한 필드 검색: title, organization, location, subject, tags
    const fields = [title, organization, location, subject, ...tags];

    // 각 타입별로 매칭 검사 (같은 타입끼리는 OR, 다른 타입끼리는 AND)

    // 지역: location 필드에서만 검색, 단어 경계 고려
    // "양구"가 "계양구"에 매칭되는 것을 방지 (양구는 강원, 계양구는 인천)
    const locationMatch = classified.location.length === 0 ||
      classified.location.some(group =>
        group.some(token => {
          const t = token.toLowerCase();
          // 단어 경계 체크: 토큰이 location의 시작이거나, 공백 뒤에 나타나야 함
          // 예: "양구군".startsWith("양구") → true
          // 예: "계양구".startsWith("양구") → false
          return location.startsWith(t) ||
                 location.includes(` ${t}`) ||
                 location === t ||
                 // organization에서도 확인 (지역명이 기관명에 포함된 경우)
                 organization.startsWith(t) ||
                 organization.includes(` ${t}`);
        })
      );

    // 학교급: 여러 학교급 중 하나라도 매칭 (OR)
    const schoolLevelMatch = classified.schoolLevel.length === 0 ||
      classified.schoolLevel.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 과목: 여러 과목 중 하나라도 매칭 (OR)
    const subjectMatch = classified.subject.length === 0 ||
      classified.subject.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 역할: 여러 역할 중 하나라도 매칭 (OR)
    const roleMatch = classified.role.length === 0 ||
      classified.role.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 기타: 기타 토큰 중 하나라도 매칭 (OR)
    const otherMatch = classified.other.length === 0 ||
      classified.other.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 모든 타입이 AND로 결합
    // "수원 중등" = 지역(수원) AND 학교급(중등) → 수원의 중등만
    // "수원 성남" = 지역(수원 OR 성남) → 수원 또는 성남
    return locationMatch && schoolLevelMatch && subjectMatch && roleMatch && otherMatch;
  });
  return result;
}

function filterTalentsByTokenGroups(talents: any[], tokenGroups: TokenGroup[]): any[] {
  if (tokenGroups.length === 0) {
    return talents;
  }

  // 토큰을 타입별로 분류
  const classified = classifyTokenGroups(tokenGroups);

  return talents.filter((talent) => {
    const name = (talent?.name ?? '').toLowerCase();
    const specialty = (talent?.specialty ?? '').toLowerCase();
    const locations = Array.isArray(talent?.location)
      ? talent.location.map((loc: string) => (loc ?? '').toLowerCase())
      : [(talent?.location ?? '').toLowerCase()];
    const tags = Array.isArray(talent?.tags)
      ? talent.tags.map((tag: string) => (tag ?? '').toLowerCase())
      : [];

    const fields = [name, specialty, ...locations, ...tags];

    // 각 타입별로 매칭 검사 (같은 타입끼리는 OR, 다른 타입끼리는 AND)

    // 지역: location 필드에서만 검색, 단어 경계 고려
    // "양구"가 "계양구"에 매칭되는 것을 방지 (양구는 강원, 계양구는 인천)
    const locationMatch = classified.location.length === 0 ||
      classified.location.some(group =>
        group.some(token => {
          const t = token.toLowerCase();
          // 단어 경계 체크: 토큰이 location의 시작이거나, 공백 뒤에 나타나야 함
          return locations.some(loc =>
            loc.startsWith(t) ||
            loc.includes(` ${t}`) ||
            loc === t
          ) ||
          // name에서도 확인 (지역명이 이름에 포함된 경우)
          name.startsWith(t) ||
          name.includes(` ${t}`);
        })
      );

    // 학교급: 여러 학교급 중 하나라도 매칭 (OR)
    const schoolLevelMatch = classified.schoolLevel.length === 0 ||
      classified.schoolLevel.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 과목: 여러 과목 중 하나라도 매칭 (OR)
    const subjectMatch = classified.subject.length === 0 ||
      classified.subject.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 역할: 여러 역할 중 하나라도 매칭 (OR)
    const roleMatch = classified.role.length === 0 ||
      classified.role.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 기타: 기타 토큰 중 하나라도 매칭 (OR)
    const otherMatch = classified.other.length === 0 ||
      classified.other.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
      );

    // 모든 타입이 AND로 결합
    // "수원 중등" = 지역(수원) AND 학교급(중등) → 수원의 중등만
    // "수원 성남" = 지역(수원 OR 성남) → 수원 또는 성남
    return locationMatch && schoolLevelMatch && subjectMatch && roleMatch && otherMatch;
  });
}

function buildWebsearchExpression(tokens: string[], fallbackQuery: string): string | null {
  const normalizedTokens = tokens
    .map((token) => token.replace(/[&|!:*<>()"\[\]]+/g, '').trim())
    .filter((token) => token.length > 0);

  const hasNonAsciiToken = normalizedTokens.some((token) => /[^\u0000-\u007F]/.test(token));

  if (!hasNonAsciiToken && normalizedTokens.length > 0) {
    return normalizedTokens.join(' & ');
  }

  const fallback = fallbackQuery.trim();
  if (fallback.length > 0 && !/[^\u0000-\u007F]/.test(fallback)) {
    return fallback;
  }

  return null;
}

function sortJobsByRelevance(jobs: any[], tokens: string[], fallbackQuery: string) {
  return [...jobs].sort((a, b) => {
    const scoreA = calculateJobRelevance(a, tokens, fallbackQuery);
    const scoreB = calculateJobRelevance(b, tokens, fallbackQuery);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const viewCountA = typeof a.view_count === 'number' ? a.view_count : 0;
    const viewCountB = typeof b.view_count === 'number' ? b.view_count : 0;
    if (viewCountA !== viewCountB) {
      return viewCountB - viewCountA;
    }
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });
}

function sortTalentsByRelevance(talents: any[], tokens: string[], fallbackQuery: string) {
  return [...talents].sort((a, b) => {
    const scoreA = calculateTalentRelevance(a, tokens, fallbackQuery);
    const scoreB = calculateTalentRelevance(b, tokens, fallbackQuery);
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }
    const ratingA = typeof a.rating === 'number' ? a.rating : 0;
    const ratingB = typeof b.rating === 'number' ? b.rating : 0;
    if (ratingA !== ratingB) {
      return ratingB - ratingA;
    }
    const reviewA = typeof a.review_count === 'number' ? a.review_count : 0;
    const reviewB = typeof b.review_count === 'number' ? b.review_count : 0;
    return reviewB - reviewA;
  });
}

function calculateJobRelevance(job: any, tokens: string[], fallbackQuery: string) {
  const normalizedTitle = (job?.title ?? '').toLowerCase();
  const normalizedOrganization = (job?.organization ?? '').toLowerCase();
  const normalizedLocation = (job?.location ?? '').toLowerCase();
  const normalizedTags = Array.isArray(job?.tags)
    ? job.tags.map((tag: string) => (tag ?? '').toLowerCase())
    : [];

  const useFallbackToken = tokens.length === 0 && fallbackQuery.trim().length > 0
    ? [fallbackQuery.trim().toLowerCase()]
    : [];

  const searchTokens = tokens.length > 0 ? tokens.map((token) => token.toLowerCase()) : useFallbackToken;

  let score = 0;

  searchTokens.forEach((token) => {
    if (!token) return;
    if (normalizedTitle === token) {
      score += 60;
    } else if (normalizedTitle.includes(token)) {
      score += 40;
    }

    if (normalizedOrganization === token) {
      score += 40;
    } else if (normalizedOrganization.includes(token)) {
      score += 25;
    }

    if (normalizedLocation.includes(token)) {
      score += 10;
    }

    if (normalizedTags.some((tag: string) => tag === token)) {
      score += 30;
    } else if (normalizedTags.some((tag: string) => tag.includes(token))) {
      score += 15;
    }
  });

  if (job?.is_urgent) {
    score += 5;
  }

  return score;
}

function calculateTalentRelevance(talent: any, tokens: string[], fallbackQuery: string) {
  const normalizedName = (talent?.name ?? '').toLowerCase();
  const normalizedSpecialty = (talent?.specialty ?? '').toLowerCase();
  const normalizedLocations = Array.isArray(talent?.location)
    ? talent.location.map((loc: string) => (loc ?? '').toLowerCase())
    : [];
  const normalizedTags = Array.isArray(talent?.tags)
    ? talent.tags.map((tag: string) => (tag ?? '').toLowerCase())
    : [];

  const useFallbackToken = tokens.length === 0 && fallbackQuery.trim().length > 0
    ? [fallbackQuery.trim().toLowerCase()]
    : [];

  const searchTokens = tokens.length > 0 ? tokens.map((token) => token.toLowerCase()) : useFallbackToken;
  let score = 0;

  searchTokens.forEach((token) => {
    if (!token) return;
    if (normalizedName === token) {
      score += 60;
    } else if (normalizedName.includes(token)) {
      score += 40;
    }

    if (normalizedSpecialty === token) {
      score += 35;
    } else if (normalizedSpecialty.includes(token)) {
      score += 20;
    }

    if (normalizedLocations.some((loc: string) => loc.includes(token))) {
      score += 10;
    }

    if (normalizedTags.some((tag: string) => tag === token)) {
      score += 25;
    } else if (normalizedTags.some((tag: string) => tag.includes(token))) {
      score += 12;
    }
  });

  return score;
}

interface AllSearchArgs {
  searchQuery: string;
  tokens: string[];
  tokenGroups: TokenGroup[];
  filters: SearchFilters;
  limit: number;
  offset: number;
  lastUpdatedAt?: number;
}

async function executeAllSearch({
  searchQuery,
  tokens,
  tokenGroups,
  filters,
  limit,
  offset,
}: AllSearchArgs): Promise<SearchResponse> {
  // job, talent, experience를 병렬로 검색
  const [jobResponse, talentResponse, experienceResponse] = await Promise.all([
    executeJobSearch({
      searchQuery,
      tokens,
      tokenGroups,
      filters,
      limit: 1000, // 충분히 큰 값으로 모든 데이터 가져오기
      offset: 0,
    }),
    executeTalentSearch({
      searchQuery,
      tokens,
      tokenGroups,
      filters,
      limit: 1000,
      offset: 0,
    }),
    executeExperienceSearch({
      searchQuery,
      tokens,
      tokenGroups,
      filters,
      limit: 1000,
      offset: 0,
    }),
  ]);

  // 모든 카드 합치기
  const allCards = [...jobResponse.cards, ...talentResponse.cards, ...experienceResponse.cards];
  const totalCount = jobResponse.totalCount + talentResponse.totalCount + experienceResponse.totalCount;

  // 정렬 적용
  let sortedCards = allCards;
  if (filters.sort === '추천순' && (tokens.length > 0 || searchQuery.trim().length > 0)) {
    // 검색 관련성 기준 정렬
    sortedCards = [...allCards].sort((a, b) => {
      const scoreA = a.type === 'job'
        ? calculateJobRelevance(a, tokens, searchQuery)
        : a.type === 'talent'
        ? calculateTalentRelevance(a, tokens, searchQuery)
        : calculateExperienceRelevance(a, tokens, searchQuery);
      const scoreB = b.type === 'job'
        ? calculateJobRelevance(b, tokens, searchQuery)
        : b.type === 'talent'
        ? calculateTalentRelevance(b, tokens, searchQuery)
        : calculateExperienceRelevance(b, tokens, searchQuery);
      return scoreB - scoreA;
    });
  } else if (filters.sort === '최신순') {
    // 최신순 정렬
    sortedCards = [...allCards].sort((a, b) => {
      const dateA = new Date((a as any).created_at ?? 0).getTime();
      const dateB = new Date((b as any).created_at ?? 0).getTime();
      return dateB - dateA;
    });
  }

  // 페이지네이션 적용
  const from = Math.max(offset ?? 0, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1);
  const paginatedCards = sortedCards.slice(from, to);

  return {
    cards: paginatedCards,
    totalCount,
    pagination: {
      limit,
      offset: from,
    }
  };
}

interface JobSearchArgs {
  searchQuery: string;
  tokens: string[];
  tokenGroups: TokenGroup[];
  filters: SearchFilters;
  limit: number;
  offset: number;
  jobType?: string;
  lastUpdatedAt?: number;
}

async function executeJobSearch({
  searchQuery,
  tokens,
  tokenGroups,
  filters,
  limit,
  offset,
  jobType,
}: JobSearchArgs): Promise<SearchResponse> {
  const trimmedQuery = searchQuery.trim();

  // 광역시도 키워드가 포함되어 있는지 확인
  // 광역시도 키워드(경기, 서울 등)가 있으면 하위 도시로 확장해야 하므로 PGroonga 대신 ILIKE 사용
  const baseTokens = trimmedQuery.split(/\s+/).filter(t => t.length > 0);
  const containsProvinceKeyword = baseTokens.some(token => PROVINCE_NAMES.includes(token));

  // PGroonga 검색 사용 (텍스트 검색이 있을 때, 단 광역시도 키워드가 없을 때만)
  if (trimmedQuery.length > 0 && !containsProvinceKeyword) {
    try {
      // PGroonga RPC 함수 호출
      const { data: pgroongaData, error: pgroongaError } = await supabase
        .rpc('search_jobs_pgroonga', { search_text: trimmedQuery });

      if (!pgroongaError && pgroongaData) {
        // PGroonga 검색 성공 - 필터 적용
        let filteredData = pgroongaData;

        // 지역 필터
        if (hasFilterValue(filters.region, DEFAULT_REGION)) {
          filteredData = filteredData.filter((job: any) =>
            job.location?.includes(filters.region)
          );
        }

        // 카테고리 필터
        if (hasFilterValue(filters.category, DEFAULT_CATEGORY)) {
          filteredData = filteredData.filter((job: any) =>
            job.tags?.includes(filters.category)
          );
        }

        // job_type 필터
        if (jobType) {
          filteredData = filteredData.filter((job: any) => job.job_type === jobType);
        }

        // 마감일 필터
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        filteredData = filteredData.filter((job: any) => {
          if (!job.deadline) return true;
          const deadline = new Date(job.deadline);
          return deadline >= today;
        });

        // 정렬 적용
        const sortedData = applySortToData(filteredData, filters.sort, tokens, trimmedQuery);

        // 페이지네이션
        const from = Math.max(offset ?? DEFAULT_OFFSET, 0);
        const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1);
        const paginatedData = sortedData.slice(from, to);

        return {
          cards: paginatedData.map(mapJobPostingToCard),
          totalCount: filteredData.length,
          pagination: { limit, offset: from }
        };
      }

      // PGroonga 실패 시 아래 fallback으로 계속
      console.warn('PGroonga 검색 실패, fallback 사용:', pgroongaError);
    } catch (err) {
      console.warn('PGroonga 검색 오류, fallback 사용:', err);
    }
  }

  // Fallback: 기존 방식 (PGroonga 실패 시 또는 검색어 없을 때)
  let query = supabase
    .from('job_postings')
    .select('*, application_period', { count: 'exact' });

  // 검색어가 있으면 ilike 사용
  if (trimmedQuery.length > 0) {
    if (tokens.length > 0) {
      const orConditions = tokens.flatMap((token) => {
        const pattern = buildIlikePattern(token);
        return ['title', 'organization', 'location', 'subject'].map((column) => `${column}.ilike.${pattern}`);
      });

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    } else {
      const pattern = buildIlikePattern(trimmedQuery);
      const orConditions = ['title', 'organization', 'location', 'subject'].map(
        (column) => `${column}.ilike.${pattern}`
      );
      query = query.or(orConditions.join(','));
    }
  }

  // 지역 필터 (검색어가 지역명이면 location 필드에서 정확하게 매칭)
  // 광역시도 전체 검색 시 해당 광역시도 내 모든 기초자치단체도 포함
  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    if (isProvinceWideSearch(filters.region)) {
      // 광역시도 전체 검색: 광역시도명 + 모든 기초자치단체명 OR 조건
      const allLocations = expandProvinceToAllCities(filters.region);
      const locationPatterns = allLocations.map(
        (loc) => `location.ilike.%${loc}%`
      );
      query = query.or(locationPatterns.join(','));
    } else {
      // 기존 로직: 특정 지역 검색 (예: "의정부", "남양주")
      const regionPattern = buildIlikePattern(filters.region);
      // OR 조건으로 지역명과 지역명+시 모두 포함
      query = query.or(`location.ilike.${regionPattern},location.ilike.%${filters.region}시%`);
    }
  }

  if (hasFilterValue(filters.category, DEFAULT_CATEGORY)) {
    query = query.contains('tags', [filters.category]);
  }

  if (jobType) {
    query = query.eq('job_type', jobType);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();
  
  query = query.or(`deadline.is.null,deadline.gte.${todayIso}`);

  query = applyJobSort(query, filters.sort);

  const from = Math.max(offset ?? DEFAULT_OFFSET, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1) - 1;

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    console.error('공고 검색 실패:', error);
    return createEmptySearchResponse(limit, offset);
  }
  
  const shouldSortByRelevance = filters.sort === '추천순' && (tokens.length > 0 || trimmedQuery.length > 0);
  const filteredData = filterJobsByTokenGroups(data, tokenGroups);
  const orderedData = shouldSortByRelevance
    ? sortJobsByRelevance(filteredData, tokens, trimmedQuery)
    : filteredData;

  return {
    cards: orderedData.map(mapJobPostingToCard),
    totalCount: count ?? orderedData.length,
    pagination: {
      limit,
      offset: from,
    }
  };
}

interface TalentSearchArgs {
  searchQuery: string;
  tokens: string[];
  tokenGroups: TokenGroup[];
  filters: SearchFilters;
  limit: number;
  offset: number;
  lastUpdatedAt?: number;
}

interface ExperienceSearchArgs {
  searchQuery: string;
  tokens: string[];
  tokenGroups: TokenGroup[];
  filters: SearchFilters;
  limit: number;
  offset: number;
}

async function executeExperienceSearch({
  searchQuery,
  tokens,
  tokenGroups,
  filters,
  limit,
  offset,
}: ExperienceSearchArgs): Promise<SearchResponse> {
  console.log('[DEBUG] executeExperienceSearch 시작:', { searchQuery, tokens, filters, limit, offset });
  
  const trimmedQuery = searchQuery.trim();

  let query = supabase
    .from('experiences')
    .select('*', { count: 'exact' })
    .eq('status', 'active');

  if (trimmedQuery.length > 0) {
    if (tokens.length > 0) {
      const orConditions = tokens.flatMap((token) => {
        const pattern = buildIlikePattern(token);
        return [
          `program_title.ilike.${pattern}`,
          `introduction.ilike.${pattern}`,
          `contact_phone.ilike.${pattern}`,
          `contact_email.ilike.${pattern}`,
          `operation_types.ilike.${pattern}`,
          `categories.ilike.${pattern}`,
          `target_school_levels.ilike.${pattern}`,
        ];
      });

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    } else {
      const pattern = buildIlikePattern(trimmedQuery);
      const orConditions = [
        `program_title.ilike.${pattern}`,
        `introduction.ilike.${pattern}`,
        `contact_phone.ilike.${pattern}`,
        `contact_email.ilike.${pattern}`,
        `operation_types.ilike.${pattern}`,
        `categories.ilike.${pattern}`,
        `target_school_levels.ilike.${pattern}`,
      ];
      query = query.or(orConditions.join(','));
    }
  }

  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    const regionPattern = buildIlikePattern(filters.region);
    query = query.or(
      `region_seoul.ilike.${regionPattern},region_gyeonggi.ilike.${regionPattern},program_title.ilike.${regionPattern}`
    );
  }

  if (hasFilterValue(filters.category, DEFAULT_CATEGORY)) {
    const categoryPattern = buildIlikePattern(filters.category);
    query = query.or(
      `categories.ilike.${categoryPattern},program_title.ilike.${categoryPattern},introduction.ilike.${categoryPattern}`
    );
  }

  query = query.order('created_at', { ascending: false });

  const from = Math.max(offset ?? DEFAULT_OFFSET, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1) - 1;

  console.log('[DEBUG] executeExperienceSearch 쿼리 범위:', { from, to });

  const { data, error, count } = await query.range(from, to);

  console.log('[DEBUG] executeExperienceSearch 결과:', { data, error, count });

  if (error || !data) {
    console.error('체험 검색 실패:', error);
    return createEmptySearchResponse(limit, offset);
  }

  const cards = data.map(mapExperienceRowToCard);
  const filteredByTokens = filterExperiencesByTokenGroups(cards, tokenGroups);
  const filteredByRegion = applyExperienceRegionFilter(filteredByTokens, filters.region);
  const filteredByCategory = applyExperienceCategoryFilter(filteredByRegion, filters.category);

  const shouldSortByRelevance = filters.sort === '추천순' && (tokens.length > 0 || trimmedQuery.length > 0);
  const orderedCards = shouldSortByRelevance
    ? sortExperiencesByRelevance(filteredByCategory, tokens, trimmedQuery)
    : filteredByCategory;

  return {
    cards: orderedCards,
    totalCount: count ?? orderedCards.length,
    pagination: {
      limit,
      offset: from,
    },
  };
}

async function executeTalentSearch({
  searchQuery,
  tokens,
  tokenGroups,
  filters,
  limit,
  offset,
}: TalentSearchArgs): Promise<SearchResponse> {
  let query = supabase
    .from('talents')
    .select('*', { count: 'exact' });

  const trimmedQuery = searchQuery.trim();

  // Phase 2: 한국어 검색 시 FTS 우선 사용 (korean config로 형태소 분석)
  const hasKorean = /[가-힣]/.test(trimmedQuery);
  let ftsApplied = false;

  if (hasKorean && trimmedQuery.length > 0) {
    // 한국어가 있으면 FTS 사용 (korean config로 형태소 분석)
    const ftsTokenGroups = tokenGroups.filter((group) => group.length === 1);
    const ftsExpression = buildWebsearchExpressionFromGroups(ftsTokenGroups, trimmedQuery);

    if (ftsExpression) {
      query = query.textSearch('search_vector', ftsExpression, {
        type: 'websearch'
        // config 제거: 트리거에서 설정한 'korean' 사용
      });
      ftsApplied = true;
    }
  }

  // FTS가 적용되지 않았거나 영문 검색인 경우에만 ilike 사용
  if (!ftsApplied) {
    if (tokens.length > 0) {
      const orConditions = tokens.flatMap((token) => {
        const pattern = buildIlikePattern(token);
        return ['name', 'specialty'].map((column) => `${column}.ilike.${pattern}`);
      });

      if (orConditions.length > 0) {
        query = query.or(orConditions.join(','));
      }
    } else if (trimmedQuery.length > 0) {
      const pattern = buildIlikePattern(trimmedQuery);
      const orConditions = ['name', 'specialty'].map((column) => `${column}.ilike.${pattern}`);
      query = query.or(orConditions.join(','));
    }
  }

  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    const regionPattern = buildIlikePattern(filters.region + '시');
    query = query.ilike('location', regionPattern);
  }

  if (hasFilterValue(filters.category, DEFAULT_CATEGORY)) {
    query = query.contains('tags', [filters.category]);
  }

  query = applyTalentSort(query, filters.sort);

  const from = Math.max(offset ?? DEFAULT_OFFSET, 0);
  const to = from + Math.max(limit ?? DEFAULT_LIMIT, 1) - 1;

  const { data, error, count } = await query.range(from, to);

  if (error || !data) {
    console.error('인력 검색 실패:', error);
    return createEmptySearchResponse(limit, offset);
  }

  const shouldSortByRelevance = filters.sort === '추천순' && (tokens.length > 0 || trimmedQuery.length > 0);
  const filteredData = filterTalentsByTokenGroups(data, tokenGroups);
  const orderedData = shouldSortByRelevance
    ? sortTalentsByRelevance(filteredData, tokens, trimmedQuery)
    : filteredData;

  return {
    cards: orderedData.map(mapTalentToCard),
    totalCount: count ?? orderedData.length,
    pagination: {
      limit,
      offset: from,
    }
  };
}

function applySortToData(data: any[], sort: SortOptionValue, tokens: string[], searchQuery: string): any[] {
  const sorted = [...data];

  switch (sort) {
    case '추천순':
      // 검색 관련성 기준 정렬
      return sortJobsByRelevance(sorted, tokens, searchQuery);

    case '마감임박순':
      return sorted.sort((a, b) => {
        const deadlineA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const deadlineB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        if (deadlineA !== deadlineB) return deadlineA - deadlineB;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });

    case '최신순':
      return sorted.sort((a, b) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );

    case '급여높은순':
      return sorted.sort((a, b) => {
        const compA = typeof a.compensation === 'number' ? a.compensation : 0;
        const compB = typeof b.compensation === 'number' ? b.compensation : 0;
        if (compA !== compB) return compB - compA;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });

    default:
      // 조회수 기준
      return sorted.sort((a, b) => {
        const viewA = typeof a.view_count === 'number' ? a.view_count : 0;
        const viewB = typeof b.view_count === 'number' ? b.view_count : 0;
        if (viewA !== viewB) return viewB - viewA;
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
      });
  }
}

function applyJobSort(query: any, sort: SortOptionValue) {
  switch (sort) {
    case '마감임박순':
      return query
        .order('deadline', { ascending: true, nullsLast: true })
        .order('created_at', { ascending: false });
    case '최신순':
      return query.order('created_at', { ascending: false });
    case '급여높은순':
      return query.order('compensation', { ascending: false, nullsLast: true });
    default:
      return query
        .order('view_count', { ascending: false, nullsLast: true })
        .order('created_at', { ascending: false });
  }
}

function applyTalentSort(query: any, sort: SortOptionValue) {
  switch (sort) {
    case '경력무관':
      return query
        .order('experience_years', { ascending: true, nullsLast: true })
        .order('rating', { ascending: false, nullsLast: true });
    case '최신순':
      return query.order('created_at', { ascending: false });
    case '평점높은순':
    case '추천순':
    default:
      return query
        .order('rating', { ascending: false, nullsLast: true })
        .order('review_count', { ascending: false, nullsLast: true });
  }
}

function buildIlikePattern(value: string) {
  const sanitized = value.replace(/[%_]/g, (match) => `\\${match}`);
  return `%${sanitized}%`;
}

function hasFilterValue(value: string, defaultValue: string) {
  return value && value !== defaultValue;
}

function createEmptySearchResponse(limit: number, offset: number): SearchResponse {
  return {
    cards: [],
    totalCount: 0,
    pagination: {
      limit,
      offset,
    }
  };
}

export function mapJobPostingToCard(job: any): JobPostingCard {
  const structured = (job?.structured_content ?? null) as StructuredJobContent | null;
  const overview = structured?.overview ?? null;
  const formPayload = job?.form_payload ?? null;
  
  // 연락처 정보 조합 (우선순위: DB contact > form_payload > structured)
  let combinedContact = job?.contact;
  if (!combinedContact && formPayload) {
    const parts = [];
    if (formPayload.phone) parts.push(formPayload.phone);
    if (formPayload.email) parts.push(formPayload.email);
    combinedContact = parts.length > 0 ? parts.join(' / ') : undefined;
  }
  if (!combinedContact) {
    combinedContact = [structured?.contact?.department, structured?.contact?.name, structured?.contact?.phone, structured?.contact?.email]
      .filter(Boolean)
      .join(' / ') || undefined;
  }

  // 근무기간 (우선순위: DB work_period > form_payload > structured)
  let workPeriod = job?.work_period || job?.work_term || overview?.work_period;
  if (!workPeriod && formPayload) {
    if (formPayload.isNegotiable) {
      workPeriod = '협의 가능';
    } else if (formPayload.workStart && formPayload.workEnd) {
      workPeriod = `${formPayload.workStart} ~ ${formPayload.workEnd}`;
    }
  }

  // 접수기간 (우선순위: DB application_period > form_payload > structured)
  let applicationPeriod = job?.application_period || overview?.application_period;
  if (!applicationPeriod && formPayload) {
    if (formPayload.isOngoing) {
      applicationPeriod = '상시 모집';
    } else if (formPayload.recruitmentStart && formPayload.recruitmentEnd) {
      applicationPeriod = `${formPayload.recruitmentStart} ~ ${formPayload.recruitmentEnd}`;
    }
  }

  return {
    id: job.id,
    type: 'job',
    isUrgent: Boolean(job.is_urgent),
    organization: job.organization || overview?.organization || '미확인 기관',
    title: job.title,
    tags: job.tags || [],
    location: job.location,
    compensation: job.compensation || '협의',
    deadline: job.deadline ? formatDeadline(job.deadline) : '상시모집',
    daysLeft: job.deadline ? calculateDaysLeft(job.deadline) : undefined,
    work_period: workPeriod,
    application_period: applicationPeriod,
    work_time: job.work_time || undefined,
    contact: combinedContact,
    detail_content: job.detail_content,
    attachment_url: (() => {
      if (!job.attachment_url) {
        return undefined;
      }
      const filename = buildAttachmentFilename(job.organization, job.attachment_url);
      // buildAttachmentDownloadUrl 함수를 통해 처리 (Edge Function 사용)
      return buildAttachmentDownloadUrl(job.attachment_url, filename) || undefined;
    })(),
    attachment_path: job.attachment_path ?? null,
    source_url: job.source_url,
    qualifications: job.qualifications || structured?.qualifications || [],
    structured_content: structured,
    user_id: job.user_id ?? null,
    source: job.source ?? null,
    form_payload: formPayload
  };
}

function mapTalentToCard(talent: any): TalentCard {
  const locationValue = formatTalentLocation(
    Array.isArray(talent.location) ? talent.location : []
  );
  const experienceYears = typeof talent.experience_years === 'number' ? talent.experience_years : 0;
  const rating = typeof talent.rating === 'number' ? Number(talent.rating) : 0;
  const reviewCount = talent.review_count ?? 0;

  return {
    id: talent.id,
    type: 'talent',
    isVerified: Boolean(talent.is_verified),
    user_id: talent.user_id ?? null,
    name: talent.name,
    specialty: talent.specialty,
    tags: talent.tags || [],
    location: locationValue,
    experience: `경력 ${experienceYears}년`,
    phone: talent.phone ?? null,
    email: talent.email ?? null,
    license: talent.license ?? null,
    introduction: talent.introduction ?? null,
    rating,
    reviewCount,
  };
}

function formatTalentLocation(locations: string[]): string {
  if (!locations || locations.length === 0) return '지역 미지정';

  // 지역을 광역시도별로 그룹화
  const seoulRegions: string[] = [];
  const gyeonggiRegions: string[] = [];
  const otherRegions: string[] = [];

  locations.forEach(loc => {
    const trimmed = loc.trim();
    if (trimmed.startsWith('서울-') || trimmed.startsWith('서울특별시-')) {
      const region = trimmed.replace(/^서울-?/, '').replace(/^서울특별시-?/, '');
      if (region) seoulRegions.push(region);
    } else if (trimmed.startsWith('경기-') || trimmed.startsWith('경기도-')) {
      const region = trimmed.replace(/^경기-?/, '').replace(/^경기도-?/, '');
      if (region) gyeonggiRegions.push(region);
    } else {
      otherRegions.push(trimmed);
    }
  });

  const parts: string[] = [];

  // 서울 지역 처리
  if (seoulRegions.length > 0) {
    if (seoulRegions.length >= 20) {
      parts.push('서울 전체');
    } else {
      parts.push(`서울/${seoulRegions.join('/')}`);
    }
  }

  // 경기 지역 처리
  if (gyeonggiRegions.length > 0) {
    if (gyeonggiRegions.length >= 25) {
      parts.push('경기 전체');
    } else {
      parts.push(gyeonggiRegions.join('/'));
    }
  }

  // 기타 지역
  if (otherRegions.length > 0) {
    parts.push(...otherRegions);
  }

  return parts.join('/') || '지역 미지정';
}

// ============================================================================
// Bookmark Functions (북마크 관련 함수)
// ============================================================================

/**
 * 사용자의 모든 북마크 ID 조회
 */
export async function fetchUserBookmarkIds(userId: string): Promise<string[]> {
  try {
    console.log('[fetchUserBookmarkIds] 🔍 시작 - userId:', userId);

    // 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[fetchUserBookmarkIds] 📌 세션 정보:', {
      sessionExists: !!session,
      sessionUserId: session?.user?.id,
      matchesProvidedUserId: session?.user?.id === userId
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .select('card_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('[fetchUserBookmarkIds] 📊 쿼리 결과:', {
      dataLength: data?.length,
      error: error,
      rawData: data
    });

    if (error) {
      console.error('[fetchUserBookmarkIds] ❌ 에러:', error);
      throw error;
    }

    const result = data?.map(b => b.card_id) || [];
    console.log('[fetchUserBookmarkIds] ✅ 반환:', result);
    return result;
  } catch (error) {
    console.error('[fetchUserBookmarkIds] 💥 북마크 조회 실패:', error);
    return [];
  }
}

/**
 * 북마크 추가
 */
export async function addBookmark(
  userId: string,
  cardId: string,
  cardType: 'job' | 'talent' | 'experience'
): Promise<void> {
  console.log('[addBookmark] 🔍 시작:', { userId, cardId, cardType });

  try {
    // 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[addBookmark] 📌 세션 정보:', {
      sessionExists: !!session,
      sessionUserId: session?.user?.id
    });

    const { data, error } = await supabase
      .from('bookmarks')
      .insert({
        user_id: userId,
        card_id: cardId,
        card_type: cardType
      })
      .select();

    console.log('[addBookmark] 📊 INSERT 결과:', { data, error });

    if (error) {
      // 중복 에러는 무시 (이미 북마크됨)
      if (error.code === '23505') {
        console.log('[addBookmark] ⚠️ 이미 북마크된 카드:', cardId);
        return;
      }
      console.error('[addBookmark] ❌ DB 에러:', error);
      console.error('[addBookmark] 에러 상세:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('[addBookmark] ✅ 북마크 추가 성공');
  } catch (error) {
    console.error('[addBookmark] 💥 예외 발생:', error);
    throw error;
  }
}

/**
 * 북마크 제거
 */
export async function removeBookmark(
  userId: string,
  cardId: string,
  cardType: 'job' | 'talent' | 'experience'
): Promise<void> {
  console.log('[removeBookmark] 시작:', { userId, cardId, cardType });
  
  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('card_id', cardId)
      .eq('card_type', cardType);

    if (error) {
      console.error('[removeBookmark] DB 에러:', error);
      console.error('[removeBookmark] 에러 상세:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('[removeBookmark] 북마크 제거 성공:', cardId);
  } catch (error) {
    console.error('[removeBookmark] 예외 발생:', error);
    throw error;
  }
}

/**
 * 북마크된 카드 데이터 조회 (모든 타입)
 */
export async function fetchBookmarkedCards(userId: string): Promise<Card[]> {
  try {
    console.log('[fetchBookmarkedCards] 🔍 시작 - userId:', userId);

    // Supabase 세션 확인
    const { data: { session } } = await supabase.auth.getSession();
    console.log('[fetchBookmarkedCards] 📌 Supabase 세션:', {
      sessionExists: !!session,
      sessionUserId: session?.user?.id,
      matchesProvidedUserId: session?.user?.id === userId
    });

    // Supabase URL 확인 (환경변수에서)
    console.log('[fetchBookmarkedCards] 🌐 Supabase URL:', import.meta.env.VITE_SUPABASE_URL);

    // 1. 사용자의 북마크 조회
    const { data: bookmarks, error: bookmarkError } = await supabase
      .from('bookmarks')
      .select('card_id, card_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    console.log('[fetchBookmarkedCards] 📊 북마크 조회 결과:', {
      bookmarksLength: bookmarks?.length,
      bookmarkError,
      rawBookmarks: bookmarks
    });

    if (bookmarkError) {
      console.error('[fetchBookmarkedCards] 북마크 조회 에러:', bookmarkError);
      throw bookmarkError;
    }

    if (!bookmarks || bookmarks.length === 0) {
      console.log('[fetchBookmarkedCards] 북마크 없음 - 빈 배열 반환');
      return [];
    }

    // 2. 카드 타입별로 그룹화
    const jobIds = bookmarks.filter(b => b.card_type === 'job').map(b => b.card_id);
    const talentIds = bookmarks.filter(b => b.card_type === 'talent').map(b => b.card_id);
    const experienceIds = bookmarks.filter(b => b.card_type === 'experience').map(b => b.card_id);

    console.log('[fetchBookmarkedCards] 카드 타입별 그룹화:', { jobIds, talentIds, experienceIds });

    const cards: Card[] = [];

    // 3. 공고 카드 조회
    if (jobIds.length > 0) {
      const { data: jobs, error: jobError } = await supabase
        .from('job_postings')
        .select('*')
        .in('id', jobIds);

      console.log('[fetchBookmarkedCards] 공고 카드 조회:', { jobs: jobs?.length, jobError });

      if (!jobError && jobs) {
        const jobCards = jobs.map(job => mapJobPostingToCard(job));
        cards.push(...jobCards);
      }
    }

    // 4. 인력 카드 조회
    if (talentIds.length > 0) {
      const { data: talents, error: talentError } = await supabase
        .from('talents')
        .select('*')
        .in('id', talentIds);

      console.log('[fetchBookmarkedCards] 인력 카드 조회:', { talents: talents?.length, talentError });

      if (!talentError && talents) {
        const talentCards = talents.map(talent => mapTalentToCard(talent));
        cards.push(...talentCards);
      }
    }

    // 5. 체험 카드 조회
    if (experienceIds.length > 0) {
      const { data: experiences, error: expError } = await supabase
        .from('experiences')
        .select('*')
        .in('id', experienceIds);

      console.log('[fetchBookmarkedCards] 체험 카드 조회:', { experiences: experiences?.length, expError });

      if (!expError && experiences) {
        const experienceCards = experiences.map(exp => mapExperienceRowToCard(exp));
        cards.push(...experienceCards);
      }
    }

    // 6. 북마크 생성일 순으로 정렬 (최신순)
    const bookmarkMap = new Map(bookmarks.map(b => [b.card_id, b.created_at]));
    cards.sort((a, b) => {
      const aTime = bookmarkMap.get(a.id) || '';
      const bTime = bookmarkMap.get(b.id) || '';
      return bTime.localeCompare(aTime);
    });

    // 7. isBookmarked 플래그 추가
    cards.forEach(card => {
      card.isBookmarked = true;
    });

    console.log('[fetchBookmarkedCards] 최종 반환 카드 수:', cards.length);

    return cards;
  } catch (error) {
    console.error('[fetchBookmarkedCards] 북마크 카드 조회 실패:', error);
    return [];
  }
}

// ========================================
// 크롤링 게시판 현황 (Admin Dashboard용)
// ========================================

export interface CrawlBoardRegionStat {
  region: string;
  boardCount: number;
  boards: Array<{
    id: string;
    name: string;
    isActive: boolean;
    lastCrawledAt: string | null;
  }>;
}

export interface TodayCrawlStatus {
  success: number;
  failed: number;
  pending: number;
  recentFailures: Array<{
    name: string;
    error: string;
    time: string;
  }>;
}

export interface CrawlBoardStats {
  total: number;
  active: number;
  inactive: number;
}

export interface CrawlBoardStatusData {
  todayStatus: TodayCrawlStatus;
  registeredBoards: CrawlBoardRegionStat[];
  boardStats: CrawlBoardStats;
}

/**
 * 17개 시도별 크롤링 게시판 현황 조회
 */
export async function fetchCrawlBoardStatusData(): Promise<CrawlBoardStatusData> {
  // 1. 승인된 게시판 목록 조회
  const { data: boards, error: boardsError } = await supabase
    .from('crawl_boards')
    .select('id, name, is_active, region_code, region_display_name, last_crawled_at, approved_at')
    .not('approved_at', 'is', null)
    .order('region_code', { ascending: true });

  if (boardsError) {
    console.error('게시판 현황 조회 실패:', boardsError);
    throw boardsError;
  }

  // 2. 오늘 크롤링 로그 조회
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { data: todayLogs, error: logsError } = await supabase
    .from('crawl_logs')
    .select('id, board_id, status, error_log, started_at, completed_at')
    .gte('started_at', todayIso)
    .order('started_at', { ascending: false });

  if (logsError) {
    console.error('오늘 크롤링 로그 조회 실패:', logsError);
    // 로그 조회 실패 시에도 게시판 현황은 표시
  }

  // 3. 지역별 게시판 그룹화
  const regionMap = new Map<string, CrawlBoardRegionStat>();
  const regionCodeToName: Record<string, string> = {
    '11': '서울', '26': '부산', '27': '대구', '28': '인천',
    '29': '광주', '30': '대전', '31': '울산', '36': '세종',
    '41': '경기', '42': '강원', '43': '충북', '44': '충남',
    '45': '전북', '46': '전남', '47': '경북', '48': '경남', '50': '제주',
  };

  (boards ?? []).forEach((board: any) => {
    const regionCode = board.region_code || 'unknown';
    const regionName = board.region_display_name?.split(' ')[0] || regionCodeToName[regionCode] || '기타';

    if (!regionMap.has(regionName)) {
      regionMap.set(regionName, {
        region: regionName,
        boardCount: 0,
        boards: [],
      });
    }

    const stat = regionMap.get(regionName)!;
    stat.boardCount += 1;
    stat.boards.push({
      id: board.id,
      name: board.name,
      isActive: board.is_active,
      lastCrawledAt: board.last_crawled_at,
    });
  });

  const registeredBoards = Array.from(regionMap.values()).sort((a, b) =>
    b.boardCount - a.boardCount
  );

  // 4. 오늘 크롤링 현황 집계
  const boardIdSet = new Set((boards ?? []).map((b: any) => b.id));
  const todayBoardLogs = new Map<string, { status: string; error?: string; time: string }>();

  (todayLogs ?? []).forEach((log: any) => {
    if (boardIdSet.has(log.board_id) && !todayBoardLogs.has(log.board_id)) {
      // 가장 최근 로그만 사용
      todayBoardLogs.set(log.board_id, {
        status: log.status,
        error: log.error_log,
        time: log.started_at,
      });
    }
  });

  let successCount = 0;
  let failedCount = 0;
  const recentFailures: TodayCrawlStatus['recentFailures'] = [];

  todayBoardLogs.forEach((logInfo, boardId) => {
    if (logInfo.status === 'success' || logInfo.status === 'completed') {
      successCount += 1;
    } else if (logInfo.status === 'error' || logInfo.status === 'failed') {
      failedCount += 1;
      const board = (boards ?? []).find((b: any) => b.id === boardId);
      if (board && recentFailures.length < 5) {
        const timeAgo = getTimeAgo(new Date(logInfo.time));
        recentFailures.push({
          name: board.name,
          error: logInfo.error || '알 수 없는 오류',
          time: timeAgo,
        });
      }
    }
  });

  // 오늘 로그가 없는 게시판 수 = pending
  const pendingCount = (boards ?? []).filter((b: any) =>
    b.is_active && !todayBoardLogs.has(b.id)
  ).length;

  // 5. 게시판 통계
  const activeCount = (boards ?? []).filter((b: any) => b.is_active).length;

  return {
    todayStatus: {
      success: successCount,
      failed: failedCount,
      pending: pendingCount,
      recentFailures,
    },
    registeredBoards,
    boardStats: {
      total: (boards ?? []).length,
      active: activeCount,
      inactive: (boards ?? []).length - activeCount,
    },
  };
}

/**
 * 시간 차이를 "N시간 전", "N분 전" 형태로 변환
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours >= 1) {
    return `${diffHours}시간 전`;
  } else if (diffMinutes >= 1) {
    return `${diffMinutes}분 전`;
  } else {
    return '방금 전';
  }
}

// ========================================
// 대시보드 분석 데이터 (DAU/WAU/MAU)
// ========================================

export interface DashboardKPI {
  dau: { value: number; change: number; trend: 'up' | 'down' };
  wau: { value: number; change: number; trend: 'up' | 'down' };
  mau: { value: number; change: number; trend: 'up' | 'down' };
  retention: { value: number; change: number; trend: 'up' | 'down' };
}

export interface HourlyVisit {
  label: string;
  value: number;
}

export interface RegionVisit {
  rank: number;
  label: string;
  value: number;
}

export interface DeviceDistribution {
  label: string;
  value: number;
  percentage: number;
  color?: string;
}

export interface DailyTraffic {
  label: string;
  value: number;
}

export interface DashboardAnalyticsData {
  kpi: DashboardKPI;
  traffic: DailyTraffic[];
  hourlyVisits: HourlyVisit[];
  deviceDistribution: DeviceDistribution[];
  regionDistribution: RegionVisit[];
}

/**
 * 대시보드 분석 데이터 조회
 * user_activity_logs 테이블 기반
 */
export async function fetchDashboardAnalytics(): Promise<DashboardAnalyticsData> {
  const now = new Date();

  // 날짜 범위 계산
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const weekAgo = new Date(todayStart);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const twoWeeksAgo = new Date(todayStart);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const monthAgo = new Date(todayStart);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const twoMonthsAgo = new Date(todayStart);
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);

  // 1. 전체 page_view 로그 조회 (최근 60일)
  const { data: logs, error: logsError } = await supabase
    .from('user_activity_logs')
    .select('id, user_id, action_type, metadata, created_at')
    .eq('action_type', 'page_view')
    .gte('created_at', twoMonthsAgo.toISOString())
    .order('created_at', { ascending: false });

  if (logsError) {
    console.error('활동 로그 조회 실패:', logsError);
    throw logsError;
  }

  const allLogs = logs ?? [];

  // 2. 세션 기반 고유 방문자 계산 (session_id 사용)
  const getUniqueVisitors = (logList: typeof allLogs, startDate: Date, endDate: Date): number => {
    const sessionsInRange = new Set<string>();
    logList.forEach(log => {
      const logDate = new Date(log.created_at);
      if (logDate >= startDate && logDate < endDate) {
        const metadata = log.metadata as Record<string, unknown> | null;
        const sessionId = (metadata?.session_id as string) || log.id;
        sessionsInRange.add(sessionId);
      }
    });
    return sessionsInRange.size;
  };

  // DAU 계산
  const dauToday = getUniqueVisitors(allLogs, todayStart, now);
  const dauYesterday = getUniqueVisitors(allLogs, yesterdayStart, todayStart);
  const dauChange = dauYesterday > 0
    ? Math.round(((dauToday - dauYesterday) / dauYesterday) * 100)
    : (dauToday > 0 ? 100 : 0);

  // WAU 계산
  const wauThisWeek = getUniqueVisitors(allLogs, weekAgo, now);
  const wauLastWeek = getUniqueVisitors(allLogs, twoWeeksAgo, weekAgo);
  const wauChange = wauLastWeek > 0
    ? Math.round(((wauThisWeek - wauLastWeek) / wauLastWeek) * 100)
    : (wauThisWeek > 0 ? 100 : 0);

  // MAU 계산
  const mauThisMonth = getUniqueVisitors(allLogs, monthAgo, now);
  const mauLastMonth = getUniqueVisitors(allLogs, twoMonthsAgo, monthAgo);
  const mauChange = mauLastMonth > 0
    ? Math.round(((mauThisMonth - mauLastMonth) / mauLastMonth) * 100)
    : (mauThisMonth > 0 ? 100 : 0);

  // 재방문율 계산 (7일 내 2회 이상 방문한 세션 비율)
  const sessionsThisWeek = new Map<string, number>();
  allLogs.forEach(log => {
    const logDate = new Date(log.created_at);
    if (logDate >= weekAgo) {
      const metadata = log.metadata as Record<string, unknown> | null;
      const sessionId = (metadata?.session_id as string) || log.id;
      sessionsThisWeek.set(sessionId, (sessionsThisWeek.get(sessionId) || 0) + 1);
    }
  });
  const totalSessions = sessionsThisWeek.size;
  const returningSessions = Array.from(sessionsThisWeek.values()).filter(count => count > 1).length;
  const retentionRate = totalSessions > 0
    ? Math.round((returningSessions / totalSessions) * 1000) / 10
    : 0;

  // 3. 일일 방문자 추이 (최근 7일)
  const traffic: DailyTraffic[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(todayStart);
    dayStart.setDate(dayStart.getDate() - i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const visitors = getUniqueVisitors(allLogs, dayStart, dayEnd);
    traffic.push({
      label: `${dayStart.getMonth() + 1}/${dayStart.getDate()}`,
      value: visitors,
    });
  }

  // 4. 시간대별 방문 분포 (최근 7일 기준)
  const hourlyVisits: HourlyVisit[] = [];
  const hourCounts = new Array(24).fill(0);
  allLogs.forEach(log => {
    const logDate = new Date(log.created_at);
    if (logDate >= weekAgo) {
      hourCounts[logDate.getHours()]++;
    }
  });
  for (let h = 0; h < 24; h++) {
    hourlyVisits.push({
      label: `${h}시`,
      value: hourCounts[h],
    });
  }

  // 5. 접속기기 분포
  let mobileCount = 0;
  let desktopCount = 0;
  allLogs.forEach(log => {
    if (log.created_at && new Date(log.created_at) >= weekAgo) {
      const metadata = log.metadata as Record<string, unknown> | null;
      const deviceType = metadata?.device_type as string | undefined;
      if (deviceType === 'mobile' || deviceType === 'tablet') {
        mobileCount++;
      } else {
        desktopCount++;
      }
    }
  });
  const totalDevices = mobileCount + desktopCount;
  const deviceDistribution: DeviceDistribution[] = [
    {
      label: '모바일',
      value: mobileCount,
      percentage: totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0,
      color: '#68B2FF',
    },
    {
      label: '데스크톱',
      value: desktopCount,
      percentage: totalDevices > 0 ? Math.round((desktopCount / totalDevices) * 100) : 0,
      color: '#7DB8A3',
    },
  ];

  // 6. 지역별 접속현황
  const regionCounts = new Map<string, number>();
  allLogs.forEach(log => {
    if (log.created_at && new Date(log.created_at) >= monthAgo) {
      const metadata = log.metadata as Record<string, unknown> | null;
      const city = metadata?.region_city as string | undefined;
      if (city) {
        // "경기도" -> "경기", "서울특별시" -> "서울" 변환
        const normalizedCity = city
          .replace(/특별시$/, '')
          .replace(/광역시$/, '')
          .replace(/도$/, '')
          .replace(/특별자치시$/, '')
          .replace(/특별자치도$/, '');
        regionCounts.set(normalizedCity, (regionCounts.get(normalizedCity) || 0) + 1);
      }
    }
  });

  const regionDistribution: RegionVisit[] = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 17)
    .map(([label, value], index) => ({
      rank: index + 1,
      label,
      value,
    }));

  return {
    kpi: {
      dau: { value: dauToday, change: dauChange, trend: dauChange >= 0 ? 'up' : 'down' },
      wau: { value: wauThisWeek, change: wauChange, trend: wauChange >= 0 ? 'up' : 'down' },
      mau: { value: mauThisMonth, change: mauChange, trend: mauChange >= 0 ? 'up' : 'down' },
      retention: { value: retentionRate, change: 0, trend: 'up' },
    },
    traffic,
    hourlyVisits,
    deviceDistribution,
    regionDistribution,
  };
}


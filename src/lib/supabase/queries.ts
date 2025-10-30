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
import type {
  Card,
  CrawlBoard,
  CrawlLog,
  CreateCrawlBoardInput,
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
  return baseUrl ? `${baseUrl}/functions/v1/download-attachment` : null;
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
  const extension = (originalFilename?.split('.').pop() || 'hwp').toLowerCase();
  return `${baseName} 공고문.${extension}`;
}

function buildAttachmentDownloadUrl(originalUrl: string | null, filename?: string) {
  if (!originalUrl) return null;

  if (isSupabaseStorageUrl(originalUrl)) {
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

  if (downloadAttachmentFunctionUrl) {
    const params = new URLSearchParams({ url: originalUrl });
    if (filename?.trim()) {
      params.set('filename', filename.trim());
    }
    return `${downloadAttachmentFunctionUrl}?${params.toString()}`;
  }

  if (!filename) return originalUrl;
  const separator = originalUrl.includes('#') ? '&' : '#';
  return `${originalUrl}${separator}filename=${encodeURIComponent(filename)}`;
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

// 캐시 유효성 검사: 24시간 이상 지난 캐시는 무효
export function isCacheValid(updatedAt: string): boolean {
  if (!updatedAt) return false;
  
  const now = new Date();
  const cacheTime = new Date(updatedAt);
  const diffHours = (now.getTime() - cacheTime.getTime()) / (1000 * 60 * 60);
  
  return diffHours < 24;
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

// 두 카드의 순서 교환
export async function swapCardOrder(cardId1: string, cardId2: string): Promise<void> {
  // 두 카드 정보 조회
  const { data: cards, error: fetchError } = await supabase
    .from('promo_cards')
    .select('id, order_index')
    .in('id', [cardId1, cardId2]);

  if (fetchError || !cards || cards.length !== 2) {
    throw fetchError || new Error('카드 조회 실패');
  }

  const card1 = cards.find(c => c.id === cardId1);
  const card2 = cards.find(c => c.id === cardId2);

  if (!card1 || !card2) {
    throw new Error('카드를 찾을 수 없습니다');
  }

  // order_index 교환
  const timestamp = new Date().toISOString();

  const { error: update1Error } = await supabase
    .from('promo_cards')
    .update({ order_index: card2.order_index, updated_at: timestamp })
    .eq('id', cardId1);

  if (update1Error) {
    throw update1Error;
  }

  const { error: update2Error } = await supabase
    .from('promo_cards')
    .update({ order_index: card1.order_index, updated_at: timestamp })
    .eq('id', cardId2);

  if (update2Error) {
    throw update2Error;
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
  useSimilaritySearch?: boolean;
}

export async function fetchCrawlBoards(options?: FetchCrawlBoardsOptions): Promise<CrawlBoard[]> {
  const {
    searchKeyword,
    filterActive,
    filterRegionCode,
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
    } else {
      response = await executeJobSearch({
        searchQuery,
        tokens,
        tokenGroups,
        filters,
        limit,
        offset,
        jobType: normalizedViewType === 'experience' ? EXPERIENCE_JOB_TYPE : undefined,
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
    const synonyms = synonymMap[token];
    if (Array.isArray(synonyms)) {
      synonyms.forEach((synonym) => {
        const trimmed = synonym.trim();
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
    '수원', '성남', '고양', '화성', '용인', '부천', '안산', '남양주', '평택', '의정부',
    '안양', '군포', '의왕', '오산', '광주', '이천', '여주', '양평', '김포', '시흥',
    '하남', '구리', '과천', '광명', '양주', '포천', '인천', '서울', '경기',
    '춘천', '원주', '홍천', '청주', '세종', '대전', '논산', '천안', '아산'
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

  return jobs.filter((job) => {
    const title = (job?.title ?? '').toLowerCase();
    const organization = (job?.organization ?? '').toLowerCase();
    const location = (job?.location ?? '').toLowerCase();
    const tags = Array.isArray(job?.tags)
      ? job.tags.map((tag: string) => (tag ?? '').toLowerCase())
      : [];

    const fields = [title, organization, location, ...tags];

    // 각 타입별로 매칭 검사 (같은 타입끼리는 OR, 다른 타입끼리는 AND)

    // 지역: 여러 지역 중 하나라도 매칭 (OR)
    const locationMatch = classified.location.length === 0 ||
      classified.location.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
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

    // 지역: 여러 지역 중 하나라도 매칭 (OR)
    const locationMatch = classified.location.length === 0 ||
      classified.location.some(group =>
        group.some(token =>
          fields.some(field => field.includes(token.toLowerCase()))
        )
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
  // job과 talent를 병렬로 검색
  const [jobResponse, talentResponse] = await Promise.all([
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
  ]);

  // 모든 카드 합치기
  const allCards = [...jobResponse.cards, ...talentResponse.cards];
  const totalCount = jobResponse.totalCount + talentResponse.totalCount;

  // 정렬 적용
  let sortedCards = allCards;
  if (filters.sort === '추천순' && (tokens.length > 0 || searchQuery.trim().length > 0)) {
    // 검색 관련성 기준 정렬
    sortedCards = [...allCards].sort((a, b) => {
      const scoreA = a.type === 'job' 
        ? calculateJobRelevance(a, tokens, searchQuery)
        : calculateTalentRelevance(a, tokens, searchQuery);
      const scoreB = b.type === 'job'
        ? calculateJobRelevance(b, tokens, searchQuery)
        : calculateTalentRelevance(b, tokens, searchQuery);
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

  // PGroonga 검색 사용 (텍스트 검색이 있을 때)
  if (trimmedQuery.length > 0) {
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

  if (hasFilterValue(filters.region, DEFAULT_REGION)) {
    const regionPattern = buildIlikePattern(filters.region + '시');
    query = query.ilike('location', regionPattern);
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
        return null;
      }
      const filename = buildAttachmentFilename(job.organization, job.attachment_url);
      if (job.source === 'user_posted') {
        return job.attachment_url;
      }
      if (downloadAttachmentFunctionUrl) {
        const params = new URLSearchParams();
        if (job.attachment_path) {
          params.set('path', job.attachment_path);
        } else {
          params.set('url', job.attachment_url);
        }
        if (filename?.trim()) {
          params.set('filename', filename.trim());
        }
        return `${downloadAttachmentFunctionUrl}?${params.toString()}`;
      }
      return job.attachment_url;
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
  const locationValue = Array.isArray(talent.location)
    ? talent.location.join('/').replace(/\/+/, '/')
    : talent.location ?? '';
  const experienceYears = typeof talent.experience_years === 'number' ? talent.experience_years : 0;
  const rating = typeof talent.rating === 'number' ? Number(talent.rating) : 0;
  const reviewCount = talent.review_count ?? 0;

  return {
    id: talent.id,
    type: 'talent',
    isVerified: Boolean(talent.is_verified),
    name: talent.name,
    specialty: talent.specialty,
    tags: talent.tags || [],
    location: locationValue,
    experience: `경력 ${experienceYears}년`,
    rating,
    reviewCount,
  };
}


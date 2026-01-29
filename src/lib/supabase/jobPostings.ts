// 공고 등록 관련 Supabase 쿼리 함수
// 작성일: 2026-01-29

import { supabase } from './client';
import type { PrimaryCategory } from '@/types/markers';

// ============================================================================
// Types
// ============================================================================

export interface JobPostingInput {
  user_id: string;
  organization: string;
  title: string;
  content?: string;
  work_period?: string;
  deadline: string;
  is_urgent?: boolean;
  latitude: number;
  longitude: number;
  location?: string;
  school_level?: string;
  primary_category: PrimaryCategory;
  sub_categories?: string[];
  contact_phone?: string;
  attachment_url?: string;
  source: 'user_posted';
}

export interface JobPosting {
  id: string;
  user_id: string | null;
  organization: string | null;
  title: string;
  content: string | null;
  work_period: string | null;
  deadline: string | null;
  is_urgent: boolean;
  latitude: number | null;
  longitude: number | null;
  location: string | null;
  school_level: string | null;
  primary_category: string | null;
  sub_categories: string[] | null;
  contact_phone: string | null;
  attachment_url: string | null;
  source: string;
  created_at: string;
  updated_at: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_EXTENSIONS = ['pdf', 'hwp', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif'];
const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB

// ============================================================================
// 첨부파일 업로드
// ============================================================================

/**
 * 공고 첨부파일 업로드
 */
export async function uploadJobAttachment(
  file: File,
  userId: string,
  postingId: string
): Promise<string> {
  // 파일 검증
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error(`허용되지 않는 파일 형식입니다. (허용: ${ALLOWED_EXTENSIONS.join(', ')})`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('파일 크기는 30MB를 초과할 수 없습니다.');
  }

  // 파일 경로: {user_id}/{posting_id}/{uuid}.{확장자}
  // 한글/공백 파일명은 Storage에서 거부되므로 UUID로 변환
  const safeFileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${userId}/${postingId}/${safeFileName}`;

  const { data, error } = await supabase.storage
    .from('job-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('uploadJobAttachment error:', error);
    throw error;
  }

  // 공개 URL 반환
  const { data: { publicUrl } } = supabase.storage
    .from('job-attachments')
    .getPublicUrl(data.path);

  return publicUrl;
}

/**
 * 공고 첨부파일 삭제
 */
export async function deleteJobAttachment(attachmentUrl: string): Promise<void> {
  // URL에서 파일 경로 추출
  const pathMatch = attachmentUrl.match(/job-attachments\/(.+)$/);
  if (!pathMatch) return;

  const filePath = pathMatch[1];

  const { error } = await supabase.storage
    .from('job-attachments')
    .remove([filePath]);

  if (error) {
    console.error('deleteJobAttachment error:', error);
    throw error;
  }
}

// ============================================================================
// 공고 CRUD
// ============================================================================

/**
 * 공고 등록
 */
export async function createJobPosting(input: JobPostingInput): Promise<JobPosting> {
  console.log('[createJobPosting] Input:', input);

  const { data, error } = await supabase
    .from('job_postings')
    .insert({
      user_id: input.user_id,
      organization: input.organization,
      title: input.title,
      content: input.content,
      work_period: input.work_period,
      deadline: input.deadline,
      is_urgent: input.is_urgent ?? false,
      latitude: input.latitude,
      longitude: input.longitude,
      location: input.location,
      school_level: input.school_level,
      primary_category: input.primary_category,
      sub_categories: input.sub_categories,
      contact: input.contact_phone, // contact 필드 사용
      attachment_url: input.attachment_url,
      source: 'user_posted'
    })
    .select()
    .single();

  if (error) {
    console.error('createJobPosting error:', error);
    throw error;
  }

  console.log('[createJobPosting] Created:', data);
  return data;
}

/**
 * 공고 수정
 */
export async function updateJobPosting(
  id: string,
  input: Partial<Omit<JobPostingInput, 'user_id' | 'source'>>
): Promise<JobPosting> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (input.organization !== undefined) updateData.organization = input.organization;
  if (input.title !== undefined) updateData.title = input.title;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.work_period !== undefined) updateData.work_period = input.work_period;
  if (input.deadline !== undefined) updateData.deadline = input.deadline;
  if (input.is_urgent !== undefined) updateData.is_urgent = input.is_urgent;
  if (input.latitude !== undefined) updateData.latitude = input.latitude;
  if (input.longitude !== undefined) updateData.longitude = input.longitude;
  if (input.location !== undefined) updateData.location = input.location;
  if (input.school_level !== undefined) updateData.school_level = input.school_level;
  if (input.primary_category !== undefined) updateData.primary_category = input.primary_category;
  if (input.sub_categories !== undefined) updateData.sub_categories = input.sub_categories;
  if (input.contact_phone !== undefined) updateData.contact = input.contact_phone;
  if (input.attachment_url !== undefined) updateData.attachment_url = input.attachment_url;

  const { data, error } = await supabase
    .from('job_postings')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateJobPosting error:', error);
    throw error;
  }

  return data;
}

/**
 * 공고 삭제
 */
export async function deleteJobPosting(id: string): Promise<void> {
  const { error } = await supabase
    .from('job_postings')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteJobPosting error:', error);
    throw error;
  }
}

/**
 * 내 공고 목록 조회 (만료 포함)
 */
export async function fetchMyJobPostings(userId: string): Promise<JobPosting[]> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('user_id', userId)
    .eq('source', 'user_posted')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchMyJobPostings error:', error);
    throw error;
  }

  return data || [];
}

/**
 * 단일 공고 조회
 */
export async function fetchJobPostingById(id: string): Promise<JobPosting | null> {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('fetchJobPostingById error:', error);
    return null;
  }

  return data;
}

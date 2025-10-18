import { supabase } from './client';
import type { Card, StructuredJobContent } from '@/types';

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
  return data.map((job): Card => {
    const structured = (job.structured_content ?? null) as StructuredJobContent | null;
    const overview = structured?.overview ?? null;
    const combinedContact = job.contact
      || [structured?.contact?.department, structured?.contact?.name, structured?.contact?.phone, structured?.contact?.email]
        .filter(Boolean)
        .join(' / ') || undefined;

    return {
      id: job.id,
      type: 'job',
      isUrgent: job.is_urgent || false,
      organization: job.organization || overview?.organization || '미확인 기관',
      title: job.title,
      tags: job.tags || [],
      location: job.location,
      compensation: job.compensation || '협의',
      deadline: job.deadline ? formatDeadline(job.deadline) : '상시모집',
      daysLeft: job.deadline ? calculateDaysLeft(job.deadline) : undefined,
      work_period: job.work_period || job.work_term || overview?.work_period || undefined,
      application_period: job.application_period || overview?.application_period || undefined,
      work_time: job.work_time || undefined,
      contact: combinedContact,
      detail_content: job.detail_content,
      attachment_url: job.attachment_url,
      source_url: job.source_url,
      qualifications: job.qualifications || structured?.qualifications || [],
      structured_content: structured,
    };
  });
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

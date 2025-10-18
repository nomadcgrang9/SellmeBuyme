import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not found in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 크롤링 소스 정보 조회 또는 생성
 */
export async function getOrCreateCrawlSource(name, baseUrl) {
  const { data: existing, error: fetchError } = await supabase
    .from('crawl_sources')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) {
    return existing.id;
  }

  const { data: created, error: createError } = await supabase
    .from('crawl_sources')
    .insert({
      name,
      base_url: baseUrl,
      parser_type: 'html',
      status: 'active'
    })
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Failed to create crawl source: ${createError.message}`);
  }

  return created.id;
}

/**
 * 공고 중복 체크 (source_url 기준)
 */
export async function isDuplicate(sourceUrl) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('id')
    .eq('source_url', sourceUrl)
    .single();

  return !!data;
}

/**
 * 공고 데이터 저장
 */
export async function saveJobPosting(jobData, crawlSourceId) {
  // 중복 체크
  if (await isDuplicate(jobData.source_url)) {
    console.log(`⏭️  중복 공고 스킵: ${jobData.title}`);
    return null;
  }

  const { data, error } = await supabase
    .from('job_postings')
    .insert({
      source: 'crawled',
      crawl_source_id: crawlSourceId,
      organization: jobData.organization,
      title: jobData.title,
      job_type: jobData.job_type,
      content: jobData.detail_content,
      detail_content: jobData.detail_content,
      tags: jobData.tags || [],
      location: jobData.location,
      compensation: jobData.compensation,
      deadline: jobData.deadline,
      is_urgent: jobData.is_urgent || false,
      source_url: jobData.source_url,
      attachment_url: jobData.attachment_url,
      application_period: jobData.application_period,
      work_period: jobData.work_period,
      work_time: jobData.work_time,
      contact: jobData.contact,
      qualifications: jobData.qualifications || [],
      structured_content: jobData.structured_content,
    })
    .select()
    .single();

  if (error) {
    console.error(`❌ 저장 실패: ${error.message}`);
    return null;
  }

  console.log(`✅ 저장 완료: ${jobData.title}`);
  return data;
}

/**
 * 크롤링 성공 시간 업데이트
 */
export async function updateCrawlSuccess(crawlSourceId) {
  await supabase
    .from('crawl_sources')
    .update({
      last_successful: new Date().toISOString(),
      error_count: 0
    })
    .eq('id', crawlSourceId);
}

/**
 * 크롤링 실패 카운트 증가
 */
export async function incrementErrorCount(crawlSourceId) {
  await supabase.rpc('increment_error_count', { source_id: crawlSourceId });
}

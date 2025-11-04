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
  // crawl_boards에서 직접 ID 가져오기 (crawl_sources 테이블은 더 이상 사용하지 않음)
  const { data: board } = await supabase
    .from('crawl_boards')
    .select('id, crawl_batch_size, region, is_local_government')
    .eq('name', name)
    .eq('status', 'active')  // is_active 대신 status 사용
    .maybeSingle();

  if (board) {
    // crawl_boards에 있으면 해당 ID 반환
    return {
      id: board.id,
      crawlBatchSize: board.crawl_batch_size ?? 10,
      region: board.region,
      isLocalGovernment: board.is_local_government,
    };
  }

  // crawl_boards에 없으면 에러 (크롤러는 반드시 crawl_boards에 등록되어야 함)
  throw new Error(`crawl_boards에 "${name}" 게시판이 없습니다. 먼저 관리자 페이지에서 등록해주세요.`);
}

/**
 * 공고 중복 체크 (source_url 기준)
 */
export async function getExistingJobBySource(sourceUrl) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('source_url', sourceUrl)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.warn(`⚠️  기존 공고 조회 실패: ${error.message}`);
  }

  return data;
}

/**
 * 공고 데이터 저장
 */
export async function saveJobPosting(jobData, crawlSourceId, hasContentImages = false) {
  // 본문 길이 검증 (300자 미만이고 본문 이미지도 없으면 정보 부족으로 간주)
  const contentLength = (jobData.detail_content || '').trim().length;
  if (contentLength < 300 && !hasContentImages) {
    console.warn(`⚠️  본문 길이 부족 & 이미지 없음으로 저장 건너뜀: ${jobData.title} (${contentLength}자)`);
    return null;
  }

  const existing = await getExistingJobBySource(jobData.source_url);

  const payload = {
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
    school_level: jobData.school_level,
    subject: jobData.subject,
    required_license: jobData.required_license,
  };

  if (existing) {
    const { data: updated, error: updateError } = await supabase
      .from('job_postings')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error(`❌ 공고 업데이트 실패: ${updateError.message}`);
      return null;
    }

    if (!updated) {
      console.warn(`⚠️  업데이트 대상 없음: ${jobData.title}`);
      return null;
    }

    console.log(`♻️  기존 공고 업데이트: ${jobData.title}`);
    return updated;
  }

  const { data, error } = await supabase
    .from('job_postings')
    .insert(payload)
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

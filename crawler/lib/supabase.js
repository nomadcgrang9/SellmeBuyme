import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not found in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// 크롤링 소스 정보 조회 또는 생성
export async function getOrCreateCrawlSource(config) {
  const { name, baseUrl, region, isLocalGovernment } = config;

  // 1. URL로 먼저 검색 (이미 등록된 URL인지 확인)
  let { data: board } = await supabase
    .from('crawl_boards')
    .select('id, crawl_batch_size, region, is_local_government, name')
    .eq('board_url', baseUrl)
    .maybeSingle();

  // 2. 없으면 이름으로 검색
  if (!board) {
    const { data: boardByName } = await supabase
      .from('crawl_boards')
      .select('id, crawl_batch_size, region, is_local_government, name')
      .eq('name', name)
      .maybeSingle();
    board = boardByName;
  }

  if (board) {
    console.log(`✅ 기존 게시판 사용: ${board.name} (ID: ${board.id})`);
    return {
      id: board.id,
      crawlBatchSize: board.crawl_batch_size ?? 10,
      region: board.region,
      isLocalGovernment: board.is_local_government,
    };
  }

  // 없으면 새로 생성
  console.log(`✨ 새 게시판 생성 중: ${name}`);
  const { data: newBoard, error } = await supabase
    .from('crawl_boards')
    .insert({
      name: name,
      board_url: baseUrl,
      region: region || '기타',
      is_local_government: isLocalGovernment || false,
      crawl_batch_size: 10,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    throw new Error(`게시판 생성 실패: ${error.message}`);
  }

  return {
    id: newBoard.id,
    crawlBatchSize: newBoard.crawl_batch_size,
    region: newBoard.region,
    isLocalGovernment: newBoard.is_local_government
  };
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
    crawl_board_id: crawlSourceId,  // 수정: crawl_source_id → crawl_board_id (DB 스키마와 일치)
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

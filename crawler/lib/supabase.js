import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// VITE_ prefix 변수들도 지원 (프론트엔드와 동일한 .env 사용)
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// SERVICE_ROLE_KEY를 우선 사용 (RLS 우회), 없으면 ANON_KEY 폴백
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase credentials not found in .env file. Required: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 지역명 정규화 함수
 * 규칙 2: '도', '시' 같은 구분명 제외
 * 예외: '중구', '남구', '서구' 등 '구' 자체가 이름인 경우
 */
export function normalizeLocation(location) {
  if (!location || location === '미상') return null;

  let normalized = location.trim();

  // 예외 케이스: 구 자체가 이름인 경우 (중구, 남구, 서구, 북구, 동구, 수성구 등)
  const guExceptions = ['중구', '남구', '서구', '북구', '동구', '수성구', '달서구', '달성군', '해운대구', '사하구', '강서구', '연제구', '수영구', '사상구', '기장군', '유성구', '대덕구', '서초구', '강남구', '송파구', '강동구', '마포구', '용산구', '종로구', '성북구', '광진구', '동대문구', '중랑구', '성동구', '금천구', '영등포구', '동작구', '관악구', '서대문구', '은평구', '노원구', '도봉구', '강북구', '양천구', '구로구'];

  if (guExceptions.includes(normalized)) {
    return normalized;
  }

  // 광역시/특별시/특별자치시/특별자치도 처리
  // "광주광역시" → "광주광역", "부산광역시" → "부산"
  // "제주특별자치도" → "제주", "세종특별자치시" → "세종"
  const metropolitanPatterns = [
    { pattern: /^(.+)특별자치도$/, replacement: '$1' },     // 제주특별자치도 → 제주
    { pattern: /^(.+)특별자치시$/, replacement: '$1' },     // 세종특별자치시 → 세종
    { pattern: /^(.+)광역시$/, replacement: '$1' },         // 부산광역시 → 부산
    { pattern: /^(.+)특별시$/, replacement: '$1' },         // 서울특별시 → 서울
  ];

  for (const { pattern, replacement } of metropolitanPatterns) {
    if (pattern.test(normalized)) {
      normalized = normalized.replace(pattern, replacement);
      break;
    }
  }

  // 일반 시/도/군 접미사 제거
  // "성남시" → "성남", "경기도" → "경기", "양평군" → "양평"
  // 단, 2글자 이하로 남으면 제거하지 않음 (예: "시흥시" → "시흥")
  const suffixPatterns = [
    { pattern: /^(.{2,})시$/, replacement: '$1' },   // 성남시 → 성남
    { pattern: /^(.{2,})도$/, replacement: '$1' },   // 경기도 → 경기
    { pattern: /^(.{2,})군$/, replacement: '$1' },   // 양평군 → 양평
  ];

  for (const { pattern, replacement } of suffixPatterns) {
    if (pattern.test(normalized)) {
      const result = normalized.replace(pattern, replacement);
      // 최소 2글자 이상 남아야 함
      if (result.length >= 2) {
        normalized = result;
        break;
      }
    }
  }

  // 공백 제거 (예: "경기 안성" → "안성" - 기초자치단체만 남김)
  if (normalized.includes(' ')) {
    const parts = normalized.split(' ');
    // 마지막 부분이 기초자치단체일 가능성이 높음
    normalized = parts[parts.length - 1];
    // 다시 접미사 제거 적용
    for (const { pattern, replacement } of suffixPatterns) {
      if (pattern.test(normalized)) {
        const result = normalized.replace(pattern, replacement);
        if (result.length >= 2) {
          normalized = result;
          break;
        }
      }
    }
  }

  // "강원특별자치" 같이 불완전한 경우 처리
  if (normalized === '강원특별자치') {
    normalized = '강원';
  }

  return normalized || null;
}

/**
 * 광역자치단체 정규화
 */
export function normalizeMetropolitanRegion(region) {
  if (!region) return null;

  let normalized = region.trim();

  // 광역자치단체 정규화
  const mappings = {
    '서울특별시': '서울',
    '서울': '서울',
    '부산광역시': '부산',
    '부산': '부산',
    '대구광역시': '대구',
    '대구': '대구',
    '인천광역시': '인천',
    '인천': '인천',
    '광주광역시': '광주',
    '광주': '광주',
    '대전광역시': '대전',
    '대전': '대전',
    '울산광역시': '울산',
    '울산': '울산',
    '세종특별자치시': '세종',
    '세종': '세종',
    '경기도': '경기',
    '경기': '경기',
    '강원특별자치도': '강원',
    '강원도': '강원',
    '강원': '강원',
    '충청북도': '충북',
    '충북': '충북',
    '충청남도': '충남',
    '충남': '충남',
    '전라북도': '전북',
    '전북': '전북',
    '전라남도': '전남',
    '전남': '전남',
    '경상북도': '경북',
    '경북': '경북',
    '경상남도': '경남',
    '경남': '경남',
    '제주특별자치도': '제주',
    '제주': '제주',
  };

  return mappings[normalized] || normalized;
}

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
  // 본문 길이 검증 (300자 미만이고 본문 이미지도 없고 첨부파일도 없으면 정보 부족으로 간주)
  // 첨부파일이 있는 경우 본문 길이 조건 완화 (첨부파일에 상세 정보가 있는 경우가 많음)
  const contentLength = (jobData.detail_content || '').trim().length;
  const hasAttachment = !!(jobData.attachment_url);

  if (contentLength < 300 && !hasContentImages && !hasAttachment) {
    console.warn(`⚠️  본문 길이 부족 & 이미지/첨부파일 없음으로 저장 건너뜀: ${jobData.title} (${contentLength}자)`);
    return null;
  }

  // 첨부파일만 있고 본문이 매우 짧은 경우 로깅 (정보 참고용)
  if (contentLength < 300 && hasAttachment) {
    console.log(`📎 본문 짧지만 첨부파일 있음 - 저장 진행: ${jobData.title} (${contentLength}자)`);
  }

  const existing = await getExistingJobBySource(jobData.source_url);

  // 규칙 2: location 정규화 ('시', '도' 등 접미사 제거)
  const normalizedLocation = normalizeLocation(jobData.location);
  const normalizedMetroRegion = normalizeMetropolitanRegion(jobData.metropolitan_region);

  const payload = {
    source: 'crawled',
    crawl_board_id: crawlSourceId,  // 수정: crawl_source_id → crawl_board_id (DB 스키마와 일치)
    organization: jobData.organization,
    title: jobData.title,
    job_type: jobData.job_type,
    content: jobData.detail_content,
    detail_content: jobData.detail_content,
    tags: jobData.tags || [],
    location: normalizedLocation,  // 정규화된 기초자치단체
    // metropolitan_region: normalizedMetroRegion,  // TODO: Supabase에 컬럼 추가 후 활성화
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

  // 광역자치단체를 structured_content에 임시 저장 (컬럼 추가 전까지)
  if (normalizedMetroRegion && payload.structured_content) {
    payload.structured_content = {
      ...payload.structured_content,
      metropolitan_region: normalizedMetroRegion,
    };
  } else if (normalizedMetroRegion) {
    payload.structured_content = { metropolitan_region: normalizedMetroRegion };
  }

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
 * 크롤링 성공 시간 업데이트 (crawl_boards 테이블)
 * @param {string} crawlBoardId - crawl_boards 테이블의 ID
 * @param {object} stats - 크롤링 통계 (선택적)
 */
export async function updateCrawlSuccess(crawlBoardId, stats = {}) {
  const now = new Date().toISOString();

  // 1. crawl_boards 테이블의 last_crawled_at 업데이트
  const { error: boardError } = await supabase
    .from('crawl_boards')
    .update({
      last_crawled_at: now
    })
    .eq('id', crawlBoardId);

  if (boardError) {
    console.warn(`⚠️ crawl_boards 업데이트 실패: ${boardError.message}`);
  } else {
    console.log(`✅ crawl_boards.last_crawled_at 업데이트 완료 (board_id: ${crawlBoardId})`);
  }

  // 2. crawl_logs 테이블에 성공 로그 기록
  const { error: logError } = await supabase
    .from('crawl_logs')
    .insert({
      board_id: crawlBoardId,
      status: 'success',
      started_at: now,
      completed_at: now,
    });

  if (logError) {
    console.warn(`⚠️ crawl_logs 기록 실패: ${logError.message}`);
  } else {
    console.log(`✅ crawl_logs 성공 기록 완료`);
  }

  // 통계 정보 로깅
  if (stats.jobsFound !== undefined) {
    console.log(`📊 크롤링 통계: 발견 ${stats.jobsFound}개, 저장 ${stats.jobsSaved || 0}개, 스킵 ${stats.jobsSkipped || 0}개`);
  }
}

/**
 * 크롤링 실패 기록 (crawl_boards + crawl_logs)
 * @param {string} crawlBoardId - crawl_boards 테이블의 ID
 * @param {string} errorMessage - 오류 메시지
 */
export async function recordCrawlFailure(crawlBoardId, errorMessage) {
  const now = new Date().toISOString();

  // 1. crawl_boards 테이블 업데이트
  const { error: boardError } = await supabase
    .from('crawl_boards')
    .update({
      last_crawled_at: now
    })
    .eq('id', crawlBoardId);

  if (boardError) {
    console.warn(`⚠️ crawl_boards 실패 업데이트 오류: ${boardError.message}`);
  }

  // 2. crawl_logs 테이블에 실패 로그 기록
  const { error: logError } = await supabase
    .from('crawl_logs')
    .insert({
      board_id: crawlBoardId,
      status: 'failed',
      started_at: now,
      completed_at: now,
      error_log: errorMessage,
    });

  if (logError) {
    console.warn(`⚠️ crawl_logs 실패 기록 오류: ${logError.message}`);
  }

  console.log(`❌ 크롤링 실패 기록 완료 (board_id: ${crawlBoardId}, error: ${errorMessage})`);
}

/**
 * 크롤링 실패 카운트 증가 (deprecated - recordCrawlFailure 사용)
 */
export async function incrementErrorCount(crawlSourceId) {
  // 구버전 호환성 유지
  await recordCrawlFailure(crawlSourceId, 'Unknown error');
}

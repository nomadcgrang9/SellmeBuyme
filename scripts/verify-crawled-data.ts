import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const TARGET_BOARDS = [
  { id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb', name: '의정부교육지원청 구인' },
  { id: '5a94f47d-5feb-4821-99af-f8805cc3d619', name: '성남교육지원청 구인' },
  { id: 'f4c852f1-f49a-42c5-8823-0edd346f99bb', name: '경기도 교육청 구인정보조회' },
];

async function verifyData() {
  console.log('🔍 DB 직접 조회 - 성남/의정부/경기도 게시판 크롤링 데이터 확인\n');

  // 1. crawl_sources에서 소스 ID 찾기
  console.log('📋 Step 1: crawl_sources 조회');
  const { data: sources } = await supabase
    .from('crawl_sources')
    .select('id, source_name')
    .in('source_name', TARGET_BOARDS.map(b => b.name));

  if (!sources || sources.length === 0) {
    console.log('❌ crawl_sources에 등록된 소스 없음\n');
  } else {
    console.log(`✅ crawl_sources 발견: ${sources.length}개`);
    sources.forEach(s => console.log(`   - ${s.source_name} (${s.id})`));
    console.log('');
  }

  const sourceIds = sources?.map(s => s.id) || [];

  // 2. job_postings 전체 개수 확인
  console.log('📊 Step 2: job_postings 전체 개수 확인');
  for (const board of TARGET_BOARDS) {
    const boardSources = sources?.filter(s => s.source_name === board.name);

    if (!boardSources || boardSources.length === 0) {
      console.log(`❌ [${board.name}]`);
      console.log(`   crawl_sources에 소스 없음 → job_postings도 없을 것\n`);
      continue;
    }

    const boardSourceIds = boardSources.map(s => s.id);

    const { count, error } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true })
      .in('crawl_source_id', boardSourceIds);

    if (error) {
      console.log(`❌ [${board.name}] 조회 실패:`, error.message);
      continue;
    }

    console.log(`📋 [${board.name}]`);
    console.log(`   총 포스팅 수: ${count || 0}개`);

    if (count && count > 0) {
      // 최근 5개 포스팅 정보
      const { data: recentPosts } = await supabase
        .from('job_postings')
        .select('title, created_at, deadline')
        .in('crawl_source_id', boardSourceIds)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentPosts && recentPosts.length > 0) {
        console.log(`   최근 포스팅 예시 (최대 5개):`);
        recentPosts.forEach(p => {
          console.log(`     - ${p.title}`);
          console.log(`       등록: ${new Date(p.created_at).toLocaleString('ko-KR')}`);
          console.log(`       마감: ${p.deadline || 'N/A'}`);
        });
      }
    }
    console.log('');
  }

  // 3. 날짜별 크롤링 결과 (10월 29, 30, 31일)
  console.log('📅 Step 3: 10월 29, 30, 31일 크롤링 데이터 확인');

  const targetDates = [
    { date: '2025-10-29', label: '10월 29일' },
    { date: '2025-10-30', label: '10월 30일' },
    { date: '2025-10-31', label: '10월 31일' },
  ];

  for (const { date, label } of targetDates) {
    console.log(`\n🗓️  ${label} (${date})`);

    // crawl_logs 확인
    const { data: logs } = await supabase
      .from('crawl_logs')
      .select('board_id, status, items_found, items_saved, created_at')
      .in('board_id', TARGET_BOARDS.map(b => b.id))
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59`)
      .order('created_at', { ascending: false });

    if (!logs || logs.length === 0) {
      console.log(`   ❌ crawl_logs 없음 (크롤링 실행 안됨)`);
      continue;
    }

    console.log(`   ✅ crawl_logs 발견: ${logs.length}개 실행 기록`);

    for (const log of logs) {
      const board = TARGET_BOARDS.find(b => b.id === log.board_id);
      console.log(`     [${board?.name || 'Unknown'}]`);
      console.log(`       상태: ${log.status}`);
      console.log(`       발견: ${log.items_found || 0}개 / 저장: ${log.items_saved || 0}개`);
      console.log(`       시각: ${new Date(log.created_at).toLocaleString('ko-KR')}`);
    }

    // job_postings 확인 (해당 날짜에 created_at)
    if (sourceIds.length > 0) {
      const { count } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .in('crawl_source_id', sourceIds)
        .gte('created_at', `${date}T00:00:00`)
        .lt('created_at', `${date}T23:59:59`);

      console.log(`   job_postings: ${count || 0}개 (${label} 생성)`);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('📌 사용자용 Supabase SQL 쿼리 (10월 29~31일 데이터 확인)');
  console.log('='.repeat(80));
  console.log(`
-- 1. crawl_logs에서 크롤링 실행 기록 확인
SELECT
  cl.created_at::date as 날짜,
  cb.name as 게시판명,
  cl.status as 상태,
  cl.items_found as 발견개수,
  cl.items_saved as 저장개수,
  cl.created_at as 실행시각
FROM crawl_logs cl
JOIN crawl_boards cb ON cl.board_id = cb.id
WHERE
  cb.id IN (
    '55d09cac-71aa-48d5-a8b8-bbd9181970bb',  -- 의정부
    '5a94f47d-5feb-4821-99af-f8805cc3d619',  -- 성남
    'f4c852f1-f49a-42c5-8823-0edd346f99bb'   -- 경기도
  )
  AND cl.created_at >= '2025-10-29'
  AND cl.created_at < '2025-11-01'
ORDER BY cl.created_at DESC;

-- 2. job_postings에 실제 저장된 포스팅 확인
SELECT
  jp.created_at::date as 등록날짜,
  cs.source_name as 출처,
  COUNT(*) as 포스팅개수
FROM job_postings jp
JOIN crawl_sources cs ON jp.crawl_source_id = cs.id
WHERE
  cs.source_name IN (
    '의정부교육지원청 구인',
    '성남교육지원청 구인',
    '경기도 교육청 구인정보조회'
  )
  AND jp.created_at >= '2025-10-29'
  AND jp.created_at < '2025-11-01'
GROUP BY jp.created_at::date, cs.source_name
ORDER BY jp.created_at::date DESC, cs.source_name;

-- 3. 최근 저장된 포스팅 상세 내용 (최대 20개)
SELECT
  cs.source_name as 출처,
  jp.title as 제목,
  jp.organization as 기관,
  jp.deadline as 마감일,
  jp.created_at as 등록시각
FROM job_postings jp
JOIN crawl_sources cs ON jp.crawl_source_id = cs.id
WHERE
  cs.source_name IN (
    '의정부교육지원청 구인',
    '성남교육지원청 구인',
    '경기도 교육청 구인정보조회'
  )
  AND jp.created_at >= '2025-10-29'
  AND jp.created_at < '2025-11-01'
ORDER BY jp.created_at DESC
LIMIT 20;
  `);
}

verifyData().catch(err => console.error('Error:', err));

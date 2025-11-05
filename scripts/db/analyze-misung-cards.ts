import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeMisungCards() {
  console.log('=== "미상" 카드 분석 ===\n');

  // 스크린샷에서 보이는 조직명들
  const organizations = [
    '녹양유치원',
    '분당초등학교',
    '동암중학교',
    '성남여수유치원',
    '정음유치원',
    '이매중학교',
    '의정부고등학교',
    '낙생초등학교',
    '호암유치원',
    '위례한빛초등학교',
    '민락중학교',
    '당촌초등학교'
  ];

  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, crawl_board_id, created_at, updated_at')
    .in('organization', organizations)
    .order('organization');

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`총 ${jobs?.length || 0}개 공고 발견\n`);

  // crawl_board_id 별로 그룹화
  const oldData: typeof jobs = [];
  const withBoardId: typeof jobs = [];

  for (const job of jobs || []) {
    if (job.crawl_board_id === null) {
      oldData.push(job);
    } else {
      withBoardId.push(job);
    }
  }

  console.log('=== 1. 예전 데이터 (crawl_board_id = NULL) ===');
  console.log(`총 ${oldData.length}개\n`);

  for (const job of oldData) {
    console.log(`${job.organization}`);
    console.log(`  제목: ${job.title}`);
    console.log(`  지역: ${job.location}`);
    console.log(`  생성: ${job.created_at}`);
    console.log(`  상태: ⚠️  예전 데이터 - 중복방지 로직으로 인해 재크롤링되지 않음`);
    console.log('');
  }

  console.log('\n=== 2. crawl_board_id가 있는 데이터 ===');
  console.log(`총 ${withBoardId.length}개\n`);

  // board_id로 board 정보 조회
  const boardIds = [...new Set(withBoardId.map(j => j.crawl_board_id))];
  const { data: boards } = await supabase
    .from('crawl_boards')
    .select('id, name, region')
    .in('id', boardIds);

  const boardMap = new Map(boards?.map(b => [b.id, b]) || []);

  for (const job of withBoardId) {
    const board = boardMap.get(job.crawl_board_id!);
    const expectedLocation = board?.region || '알 수 없음';
    const locationStatus = job.location === expectedLocation ? '✅' :
                          job.location === '미상' ? '❌ 문제!' : '⚠️  불일치';

    console.log(`${job.organization} ${locationStatus}`);
    console.log(`  제목: ${job.title}`);
    console.log(`  현재 location: ${job.location}`);
    console.log(`  예상 location: ${expectedLocation}`);
    console.log(`  Board: ${board?.name}`);
    console.log(`  생성: ${job.created_at}`);
    console.log(`  갱신: ${job.updated_at}`);
    console.log('');
  }

  // 결론 출력
  console.log('\n=== 📊 결론 ===');
  console.log(`\n1. 예전 데이터 (crawl_board_id = NULL): ${oldData.length}개`);
  console.log('   → 중복 방지 로직으로 인해 재크롤링되지 않음');
  console.log('   → "미상"이 계속 표시됨 (정상)');

  const problemJobs = withBoardId.filter(j => j.location === '미상');
  console.log(`\n2. 최근 크롤링 데이터 중 "미상": ${problemJobs.length}개`);
  if (problemJobs.length > 0) {
    console.log('   → ⚠️  location 하드코딩이 제대로 적용되지 않음!');
    console.log('   → 크롤러 코드 점검 필요');
  } else {
    console.log('   → ✅ 최근 크롤링 데이터는 정상적으로 location 설정됨');
  }
}

analyzeMisungCards();

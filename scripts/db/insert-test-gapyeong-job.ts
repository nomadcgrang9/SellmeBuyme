import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function insertTestJob() {
  console.log('=== 가평 테스트 공고 삽입 ===\n');

  const boardId = 'de02eada-6569-45df-9f4d-45a4fcc51879';

  // 크롤러가 반환하는 형태 시뮬레이션 (location: '가평' 하드코딩)
  const testJob = {
    source: 'crawled',
    crawl_board_id: boardId,
    organization: '가평초등학교',
    title: '[테스트] 기간제교원 채용 공고',
    job_type: '기간제교사',
    content: '가평초등학교에서 기간제교원을 채용합니다. 이것은 지역 미상 문제 해결 테스트용 공고입니다.',
    detail_content: '가평초등학교에서 기간제교원을 채용합니다. 이것은 지역 미상 문제 해결 테스트용 공고입니다. 담당과목: 국어, 근무기간: 2025-11-05 ~ 2026-02-28',
    tags: ['기간제', '국어'],
    location: '가평',  // ✅ 크롤러 하드코딩
    compensation: '협의',
    deadline: '2025-12-31',
    is_urgent: false,
    source_url: 'https://www.goegp.kr/test-' + Date.now(),
    school_level: '초등',
    subject: '국어',
  };

  console.log('삽입할 데이터:');
  console.log(`  제목: ${testJob.title}`);
  console.log(`  기관: ${testJob.organization}`);
  console.log(`  지역: ${testJob.location} ✅`);
  console.log(`  crawl_board_id: ${testJob.crawl_board_id}\n`);

  const { data, error } = await supabase
    .from('job_postings')
    .insert(testJob)
    .select()
    .single();

  if (error) {
    console.error('❌ 삽입 실패:', error);
    process.exit(1);
  }

  console.log('✅ 테스트 공고 삽입 완료:');
  console.log(`  ID: ${data.id}`);
  console.log(`  제목: ${data.title}`);
  console.log(`  지역: ${data.location}`);
  console.log(`  crawl_board_id: ${data.crawl_board_id}\n`);

  console.log('이제 프론트엔드에서 확인하세요:');
  console.log('http://localhost:5173');
}

insertTestJob();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAllBoardsLocation() {
  console.log('=== 모든 게시판 지역 정보 확인 ===\n');

  // 1. crawl_boards에서 모든 active 게시판 확인
  const { data: boards, error: boardError } = await supabase
    .from('crawl_boards')
    .select('id, name, region, is_local_government')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (boardError) {
    console.error('❌ crawl_boards 조회 실패:', boardError);
    return;
  }

  if (!boards || boards.length === 0) {
    console.log('❌ active 게시판이 없습니다.');
    return;
  }

  console.log(`✅ 총 ${boards.length}개 active 게시판:\n`);

  for (const board of boards) {
    console.log(`게시판: ${board.name}`);
    console.log(`DB region: ${board.region || 'NULL ❌'}`);
    console.log(`기초자치단체: ${board.is_local_government ? '예' : '아니오'}`);

    // 최근 크롤링된 공고 1개 확인
    const { data: jobs, error: jobError } = await supabase
      .from('job_postings')
      .select('id, title, location, created_at')
      .eq('crawl_board_id', board.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (jobError) {
      console.error('  ❌ job_postings 조회 실패:', jobError);
    } else if (!jobs || jobs.length === 0) {
      console.log('  ⚠️  크롤링된 공고 없음');
    } else {
      const job = jobs[0];
      console.log(`  최근 공고: ${job.title}`);
      console.log(`  공고 지역: ${job.location || 'NULL'} ${job.location === '미상' || !job.location ? '❌' : '✅'}`);
      console.log(`  생성일: ${job.created_at}`);
    }
    console.log('---\n');
  }
}

checkAllBoardsLocation();

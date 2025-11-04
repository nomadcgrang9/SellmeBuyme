import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkJobPostings() {
  console.log('=== job_postings 테이블 확인 ===\n');

  // 1. 가평 게시판 공고
  console.log('1. 가평 게시판 (de02eada-6569-45df-9f4d-45a4fcc51879) 공고:\n');
  const { data: gapyeongJobs, error: error1 } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, created_at')
    .eq('crawl_board_id', 'de02eada-6569-45df-9f4d-45a4fcc51879')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error1) {
    console.error('❌ 조회 실패:', error1);
  } else if (!gapyeongJobs || gapyeongJobs.length === 0) {
    console.log('❌ 공고 없음\n');
  } else {
    console.log(`✅ ${gapyeongJobs.length}개 공고 발견:\n`);
    gapyeongJobs.forEach((job, idx) => {
      console.log(`${idx + 1}. ${job.title}`);
      console.log(`   기관: ${job.organization}`);
      console.log(`   지역: ${job.location || 'NULL'} ${job.location === '미상' ? '❌' : '✅'}`);
      console.log(`   생성일: ${job.created_at}\n`);
    });
  }

  // 2. 최근 "지역 미상" 공고 (모든 게시판)
  console.log('2. 최근 "지역 미상" 공고 (전체):\n');
  const { data: misangJobs, error: error2 } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, crawl_board_id, created_at')
    .eq('location', '미상')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error2) {
    console.error('❌ 조회 실패:', error2);
  } else if (!misangJobs || misangJobs.length === 0) {
    console.log('✅ "지역 미상" 공고 없음\n');
  } else {
    console.log(`⚠️  ${misangJobs.length}개 "지역 미상" 공고 발견:\n`);
    misangJobs.forEach((job, idx) => {
      console.log(`${idx + 1}. ${job.title}`);
      console.log(`   기관: ${job.organization}`);
      console.log(`   게시판 ID: ${job.crawl_board_id}`);
      console.log(`   생성일: ${job.created_at}\n`);
    });
  }

  // 3. 해당 게시판 이름 확인
  if (misangJobs && misangJobs.length > 0) {
    const boardIds = [...new Set(misangJobs.map(j => j.crawl_board_id))];
    console.log('3. "지역 미상" 공고의 게시판 정보:\n');

    for (const boardId of boardIds) {
      const { data: board } = await supabase
        .from('crawl_boards')
        .select('id, name, region, is_local_government')
        .eq('id', boardId)
        .single();

      if (board) {
        console.log(`게시판: ${board.name}`);
        console.log(`  ID: ${board.id}`);
        console.log(`  region: ${board.region || 'NULL'}`);
        console.log(`  기초자치단체: ${board.is_local_government ? '예' : '아니오'}\n`);
      }
    }
  }
}

checkJobPostings();

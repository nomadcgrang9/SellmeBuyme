import dotenv from 'dotenv';
import { supabase } from './lib/supabase.js';

dotenv.config();

async function checkTodayJobs() {
  // 충북 크롤링 board ID
  const chungbukBoardId = 'd94286e3-098f-4cbd-b322-d09e31d1d03b';
  // 울산 크롤링 board ID
  const ulsanBoardId = 'a41f0928-7749-4bf3-bbd5-35c3fd883eaa';

  const today = '2026-01-22T00:00:00Z';

  // 충북 오늘 공고
  const { data: chungbukJobs, error: e1 } = await supabase
    .from('job_postings')
    .select('id, title, organization, created_at, location, deadline')
    .eq('crawl_board_id', chungbukBoardId)
    .gte('created_at', today)
    .order('created_at', { ascending: false });

  console.log('=== 충북 오늘(2026-01-22) 저장된 공고 ===');
  console.log('총 개수:', chungbukJobs?.length || 0);
  if (chungbukJobs?.length > 0) {
    chungbukJobs.forEach(job => {
      console.log(`  - [${job.created_at.substring(11, 19)}] ${job.organization} - ${job.title}`);
      console.log(`    Location: ${job.location}, Deadline: ${job.deadline}`);
    });
  }

  // 울산 오늘 공고
  const { data: ulsanJobs, error: e2 } = await supabase
    .from('job_postings')
    .select('id, title, organization, created_at, location, deadline')
    .eq('crawl_board_id', ulsanBoardId)
    .gte('created_at', today)
    .order('created_at', { ascending: false });

  console.log('\n=== 울산 오늘(2026-01-22) 저장된 공고 ===');
  console.log('총 개수:', ulsanJobs?.length || 0);
  if (ulsanJobs?.length > 0) {
    ulsanJobs.forEach(job => {
      console.log(`  - [${job.created_at.substring(11, 19)}] ${job.organization} - ${job.title}`);
      console.log(`    Location: ${job.location}, Deadline: ${job.deadline}`);
    });
  }

  process.exit(0);
}

checkTodayJobs();

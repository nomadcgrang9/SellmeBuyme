import { createClient } from '@supabase/supabase-js';
import * as process from 'process';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function debugNamyangju() {
  try {
    console.log('📋 Debugging 남양주 board...\n');

    // 1. crawl_boards에서 남양주 찾기
    console.log('1️⃣  crawl_boards에서 남양주 찾기...');
    const { data: boards, error: boardsError } = await supabase
      .from('crawl_boards')
      .select('*')
      .ilike('name', '%남양주%');

    if (boardsError) {
      console.error('❌ Error:', boardsError);
      process.exit(1);
    }

    if (!boards || boards.length === 0) {
      console.log('❌ 남양주 board를 찾을 수 없음');
      process.exit(1);
    }

    console.log(`✅ Found ${boards.length} board(s):`);
    for (const board of boards) {
      console.log(`  - ID: ${board.id}`);
      console.log(`  - Name: ${board.name}`);
      console.log(`  - Status: ${board.status}`);
      console.log('');
    }

    // 2. 각 board별 job_postings 개수 확인
    console.log('2️⃣  각 board별 job_postings 개수...');
    for (const board of boards) {
      const { data: jobs, error: jobsError } = await supabase
        .from('job_postings')
        .select('id, title, crawl_board_id', { count: 'exact' })
        .eq('crawl_board_id', board.id);

      if (jobsError) {
        console.error(`❌ Error for board ${board.id}:`, jobsError);
        continue;
      }

      console.log(`Board: ${board.name} (ID: ${board.id})`);
      console.log(`  - job_postings count: ${jobs?.length || 0}`);

      if (jobs && jobs.length > 0) {
        console.log('  - Sample jobs:');
        jobs.slice(0, 3).forEach((job) => {
          console.log(`    • ${job.title}`);
        });
        if (jobs.length > 3) {
          console.log(`    ... and ${jobs.length - 3} more`);
        }
      }
      console.log('');
    }

    // 3. "지역 미상"인 job_postings 전체 확인
    console.log('3️⃣  "지역 미상"인 job_postings 전체...');
    const { data: unknownLocationJobs, error: unknownError } = await supabase
      .from('job_postings')
      .select('id, title, location, crawl_board_id')
      .eq('location', '지역 미상');

    if (unknownError) {
      console.error('❌ Error:', unknownError);
    } else {
      console.log(`✅ Total "지역 미상" jobs: ${unknownLocationJobs?.length || 0}`);
      if (unknownLocationJobs && unknownLocationJobs.length > 0) {
        console.log('First 5 jobs:');
        unknownLocationJobs.slice(0, 5).forEach((job) => {
          console.log(`  - ${job.title} (crawl_board_id: ${job.crawl_board_id})`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugNamyangju();

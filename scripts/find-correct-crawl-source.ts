import { createClient } from '@supabase/supabase-js';
import * as process from 'process';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findCorrectCrawlSource() {
  try {
    // "지역 미상"인 job_postings의 crawl_source_id 찾기
    const { data: unknownJobs } = await supabase
      .from('job_postings')
      .select('crawl_source_id')
      .eq('location', '지역 미상')
      .limit(1);

    if (!unknownJobs || unknownJobs.length === 0) {
      console.log('❌ No unknown location jobs found');
      process.exit(1);
    }

    const correctCrawlSourceId = unknownJobs[0].crawl_source_id;
    console.log('✅ Found correct crawl_source_id:');
    console.log(`   ${correctCrawlSourceId}`);

    // 이 ID로 crawl_boards 확인
    const { data: boards } = await supabase
      .from('crawl_boards')
      .select('id, name, status')
      .eq('id', correctCrawlSourceId);

    if (boards && boards.length > 0) {
      console.log('\n✅ Corresponding crawl_boards row:');
      console.log(`   ID: ${boards[0].id}`);
      console.log(`   Name: ${boards[0].name}`);
      console.log(`   Status: ${boards[0].status}`);
    } else {
      console.log('\n❌ No matching crawl_boards found for this crawl_source_id');
    }

    // 10개 전부 확인
    const { data: allJobs } = await supabase
      .from('job_postings')
      .select('crawl_source_id')
      .eq('location', '지역 미상');

    if (allJobs && allJobs.length > 0) {
      const uniqueSourceIds = [...new Set(allJobs.map((j) => j.crawl_source_id))];
      console.log(`\n📌 All ${allJobs.length} unknown jobs use these crawl_source_ids:`);
      uniqueSourceIds.forEach((id) => {
        console.log(`   - ${id}`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findCorrectCrawlSource();

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

async function checkJobCrawlReferences() {
  try {
    // 남양주 job_postings 3개 샘플
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('id, title, crawl_source_id, crawl_board_id')
      .eq('location', '남양주')
      .limit(3);

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    console.log('📋 Sample job_postings (location=남양주):\n');
    for (const job of jobs || []) {
      console.log(`Title: ${job.title}`);
      console.log(`  crawl_source_id: ${job.crawl_source_id || 'NULL'}`);
      console.log(`  crawl_board_id: ${job.crawl_board_id || 'NULL'}`);
      console.log('');
    }

    // 구리남양주 board ID 확인
    const { data: boards } = await supabase
      .from('crawl_boards')
      .select('id, name')
      .ilike('name', '%구리남양주%');

    console.log('📌 구리남양주 crawl_boards:\n');
    for (const board of boards || []) {
      console.log(`ID: ${board.id}`);
      console.log(`Name: ${board.name}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkJobCrawlReferences();

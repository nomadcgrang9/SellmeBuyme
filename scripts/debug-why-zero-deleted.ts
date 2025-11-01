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

async function debugWhyZeroDeleted() {
  try {
    const boardId = '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd';

    console.log(`🔍 Debugging boardId: ${boardId}\n`);

    // 1. crawl_source_id로 검색
    const { data: jobs1 } = await supabase
      .from('job_postings')
      .select('id, title, organization, crawl_source_id')
      .eq('crawl_source_id', boardId);

    console.log(`1️⃣  crawl_source_id = ${boardId}:`);
    console.log(`   Found: ${jobs1?.length || 0} jobs`);
    if (jobs1 && jobs1.length > 0) {
      jobs1.forEach((j) => console.log(`   - ${j.organization}: ${j.title}`));
    }

    // 2. crawl_board_id로 검색
    const { data: jobs2 } = await supabase
      .from('job_postings')
      .select('id, title, organization, crawl_board_id')
      .eq('crawl_board_id', boardId);

    console.log(`\n2️⃣  crawl_board_id = ${boardId}:`);
    console.log(`   Found: ${jobs2?.length || 0} jobs`);
    if (jobs2 && jobs2.length > 0) {
      jobs2.forEach((j) => console.log(`   - ${j.organization}: ${j.title}`));
    }

    // 3. 남양주 location으로 검색
    const { data: jobs3 } = await supabase
      .from('job_postings')
      .select('id, title, organization, location, crawl_source_id, crawl_board_id')
      .eq('location', '남양주')
      .limit(5);

    console.log(`\n3️⃣  location = '남양주':`);
    console.log(`   Found: ${jobs3?.length || 0} jobs`);
    if (jobs3 && jobs3.length > 0) {
      jobs3.forEach((j) => {
        console.log(`   - ${j.organization}: ${j.title}`);
        console.log(`     crawl_source_id: ${j.crawl_source_id || 'NULL'}`);
        console.log(`     crawl_board_id: ${j.crawl_board_id || 'NULL'}`);
      });
    }

    // 4. crawl_boards 확인
    const { data: board } = await supabase
      .from('crawl_boards')
      .select('*')
      .eq('id', boardId)
      .single();

    console.log(`\n4️⃣  crawl_boards row:`);
    if (board) {
      console.log(`   Name: ${board.name}`);
      console.log(`   Status: ${board.status}`);
      console.log(`   Approved: ${board.approved_at || 'NULL'}`);
    } else {
      console.log(`   ❌ Board not found!`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugWhyZeroDeleted();

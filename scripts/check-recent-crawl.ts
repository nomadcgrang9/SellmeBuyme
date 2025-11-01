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

async function checkRecentCrawl() {
  try {
    // 1. 구리남양주 검색
    const { data: guriJobs, count: guriCount } = await supabase
      .from('job_postings')
      .select('id, title, location', { count: 'exact' })
      .ilike('location', '%구리%');

    console.log(`1️⃣  구리남양주 jobs: ${guriCount || 0}`);
    if (guriJobs && guriJobs.length > 0) {
      guriJobs.slice(0, 3).forEach((j) => console.log(`   - ${j.title} / ${j.location}`));
    }

    // 2. 남양주 검색
    const { data: namyangJobs, count: namyangCount } = await supabase
      .from('job_postings')
      .select('id, title, location', { count: 'exact' })
      .eq('location', '남양주');

    console.log(`\n2️⃣  남양주 jobs: ${namyangCount || 0}`);
    if (namyangJobs && namyangJobs.length > 0) {
      namyangJobs.slice(0, 3).forEach((j) => console.log(`   - ${j.title}`));
    }

    // 3. 최근 생성된 job_postings
    const { data: recent } = await supabase
      .from('job_postings')
      .select('id, title, location, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`\n3️⃣  최근 10개 jobs:`);
    if (recent && recent.length > 0) {
      recent.forEach((j) => {
        const date = new Date(j.created_at).toLocaleString('ko-KR');
        console.log(`   - ${j.title} / ${j.location} / ${date}`);
      });
    } else {
      console.log('   ❌ No jobs found');
    }

    // 4. crawl_boards 상태 확인
    const { data: board } = await supabase
      .from('crawl_boards')
      .select('id, name, status, approved_at, last_crawled_at')
      .eq('id', '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd')
      .single();

    console.log(`\n4️⃣  구리남양주 crawl_boards:`);
    if (board) {
      console.log(`   Name: ${board.name}`);
      console.log(`   Status: ${board.status}`);
      console.log(`   Approved: ${board.approved_at || 'NULL'}`);
      console.log(`   Last crawled: ${board.last_crawled_at || 'NULL'}`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkRecentCrawl();

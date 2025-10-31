import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

async function diagnose() {
  // 1. Check board configuration
  console.log('[1] Board Configuration:');
  const { data: board } = await supabase
    .from('crawl_boards')
    .select('*')
    .eq('id', BOARD_ID)
    .single();

  console.log('  Name:', board?.name);
  console.log('  URL:', board?.board_url);
  console.log('  Batch Size:', board?.crawl_batch_size);
  console.log('  Status:', board?.status);
  console.log('  Last Crawled:', board?.last_crawled_at);

  // 2. Check crawl_sources
  console.log('\n[2] Crawl Sources:');
  const { data: sources } = await supabase
    .from('crawl_sources')
    .select('*')
    .ilike('name', '%남양주%');

  console.log(`  Found ${sources?.length || 0} sources`);
  sources?.forEach((src: any) => {
    console.log(`    - ${src.name} (${src.id})`);
    console.log(`      Base URL: ${src.base_url}`);
    console.log(`      Last Success: ${src.last_success_at || '없음'}`);
  });

  // 3. Check recent job postings with 남양주 in organization or source_url
  console.log('\n[3] Recent Job Postings (all with 남양주):');
  const { data: allJobs } = await supabase
    .from('job_postings')
    .select('id, title, organization, source_url, detail_content, created_at')
    .or(`organization.ilike.%남양주%,source_url.ilike.%goegn%`)
    .order('created_at', { ascending: false })
    .limit(20);

  console.log(`  Found ${allJobs?.length || 0} posts`);
  allJobs?.forEach((job: any, i: number) => {
    const contentLen = job.detail_content?.length || 0;
    console.log(`  ${i + 1}. ${job.title} (${job.organization})`);
    console.log(`     Content: ${contentLen} chars`);
    console.log(`     URL: ${job.source_url}`);
    console.log(`     Created: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
  });

  // 4. Check if posts with goegn.kr exist (the board URL domain)
  console.log('\n[4] Posts from goegn.kr domain:');
  const { data: goenJobs } = await supabase
    .from('job_postings')
    .select('count')
    .ilike('source_url', '%goegn.kr%');

  console.log(`  Total: ${goenJobs?.[0]?.count || 0}`);
}

diagnose().catch(err => console.error('Error:', err));

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const LOG_ID = 'cac4ccad-0d69-4dfb-9158-9072d42d6eea';
const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';
const MAX_CHECKS = 20;
const CHECK_INTERVAL = 10000; // 10 seconds

async function checkStatus() {
  const { data: log } = await supabase
    .from('crawl_logs')
    .select('*')
    .eq('id', LOG_ID)
    .single();

  if (!log) {
    console.log('❌ Log not found');
    return null;
  }

  console.log(`\n[${new Date().toLocaleTimeString()}] Status: ${log.status}`);

  if (log.status === 'running' || log.status === 'pending') {
    return 'running';
  }

  if (log.status === 'success') {
    console.log('✅ Crawl completed successfully!');

    // Check saved posts
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('title, organization, detail_content, created_at')
      .ilike('organization', '%남양주%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Failed to fetch jobs:', error);
      return 'success';
    }

    console.log(`\n📋 Found ${jobs.length} job postings:`);
    jobs.forEach((job, i) => {
      const contentLength = job.detail_content?.length || 0;
      console.log(`${i + 1}. ${job.title}`);
      console.log(`   Content: ${contentLength} chars`);
      console.log(`   Created: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
    });

    return 'success';
  }

  if (log.status === 'failed') {
    console.log('❌ Crawl failed');
    console.log('Error:', log.error_log);
    return 'failed';
  }

  return log.status;
}

async function main() {
  console.log(`🔍 Waiting for crawl to complete (Log ID: ${LOG_ID})`);
  console.log(`Will check every ${CHECK_INTERVAL / 1000} seconds, max ${MAX_CHECKS} times\n`);

  for (let i = 0; i < MAX_CHECKS; i++) {
    const status = await checkStatus();

    if (status === 'success' || status === 'failed') {
      break;
    }

    if (i < MAX_CHECKS - 1) {
      console.log(`Waiting ${CHECK_INTERVAL / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
  }
}

main().catch(err => console.error('Error:', err));

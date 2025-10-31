import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

async function triggerCrawl() {
  console.log('[1] Calling admin-crawl-run...');
  const { data, error } = await supabase.functions.invoke('admin-crawl-run', {
    body: {
      boardId: BOARD_ID,
      mode: 'run'
    }
  });

  if (error) {
    console.error('Failed to trigger crawl:', error);
    return;
  }

  console.log('[2] Response:', data);
  console.log(`✅ Crawl triggered! Log ID: ${data.logId}`);
  console.log('GitHub Actions status:', data.githubStatus);
  console.log('\nWait 2-3 minutes then check results with:');
  console.log(`  npx tsx scripts/check-crawl-log.ts`);
}

triggerCrawl().catch(err => console.error('Error:', err));

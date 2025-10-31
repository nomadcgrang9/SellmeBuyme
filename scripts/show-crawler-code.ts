import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function showCode() {
  const { data, error } = await supabase
    .from('crawl_boards')
    .select('crawler_source_code')
    .eq('id', 'f72665d5-eaa1-4f2f-af98-97e27bd441cf')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== First 100 lines of crawler code ===\n');
  const lines = (data.crawler_source_code || '').split('\n');
  console.log(lines.slice(0, 100).join('\n'));
}

showCode().catch(err => console.error('Error:', err));

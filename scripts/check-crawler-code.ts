import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function checkCode() {
  const { data, error } = await supabase
    .from('crawl_boards')
    .select('name, crawler_source_code')
    .eq('id', 'f72665d5-eaa1-4f2f-af98-97e27bd441cf')
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== Crawler Code Analysis ===');
  console.log('Board Name:', data.name);
  console.log('Code Length:', data.crawler_source_code?.length || 0);
  console.log('Has detailContent:', (data.crawler_source_code || '').includes('detailContent'));
  console.log('Has contentSelectors:', (data.crawler_source_code || '').includes('contentSelectors'));
  console.log('Has goto detail:', (data.crawler_source_code || '').includes('goto(finalUrl'));
  console.log('Has goBack:', (data.crawler_source_code || '').includes('goBack'));

  // Show snippet of content extraction logic
  const code = data.crawler_source_code || '';
  const detailIdx = code.indexOf('Fetch detail page content');
  if (detailIdx !== -1) {
    console.log('\n=== Content Extraction Logic Found ===');
    console.log(code.substring(detailIdx, detailIdx + 200));
  } else {
    console.log('\n!!! No content extraction logic found !!!');
    console.log('First 500 chars:');
    console.log(code.substring(0, 500));
  }
}

checkCode().catch(err => console.error('Error:', err));

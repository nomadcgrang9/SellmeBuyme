import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

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

  const code = data.crawler_source_code || '';
  writeFileSync('C:/PRODUCT/sellmebuyme/temp_check_crawler.mjs', code, 'utf-8');
  console.log('Saved to temp_check_crawler.mjs');
  console.log('Length:', code.length);
}

showCode().catch(err => console.error('Error:', err));

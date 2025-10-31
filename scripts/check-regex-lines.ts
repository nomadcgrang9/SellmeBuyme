import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function check() {
  const { data } = await supabase
    .from('crawl_boards')
    .select('crawler_source_code')
    .eq('id', 'f72665d5-eaa1-4f2f-af98-97e27bd441cf')
    .single();

  const code = data?.crawler_source_code || '';
  const lines = code.split('\n');

  console.log('Total lines:', lines.length);
  console.log('\nLine 144:', lines[143]);
  console.log('Line 152:', lines[151]);

  const hasClosingSlash144 = lines[143]?.includes('/)');
  const hasClosingSlash152 = lines[151]?.includes('/)');

  console.log('\nLine 144 has closing /):', hasClosingSlash144);
  console.log('Line 152 has closing /):', hasClosingSlash152);
}

check().catch(err => console.error('Error:', err));

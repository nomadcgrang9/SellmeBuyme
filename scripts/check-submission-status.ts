import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function main() {
  const { data } = await supabase
    .from('dev_board_submissions')
    .select('id, board_name, status, approved_at, crawl_board_id')
    .ilike('board_name', '%남양주%')
    .single();

  console.log('📊 dev_board_submissions 상세 정보:\n');
  console.log('  board_name:', data?.board_name);
  console.log('  status:', data?.status);
  console.log('  approved_at:', data?.approved_at);
  console.log('  crawl_board_id:', data?.crawl_board_id);

  console.log('\n🔍 문제 분석:');
  console.log('  - status === "approved" ?', data?.status === 'approved');
  console.log('  - approved_at 존재 ?', !!data?.approved_at);
  console.log('  - 조건: (status === "approved" || approved_at) ?',
    data?.status === 'approved' || !!data?.approved_at);

  console.log('\n💡 이것이 "승인됨: 승인 완료" 박스가 표시되는 이유입니다!');
}

main();

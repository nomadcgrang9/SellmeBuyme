import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function checkNamyangju() {
  console.log('🔍 남양주 게시판 승인 상태 확인\n');

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('id, name, approved_at, approved_by')
    .ilike('name', '%남양주%')
    .single();

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log('📋 현재 DB 상태:');
  console.log(`   게시판명: ${data.name}`);
  console.log(`   ID: ${data.id}`);
  console.log(`   approved_at: ${data.approved_at || 'NULL (승인 대기)'}`);
  console.log(`   approved_by: ${data.approved_by || 'NULL'}`);

  if (data.approved_at === null) {
    console.log('\n✅ DB에서 승인 취소 정상 확인됨 (approved_at = NULL)');
  } else {
    console.log('\n❌ DB에 아직 승인된 상태로 남아있음');
  }
}

checkNamyangju().catch(err => console.error('Error:', err));

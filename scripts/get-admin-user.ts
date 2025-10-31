import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function getAdminUser() {
  // 남양주 게시판을 승인한 사용자 찾기
  const { data: board } = await supabase
    .from('crawl_boards')
    .select('approved_by')
    .eq('id', 'f72665d5-eaa1-4f2f-af98-97e27bd441cf')
    .single();

  console.log('남양주 게시판을 승인한 사용자 ID:', board?.approved_by);

  // user_profiles에서 관리자 권한 확인
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, display_name, email, roles')
    .contains('roles', ['admin']);

  console.log('\n관리자 사용자 목록:');
  profiles?.forEach(p => {
    console.log(`- ${p.display_name} (${p.email})`);
    console.log(`  ID: ${p.id}`);
    console.log(`  권한: ${p.roles}\n`);
  });
}

getAdminUser().catch(err => console.error('Error:', err));

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const NAMYANGJU_BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

async function fixNamyangjuRegion() {
  console.log('🗺️  남양주 게시판 지역 정보 추가 중...\n');

  const { data, error } = await supabase
    .from('crawl_boards')
    .update({
      region_display_name: '경기도 > 남양주시'
    })
    .eq('id', NAMYANGJU_BOARD_ID)
    .select()
    .single();

  if (error) {
    console.error('❌ 지역 정보 추가 실패:', error.message);
    return;
  }

  console.log('✅ 남양주교육지원청 구인구직 게시판 지역 정보 추가 완료!');
  console.log('   지역: 경기도 > 남양주시');
}

fixNamyangjuRegion().catch(err => console.error('Error:', err));

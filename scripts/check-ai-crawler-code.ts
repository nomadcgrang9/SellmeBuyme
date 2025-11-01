import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function main() {
  const { data: board, error } = await supabase
    .from('crawl_boards')
    .select('id, name, ai_crawler_code, board_url')
    .eq('id', 'f72665d5-eaa1-4f2f-af98-97e27bd441cf')
    .single();

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log('📊 남양주 게시판 정보\n');
  console.log('ID:', board.id);
  console.log('이름:', board.name);
  console.log('URL:', board.board_url);
  console.log('AI 코드 길이:', board.ai_crawler_code?.length || 0, '자');

  if (board.ai_crawler_code) {
    console.log('\n📝 AI 크롤러 코드:');
    console.log('='.repeat(70));
    console.log(board.ai_crawler_code);
    console.log('='.repeat(70));
  } else {
    console.log('\n❌ AI 크롤러 코드가 DB에 저장되지 않았습니다!');
  }
}

main();

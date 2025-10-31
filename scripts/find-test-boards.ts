import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function findTestBoards() {
  const { data: boards, error } = await supabase
    .from('crawl_boards')
    .select('id, name, status, is_active')
    .eq('status', 'blocked')
    .eq('is_active', false);

  if (error) {
    console.error('오류:', error);
    return;
  }

  console.log('🔍 테스트 게시판 목록:\n');
  boards?.forEach(board => {
    console.log(`- ${board.name}`);
    console.log(`  ID: ${board.id}`);
    console.log(`  상태: ${board.status}, 활성: ${board.is_active}\n`);
  });

  console.log('삭제할 ID 배열:');
  console.log(JSON.stringify(boards?.map(b => b.id), null, 2));
}

findTestBoards().catch(err => console.error('Error:', err));

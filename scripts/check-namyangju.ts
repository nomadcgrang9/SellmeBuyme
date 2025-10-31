import { createClient } from '@supabase/supabase-js';

const url = 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM';

const supabase = createClient(url, key);

async function main() {
  console.log('📊 남양주 게시판 DB 상태 조회\n');

  // dev_board_submissions 확인
  const { data: subs, error: subError } = await supabase
    .from('dev_board_submissions')
    .select('id, board_name, crawl_board_id, approved_at, approved_by')
    .ilike('board_name', '%남양주%');

  if (subError) {
    console.error('❌ Submissions 오류:', subError);
  } else {
    console.log('1️⃣ dev_board_submissions:', subs?.length || 0, '개');
    subs?.forEach(sub => {
      console.log('  ID:', sub.id);
      console.log('  board_name:', sub.board_name);
      console.log('  crawl_board_id:', sub.crawl_board_id);
      console.log('  approved_at:', sub.approved_at);
      console.log('  approved_by:', sub.approved_by);
      console.log('');
    });
  }

  // crawl_boards 확인
  const { data: boards, error: boardError } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url, approved_at, approved_by, is_active')
    .ilike('name', '%남양주%');

  if (boardError) {
    console.error('❌ Crawl boards 오류:', boardError);
  } else {
    console.log('2️⃣ crawl_boards:', boards?.length || 0, '개');
    boards?.forEach(board => {
      console.log('  ID:', board.id);
      console.log('  name:', board.name);
      console.log('  board_url:', board.board_url);
      console.log('  approved_at:', board.approved_at);
      console.log('  approved_by:', board.approved_by);
      console.log('  is_active:', board.is_active);
      console.log('');
    });
  }

  console.log('✅ 조회 완료');
}

main();

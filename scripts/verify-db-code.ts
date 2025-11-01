import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

const { data: board, error } = await supabase
  .from('crawl_boards')
  .select('id, name, crawler_source_code')
  .eq('id', boardId)
  .single();

if (error) {
  console.error('❌ DB 조회 오류:', error);
  process.exit(1);
}

console.log(`📌 DB에 저장된 크롤러 코드 길이: ${board.crawler_source_code?.length || 0}자`);
console.log(`📌 앞 200자:\n${board.crawler_source_code?.substring(0, 200)}`);
console.log(`\n📌 뒤 200자:\n${board.crawler_source_code?.substring(board.crawler_source_code.length - 200)}`);

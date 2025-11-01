import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

const { data: board, error } = await supabase
  .from('crawl_boards')
  .select('crawler_source_code')
  .eq('id', boardId)
  .single();

if (error) {
  console.error('❌ DB 조회 오류:', error);
  process.exit(1);
}

console.log('=== DB에 저장된 크롤러 코드 ===\n');
console.log(board.crawler_source_code);
console.log('\n=== 코드 길이:', board.crawler_source_code?.length, '자 ===');

// 상세 페이지 접속 코드가 있는지 확인
if (board.crawler_source_code?.includes('page.goto') && board.crawler_source_code?.includes('absoluteLink')) {
  console.log('✅ 상세 페이지 접속 로직 있음');
} else {
  console.log('❌ 상세 페이지 접속 로직 없음 - 이게 문제!');
}

// detail_content 필드 사용 확인
if (board.crawler_source_code?.includes('detail_content')) {
  console.log('✅ detail_content 필드 사용');
} else if (board.crawler_source_code?.includes('detailContent')) {
  console.log('❌ detailContent (camelCase) 사용 - 필드명 불일치!');
} else {
  console.log('❌ 본문 추출 코드 없음!');
}

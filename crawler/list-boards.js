import { supabase } from './lib/supabase.js';

const { data, error } = await supabase
  .from('crawl_boards')
  .select('id, name, board_url, is_active')
  .order('name');

if (error) {
  console.error('조회 실패:', error.message);
  process.exit(1);
}

console.log('\n📋 등록된 Board 목록:\n');
console.log('─'.repeat(80));

data.forEach((board, i) => {
  const status = board.is_active ? '✅' : '❌';
  console.log(`${status} [${i + 1}] ${board.name}`);
  console.log(`   ID: ${board.id}`);
  console.log(`   URL: ${board.board_url}`);
  console.log('');
});

console.log(`총 ${data.length}개 Board`);

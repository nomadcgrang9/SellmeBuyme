import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function list() {
  const { data } = await supabase
    .from('crawl_boards')
    .select('id, name, crawl_source_id, crawler_source_code')
    .order('name');

  console.log('=== 전체 게시판 목록 ===\n');

  data?.forEach(board => {
    const codeLen = board.crawler_source_code?.length || 0;
    console.log(`${board.name}`);
    console.log(`  ID: ${board.id}`);
    console.log(`  source_id: ${board.crawl_source_id || 'NULL'}`);
    console.log(`  코드: ${codeLen}자 ${codeLen > 2000 ? '✅ AI 생성' : '❌ 템플릿'}\n`);
  });
}

list();

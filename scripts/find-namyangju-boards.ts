import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function find() {
  const { data } = await supabase
    .from('crawl_boards')
    .select('id, name, crawl_source_id, crawler_source_code')
    .ilike('name', '%남양주%')
    .order('name');

  console.log('=== 남양주 관련 게시판 ===\n');

  if (!data || data.length === 0) {
    console.log('❌ 남양주 게시판을 찾을 수 없습니다.');
    return;
  }

  data.forEach(board => {
    console.log(`📌 ${board.name}`);
    console.log(`   ID: ${board.id}`);
    console.log(`   source_id: ${board.crawl_source_id || 'NULL'}`);
    console.log(`   코드 길이: ${board.crawler_source_code?.length || 0}자`);
    console.log();
  });
}

find();

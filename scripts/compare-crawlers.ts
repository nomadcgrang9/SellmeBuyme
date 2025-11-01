import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function compare() {
  const { data } = await supabase
    .from('crawl_boards')
    .select('id, name, crawl_source_id, crawler_source_code')
    .in('name', ['의정부교육지원청 구인구직', '성남교육지원청 구인구직', '남양주교육지원청 구인구직'])
    .order('name');

  console.log('=== 크롤러 비교 ===\n');

  data?.forEach(board => {
    console.log(`📌 ${board.name}`);
    console.log(`   ID: ${board.id}`);
    console.log(`   crawl_source_id: ${board.crawl_source_id}`);
    console.log(`   코드 길이: ${board.crawler_source_code?.length || 0}자`);
    console.log(`   코드 앞 200자: ${board.crawler_source_code?.substring(0, 200) || 'NULL'}\n`);
  });
}

compare();

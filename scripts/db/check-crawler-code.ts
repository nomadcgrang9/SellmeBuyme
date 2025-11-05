import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkCrawlerCode() {
  console.log('=== 크롤러 코드 상태 확인 ===\n');

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('id, name, crawler_source_code')
    .in('name', ['성남교육지원청 구인', '의정부교육지원청 구인', '구리남양주 기간제교사', '남양주교육지원청-구인구직'])
    .order('name');

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  for (const board of data || []) {
    console.log(`게시판: ${board.name}`);
    console.log(`ID: ${board.id}`);
    console.log(`크롤러 코드: ${board.crawler_source_code ? '✅ 있음 (' + board.crawler_source_code.length + ' bytes)' : '❌ NULL'}`);
    console.log('---\n');
  }
}

checkCrawlerCode();

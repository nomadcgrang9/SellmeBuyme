import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('*')
    .eq('id', boardId)
    .single();

  if (error) {
    console.log('❌ 에러:', error.message);
    return;
  }

  console.log('=== Board 정보 ===\n');
  console.log('ID:', data.id);
  console.log('이름:', data.name);
  console.log('URL:', data.board_url);
  console.log('crawl_source_id:', data.crawl_source_id);
  console.log('crawler_source_code 길이:', data.crawler_source_code?.length || 0);
  console.log('\n=== crawler_source_code 앞 500자 ===\n');
  console.log(data.crawler_source_code?.substring(0, 500) || 'NULL');
}

check();

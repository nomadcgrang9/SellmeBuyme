import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkNamyangjuBoard() {
  const boardId = '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd';

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('id, name, region, is_local_government, crawler_source_code')
    .eq('id', boardId)
    .single();

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  if (!data) {
    console.log('❌ Board ID를 찾을 수 없음:', boardId);
    return;
  }

  console.log('=== 구리남양주 Board 정보 ===\n');
  console.log('ID:', data.id);
  console.log('Name:', data.name);
  console.log('Region:', data.region);
  console.log('Is Local Government:', data.is_local_government);
  console.log('Crawler Source Code:', data.crawler_source_code ? `있음 (${data.crawler_source_code.length} bytes)` : 'NULL');
}

checkNamyangjuBoard();

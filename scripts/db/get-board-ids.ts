import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getBoardIds() {
  console.log('=== 게시판 ID 조회 ===\n');

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url, region, is_local_government, status')
    .in('name', ['성남교육지원청 구인', '의정부교육지원청 구인', '구리남양주 기간제교사', '남양주교육지원청-구인구직'])
    .order('name');

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`총 ${data?.length || 0}개 게시판:\n`);

  for (const board of data || []) {
    console.log(`이름: ${board.name}`);
    console.log(`ID: ${board.id}`);
    console.log(`지역: ${board.region || 'NULL'}`);
    console.log(`기초자치단체: ${board.is_local_government ? '예' : '아니오'}`);
    console.log(`상태: ${board.status}`);
    console.log(`URL: ${board.board_url}`);
    console.log('---\n');
  }
}

getBoardIds();

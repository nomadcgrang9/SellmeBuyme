import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExactName() {
  console.log('\n🔍 게시판명 정확히 확인\n');

  const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

  // 1. ID로 조회
  const { data: board, error } = await supabase
    .from('crawl_boards')
    .select('id, name, is_active')
    .eq('id', boardId)
    .single();

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    return;
  }

  if (!board) {
    console.log('❌ 게시판을 찾을 수 없습니다.');
    return;
  }

  console.log(`📋 게시판명: "${board.name}"`);
  console.log(`    길이: ${board.name.length}자`);
  console.log(`    is_active: ${board.is_active}\n`);

  // 2. getOrCreateCrawlSource 로직대로 동일하게 조회
  console.log('🧪 getOrCreateCrawlSource 로직으로 재조회:');
  const { data: testBoard } = await supabase
    .from('crawl_boards')
    .select('id, crawl_batch_size')
    .eq('name', board.name)
    .eq('is_active', true)
    .maybeSingle();

  if (testBoard) {
    console.log(`✅ 찾음! ID: ${testBoard.id}`);
  } else {
    console.log(`❌ 못 찾음!`);
    console.log(`   → 해당 이름 "${board.name}"으로 재조회 실패`);
  }
}

checkExactName();

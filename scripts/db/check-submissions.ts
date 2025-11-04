import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSubmissions() {
  console.log('=== 가평 제출 내역 확인 ===\n');

  const { data, error } = await supabase
    .from('dev_board_submissions')
    .select('id, board_name, board_url, status, created_at')
    .or('board_name.ilike.%가평%,board_url.ilike.%가평%')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('✅ 가평 관련 제출 내역이 없습니다 (등록 가능)');
  } else {
    console.log(`⚠️  가평 관련 제출 내역 ${data.length}개 발견:\n`);
    for (const sub of data) {
      console.log(`ID: ${sub.id}`);
      console.log(`게시판명: ${sub.board_name}`);
      console.log(`URL: ${sub.board_url}`);
      console.log(`상태: ${sub.status}`);
      console.log(`생성일: ${sub.created_at}`);
      console.log('---\n');
    }
  }
}

checkSubmissions();

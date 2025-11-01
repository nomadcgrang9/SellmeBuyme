import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBoardStatus() {
  console.log('\n🔍 구리남양주 게시판 상태 확인\n');

  // 1. crawl_boards 조회
  const { data: boards, error } = await supabase
    .from('crawl_boards')
    .select('id, name, is_active, approved_at, status')
    .or('name.ilike.%구리남양주%,name.ilike.%남양주%');

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    return;
  }

  console.log(`📋 발견된 게시판: ${boards?.length || 0}개\n`);

  if (boards && boards.length > 0) {
    boards.forEach((board, i) => {
      console.log(`[${i + 1}] ${board.name}`);
      console.log(`    ID: ${board.id}`);
      console.log(`    is_active: ${board.is_active}`);
      console.log(`    approved_at: ${board.approved_at}`);
      console.log(`    status: ${board.status}\n`);
    });

    // 활성화되지 않은 게시판이 있는지 확인
    const inactive = boards.filter(b => !b.is_active);
    if (inactive.length > 0) {
      console.log(`\n⚠️  활성화되지 않은 게시판: ${inactive.length}개`);
      console.log('💡 해결 방법: 다음 명령어로 활성화하세요:');
      console.log(`   UPDATE crawl_boards SET is_active = true WHERE id = '[게시판 ID]';`);
    }
  } else {
    console.log('❌ 구리남양주 게시판을 찾을 수 없습니다!');
    console.log('\n🔍 모든 crawl_boards 확인:');

    const { data: allBoards } = await supabase
      .from('crawl_boards')
      .select('name, is_active')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allBoards && allBoards.length > 0) {
      allBoards.forEach(board => {
        console.log(`  - ${board.name}: ${board.is_active ? '활성' : '비활성'}`);
      });
    }
  }
}

checkBoardStatus();

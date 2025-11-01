import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 crawl_boards 테이블 확인\n');

  const { data: boards, error } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    return;
  }

  if (!boards || boards.length === 0) {
    console.log('⚠️  crawl_boards 데이터가 없습니다.\n');
    return;
  }

  console.log(`📋 crawl_boards 총 ${boards.length}개\n`);

  boards.forEach((board, index) => {
    console.log(`\n${index + 1}. ${board.name}`);
    console.log(`   ID: ${board.id}`);
    console.log(`   URL: ${board.board_url}`);
  });

  // 특정 ID 조회
  console.log('\n\n🔍 ID 453b97bf-6f38-45a7-a994-b44b6fa65aab 조회:\n');

  const { data: specificBoard, error: specificError } = await supabase
    .from('crawl_boards')
    .select('*')
    .eq('id', '453b97bf-6f38-45a7-a994-b44b6fa65aab');

  if (specificError) {
    console.error('❌ 조회 실패:', specificError.message);
  } else if (!specificBoard || specificBoard.length === 0) {
    console.log('⚠️  해당 ID의 게시판이 없습니다.');
  } else {
    console.log(`발견된 게시판: ${specificBoard.length}개\n`);
    specificBoard.forEach((board: any) => {
      console.log(`이름: ${board.name}`);
      console.log(`URL: ${board.board_url}`);
      console.log(`크롤러 코드: ${board.crawler_source_code ? '있음 (' + board.crawler_source_code.length + '자)' : '없음'}`);
    });
  }
}

main().catch(console.error);

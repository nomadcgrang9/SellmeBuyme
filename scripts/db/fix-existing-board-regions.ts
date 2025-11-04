import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixExistingBoardRegions() {
  console.log('=== 기존 crawl_boards의 region NULL 수정 ===\n');

  // 1. region이 NULL인 게시판들 조회
  const { data: boards, error: fetchError } = await supabase
    .from('crawl_boards')
    .select('id, name, region, is_local_government')
    .is('region', null)
    .eq('status', 'active');

  if (fetchError) {
    console.error('❌ 조회 실패:', fetchError);
    process.exit(1);
  }

  if (!boards || boards.length === 0) {
    console.log('✅ region이 NULL인 게시판 없음\n');
    return;
  }

  console.log(`⚠️  region이 NULL인 게시판 ${boards.length}개 발견:\n`);

  for (const board of boards) {
    console.log(`\n게시판: ${board.name}`);
    console.log(`  ID: ${board.id}`);
    console.log(`  기초자치단체: ${board.is_local_government ? '예' : '아니오'}`);

    // 게시판 이름에서 지역 추출
    const match = board.name.match(/^([가-힣]+)(교육|교육지원청)/);

    if (match) {
      const extractedRegion = match[1];
      console.log(`  추출된 지역: ${extractedRegion}`);

      // region 업데이트
      const { error: updateError } = await supabase
        .from('crawl_boards')
        .update({ region: extractedRegion })
        .eq('id', board.id);

      if (updateError) {
        console.error(`  ❌ 업데이트 실패:`, updateError);
      } else {
        console.log(`  ✅ region 업데이트 완료: ${extractedRegion}`);
      }
    } else {
      console.log(`  ⚠️  지역 추출 실패 (패턴 불일치)`);
    }
  }

  console.log('\n=== 수정 완료 ===');
}

fixExistingBoardRegions();

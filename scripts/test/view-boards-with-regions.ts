/**
 * 지역 정보가 포함된 게시판 목록 조회 스크립트
 * Usage: npx tsx scripts/test/view-boards-with-regions.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  console.log('🗺️  지역 정보가 포함된 크롤링 게시판 목록\n');

  const { data: boards, error } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url, is_active, region_code, subregion_code, region_display_name, school_level, last_crawled_at')
    .order('name');

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  if (!boards || boards.length === 0) {
    console.log('ℹ️  게시판이 없습니다.');
    return;
  }

  console.log(`📊 총 ${boards.length}개 게시판\n`);
  console.log('='.repeat(100));

  boards.forEach((board, index) => {
    console.log(`\n${index + 1}. ${board.name}`);
    console.log(`   📍 지역: ${board.region_display_name || '미설정'}`);
    console.log(`   🏫 학교급: ${board.school_level || '미설정'}`);
    console.log(`   🔗 URL: ${board.board_url}`);
    console.log(`   ⚡ 활성화: ${board.is_active ? 'YES' : 'NO'}`);
    console.log(`   🕐 최근 크롤링: ${board.last_crawled_at ? new Date(board.last_crawled_at).toLocaleString('ko-KR') : '없음'}`);
    console.log(`   🆔 ID: ${board.id}`);
  });

  console.log('\n' + '='.repeat(100));
  console.log(`\n✅ 조회 완료: ${boards.length}개 게시판`);

  // 지역별 통계
  const regionStats: Record<string, number> = {};
  boards.forEach(board => {
    const region = board.region_display_name || '미설정';
    regionStats[region] = (regionStats[region] || 0) + 1;
  });

  console.log('\n📊 지역별 통계:');
  Object.entries(regionStats).forEach(([region, count]) => {
    console.log(`   ${region}: ${count}개`);
  });
})();

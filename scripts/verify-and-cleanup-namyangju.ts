import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function verifyAndCleanupNamyangju() {
  console.log('\n🔍 남양주 관련 데이터 조회 중...');

  try {
    // 1. crawl_boards 조회
    console.log('\n1️⃣  crawl_boards 테이블 조회:');
    const { data: boards, error: boardsError } = await supabase
      .from('crawl_boards')
      .select('*')
      .or('board_name.ilike.%남양주%,board_name.ilike.%구리%');

    if (boardsError) {
      console.error('   ❌ 조회 실패:', boardsError.message);
    } else {
      console.log(`   발견된 게시판: ${boards?.length || 0}개`);
      boards?.forEach(board => {
        console.log(`   - ${board.board_name} (ID: ${board.id})`);
      });

      // 삭제
      if (boards && boards.length > 0) {
        for (const board of boards) {
          console.log(`\n   🗑️  ${board.board_name} 삭제 중...`);
          const { error: deleteError } = await supabase
            .from('crawl_boards')
            .delete()
            .eq('id', board.id);

          if (deleteError) {
            console.error(`   ❌ 삭제 실패:`, deleteError.message);
          } else {
            console.log(`   ✅ 삭제 완료`);
          }
        }
      }
    }

    // 2. job_postings 조회
    console.log('\n2️⃣  job_postings 테이블 조회:');
    const { data: jobs, error: jobsError } = await supabase
      .from('job_postings')
      .select('id, organization, title')
      .or('organization.ilike.%남양주%,organization.ilike.%구리%');

    if (jobsError) {
      console.error('   ❌ 조회 실패:', jobsError.message);
    } else {
      console.log(`   발견된 공고: ${jobs?.length || 0}개`);
      jobs?.slice(0, 5).forEach(job => {
        console.log(`   - ${job.organization}: ${job.title}`);
      });

      // 삭제
      if (jobs && jobs.length > 0) {
        console.log(`\n   🗑️  ${jobs.length}개 공고 삭제 중...`);
        const { error: deleteError } = await supabase
          .from('job_postings')
          .delete()
          .or('organization.ilike.%남양주%,organization.ilike.%구리%');

        if (deleteError) {
          console.error(`   ❌ 삭제 실패:`, deleteError.message);
        } else {
          console.log(`   ✅ 삭제 완료`);
        }
      }
    }

    // 3. crawl_logs 조회 및 삭제
    console.log('\n3️⃣  crawl_logs 테이블 정리:');

    // 먼저 남은 board ID가 있는지 확인
    const { data: remainingBoards } = await supabase
      .from('crawl_boards')
      .select('id')
      .or('board_name.ilike.%남양주%,board_name.ilike.%구리%');

    if (remainingBoards && remainingBoards.length > 0) {
      for (const board of remainingBoards) {
        const { error: deleteLogsError } = await supabase
          .from('crawl_logs')
          .delete()
          .eq('board_id', board.id);

        if (deleteLogsError) {
          console.error(`   ❌ 로그 삭제 실패:`, deleteLogsError.message);
        }
      }
    }

    console.log('   ✅ 로그 정리 완료');

    console.log('\n✅ 남양주 관련 데이터 완전 삭제 완료!');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

verifyAndCleanupNamyangju();

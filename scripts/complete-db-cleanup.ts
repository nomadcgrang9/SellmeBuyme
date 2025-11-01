import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function completeDbCleanup() {
  console.log('\n🗑️  완전 DB 초기화\n');

  // 1. 구리남양주 관련 모든 공고 삭제
  console.log('1️⃣  job_postings 정리 중...');
  const { error: jobsError, count: jobsDeleted } = await supabase
    .from('job_postings')
    .delete({ count: 'exact' })
    .or('organization.ilike.%남양주%,organization.ilike.%구리%,organization.ilike.%별내%,organization.ilike.%다산%,organization.ilike.%동인%');

  if (jobsError) {
    console.log(`   ❌ 실패: ${jobsError.message}`);
  } else {
    console.log(`   ✅ ${jobsDeleted}개 삭제 완료`);
  }

  // 2. crawl_logs 정리
  console.log('\n2️⃣  crawl_logs 정리 중...');
  const { data: boards } = await supabase
    .from('crawl_boards')
    .select('id')
    .or('name.ilike.%구리남양주%,name.ilike.%남양주%');

  let logsDeleted = 0;
  if (boards && boards.length > 0) {
    for (const board of boards) {
      const { count } = await supabase
        .from('crawl_logs')
        .delete({ count: 'exact' })
        .eq('board_id', board.id);
      logsDeleted += count || 0;
    }
  }
  console.log(`   ✅ ${logsDeleted}개 삭제 완료`);

  // 3. crawl_boards 삭제 (재생성하기 위해)
  console.log('\n3️⃣  crawl_boards 삭제 중...');
  const { error: boardsError, count: boardsDeleted } = await supabase
    .from('crawl_boards')
    .delete({ count: 'exact' })
    .or('name.ilike.%구리남양주%,name.ilike.%남양주%');

  if (boardsError) {
    console.log(`   ❌ 실패: ${boardsError.message}`);
  } else {
    console.log(`   ✅ ${boardsDeleted}개 삭제 완료`);
  }

  // 4. dev_board_submissions도 정리
  console.log('\n4️⃣  dev_board_submissions 정리 중...');
  const { error: submissionsError, count: submissionsDeleted } = await supabase
    .from('dev_board_submissions')
    .delete({ count: 'exact' })
    .or('board_name.ilike.%구리남양주%,board_name.ilike.%남양주%');

  if (submissionsError) {
    console.log(`   ❌ 실패: ${submissionsError.message}`);
  } else {
    console.log(`   ✅ ${submissionsDeleted}개 삭제 완료`);
  }

  console.log(`\n✅ DB 완전 초기화 완료!`);
  console.log(`   - job_postings: ${jobsDeleted}개 삭제`);
  console.log(`   - crawl_logs: ${logsDeleted}개 삭제`);
  console.log(`   - crawl_boards: ${boardsDeleted}개 삭제`);
  console.log(`   - dev_board_submissions: ${submissionsDeleted}개 삭제\n`);
}

completeDbCleanup();

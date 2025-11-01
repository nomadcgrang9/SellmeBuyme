import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUnapproveDelete() {
  console.log('\n🧪 승인취소 자동삭제 기능 테스트\n');

  const boardId = '29de44e6-5a49-492f-8289-9876da6d1fed'; // 구리남양주

  // 1. 현재 상태 확인
  console.log('1️⃣  현재 DB 상태 조회');
  const { data: jobsBefore, count: jobsCountBefore } = await supabase
    .from('job_postings')
    .select('id, title', { count: 'exact' })
    .eq('crawl_source_id', boardId);

  console.log(`   job_postings: ${jobsCountBefore}개\n`);

  if (jobsCountBefore === 0) {
    console.log('❌ 테스트할 데이터가 없습니다. 먼저 크롤러를 실행하세요.\n');
    return;
  }

  // 2. unapproveCrawlBoard 로직 직접 실행
  console.log('2️⃣  unapproveCrawlBoard 로직 실행\n');

  // 2-1. job_postings 삭제
  console.log('   [Step 1] job_postings 삭제 중...');
  const { error: jobsError, count: deletedJobs } = await supabase
    .from('job_postings')
    .delete({ count: 'exact' })
    .eq('crawl_source_id', boardId);

  if (jobsError) {
    console.log(`   ❌ 실패: ${jobsError.message}`);
  } else {
    console.log(`   ✅ ${deletedJobs}개 삭제 완료`);
  }

  // 2-2. crawl_logs 삭제
  console.log('\n   [Step 2] crawl_logs 삭제 중...');
  const { error: logsError, count: deletedLogs } = await supabase
    .from('crawl_logs')
    .delete({ count: 'exact' })
    .eq('board_id', boardId);

  if (logsError) {
    console.log(`   ❌ 실패: ${logsError.message}`);
  } else {
    console.log(`   ✅ ${deletedLogs}개 삭제 완료`);
  }

  // 2-3. crawl_boards 승인 취소
  console.log('\n   [Step 3] crawl_boards 승인 취소 중...');
  const { error: boardError } = await supabase
    .from('crawl_boards')
    .update({
      approved_at: null,
      approved_by: null
    })
    .eq('id', boardId);

  if (boardError) {
    console.log(`   ❌ 실패: ${boardError.message}`);
  } else {
    console.log('   ✅ 승인 취소 완료');
  }

  // 2-4. dev_board_submissions status 변경
  console.log('\n   [Step 4] dev_board_submissions status 변경 중...');
  const { error: submissionError } = await supabase
    .from('dev_board_submissions')
    .update({
      status: 'pending'
    })
    .eq('crawl_board_id', boardId);

  if (submissionError) {
    console.log(`   ❌ 실패: ${submissionError.message}`);
  } else {
    console.log('   ✅ status 변경 완료');
  }

  // 3. 최종 확인
  console.log('\n3️⃣  최종 결과 조회');
  const { count: jobsCountAfter } = await supabase
    .from('job_postings')
    .select('id', { count: 'exact' })
    .eq('crawl_source_id', boardId);

  console.log(`   job_postings: ${jobsCountBefore}개 → ${jobsCountAfter}개`);
  console.log(`   삭제됨: ${(jobsCountBefore || 0) - (jobsCountAfter || 0)}개\n`);

  if (jobsCountAfter === 0) {
    console.log('✅ 성공! 모든 공고가 DB에서 삭제되었습니다.');
    console.log('   프론트엔드를 새로고침하면 공고가 사라져야 합니다.\n');
  } else {
    console.log(`⚠️  ${jobsCountAfter}개 공고가 남아있습니다!`);
    console.log('   이건 버그입니다. 확인이 필요합니다.\n');

    // 남은 공고 조회
    const { data: remaining } = await supabase
      .from('job_postings')
      .select('id, title, crawl_source_id')
      .eq('crawl_source_id', boardId)
      .limit(3);

    if (remaining && remaining.length > 0) {
      console.log('   남은 공고:');
      remaining.forEach(job => {
        console.log(`   - ${job.title} (${job.crawl_source_id})`);
      });
    }
  }
}

testUnapproveDelete();

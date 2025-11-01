import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Anon client (일반 사용자)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Service Role client (관리자 권한)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function testUnapprove() {
  console.log('\n🧪 승인 취소 테스트 (구리남양주 게시판)\n');

  // 1. 구리남양주 게시판 ID 찾기
  const { data: boards } = await supabaseAnon
    .from('crawl_boards')
    .select('id, name, approved_at')
    .ilike('name', '%구리남양주%');

  if (!boards || boards.length === 0) {
    console.log('❌ 구리남양주 게시판을 찾을 수 없습니다.');
    return;
  }

  const board = boards[0];
  console.log(`📋 찾은 게시판: ${board.name}`);
  console.log(`   ID: ${board.id}`);
  console.log(`   승인 여부: ${board.approved_at ? '✅ 승인됨' : '❌ 미승인'}\n`);

  // 2. 현재 job_postings 개수 확인
  const { data: jobsBefore, count: jobsCount } = await supabaseAnon
    .from('job_postings')
    .select('id, title, organization', { count: 'exact' })
    .eq('crawl_source_id', board.id);

  console.log(`📊 현재 job_postings 개수: ${jobsCount}개`);
  if (jobsBefore && jobsBefore.length > 0) {
    console.log(`   예시: ${jobsBefore.slice(0, 3).map(j => j.title).join(', ')}\n`);
  }

  // 3. 현재 crawl_logs 개수 확인
  const { count: logsCount } = await supabaseAnon
    .from('crawl_logs')
    .select('id', { count: 'exact' })
    .eq('board_id', board.id);

  console.log(`📊 현재 crawl_logs 개수: ${logsCount}개\n`);

  // 4. Anon Key로 삭제 시도 (RLS 정책 확인)
  console.log('🔍 [테스트 1] Anon Key로 job_postings 삭제 시도...');
  const { error: anonJobsError } = await supabaseAnon
    .from('job_postings')
    .delete()
    .eq('crawl_source_id', board.id);

  if (anonJobsError) {
    console.log(`   ❌ Anon Key 삭제 실패: ${anonJobsError.message}`);
    console.log(`   → RLS 정책 때문에 삭제 불가능 (예상된 결과)\n`);
  } else {
    console.log('   ✅ Anon Key로 삭제 성공!\n');
  }

  // 5. Service Role Key로 삭제 시도
  console.log('🔍 [테스트 2] Service Role Key로 job_postings 삭제 시도...');
  const { error: adminJobsError, count: deletedJobsCount } = await supabaseAdmin
    .from('job_postings')
    .delete({ count: 'exact' })
    .eq('crawl_source_id', board.id);

  if (adminJobsError) {
    console.log(`   ❌ Service Role 삭제 실패: ${adminJobsError.message}\n`);
  } else {
    console.log(`   ✅ Service Role로 ${deletedJobsCount}개 삭제 성공!\n`);
  }

  // 6. crawl_logs 삭제
  console.log('🔍 [테스트 3] Service Role Key로 crawl_logs 삭제 시도...');
  const { error: logsError, count: deletedLogsCount } = await supabaseAdmin
    .from('crawl_logs')
    .delete({ count: 'exact' })
    .eq('board_id', board.id);

  if (logsError) {
    console.log(`   ❌ crawl_logs 삭제 실패: ${logsError.message}\n`);
  } else {
    console.log(`   ✅ ${deletedLogsCount}개 로그 삭제 성공!\n`);
  }

  // 7. 승인 취소
  console.log('🔍 [테스트 4] crawl_boards 승인 취소...');
  const { error: boardError } = await supabaseAdmin
    .from('crawl_boards')
    .update({ approved_at: null, approved_by: null })
    .eq('id', board.id);

  if (boardError) {
    console.log(`   ❌ 승인 취소 실패: ${boardError.message}\n`);
  } else {
    console.log('   ✅ 승인 취소 성공!\n');
  }

  // 8. dev_board_submissions status 변경
  console.log('🔍 [테스트 5] dev_board_submissions status → pending...');
  const { error: submissionError } = await supabaseAdmin
    .from('dev_board_submissions')
    .update({ status: 'pending' })
    .eq('crawl_board_id', board.id);

  if (submissionError) {
    console.log(`   ❌ status 변경 실패: ${submissionError.message}\n`);
  } else {
    console.log('   ✅ status 변경 성공!\n');
  }

  // 9. 최종 확인
  const { count: finalJobsCount } = await supabaseAnon
    .from('job_postings')
    .select('id', { count: 'exact' })
    .eq('crawl_source_id', board.id);

  console.log('\n📊 최종 결과:');
  console.log(`   job_postings: ${jobsCount}개 → ${finalJobsCount}개`);
  console.log(`   삭제된 개수: ${(jobsCount || 0) - (finalJobsCount || 0)}개\n`);

  if (finalJobsCount === 0) {
    console.log('✅ 성공! 프론트엔드에서 공고가 완전히 사라집니다.\n');
  } else {
    console.log('⚠️  일부 공고가 남아있습니다. RLS 정책 확인 필요.\n');
  }
}

testUnapprove();

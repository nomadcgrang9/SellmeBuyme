import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLSDeletePolicy() {
  console.log('\n🔍 RLS DELETE 정책 확인\n');

  // 1. 의정부 게시판 찾기 (실제 데이터가 있는 게시판)
  const { data: boards } = await supabase
    .from('crawl_boards')
    .select('id, name')
    .ilike('name', '%의정부%')
    .limit(1);

  if (!boards || boards.length === 0) {
    console.log('❌ 의정부 게시판을 찾을 수 없습니다.');
    return;
  }

  const board = boards[0];
  console.log(`📋 테스트 대상: ${board.name} (${board.id})\n`);

  // 2. 현재 job_postings 개수
  const { data: jobs, count } = await supabase
    .from('job_postings')
    .select('id, title', { count: 'exact' })
    .eq('crawl_source_id', board.id)
    .limit(5);

  console.log(`📊 현재 job_postings: ${count}개`);
  if (jobs && jobs.length > 0) {
    console.log(`   예시: ${jobs.map(j => j.title).join(', ')}\n`);
  }

  // 3. 로그인 상태 확인
  const { data: { user } } = await supabase.auth.getUser();
  console.log(`👤 현재 사용자: ${user ? `${user.email} (${user.id})` : '로그인 안 됨'}\n`);

  // 4. DELETE 권한 테스트 (DRY RUN - 실제로 삭제하지 않음)
  console.log('🧪 DELETE 권한 테스트 (실제 삭제는 하지 않음)...\n');

  // RLS 정책 확인을 위해 실제로 삭제 쿼리를 실행하지만,
  // 절대 매칭되지 않는 조건을 추가해서 실제 삭제는 방지
  const { error, count: wouldDelete } = await supabase
    .from('job_postings')
    .delete({ count: 'exact' })
    .eq('crawl_source_id', board.id)
    .eq('id', '00000000-0000-0000-0000-000000000000'); // 절대 존재하지 않는 ID

  if (error) {
    console.log(`❌ DELETE 권한 없음 또는 RLS 차단`);
    console.log(`   에러: ${error.message}\n`);
    console.log('⚠️  결론: queries.ts의 unapproveCrawlBoard는 작동하지 않을 수 있습니다.');
    console.log('   → Edge Function 또는 Service Role Key가 필요합니다.\n');
  } else {
    console.log(`✅ DELETE 권한 있음 (${wouldDelete}개 삭제 가능)\n`);
    console.log('✅ 결론: queries.ts의 현재 코드가 작동합니다!\n');
  }

  // 5. crawl_logs에 대해서도 테스트
  const { error: logsError } = await supabase
    .from('crawl_logs')
    .delete()
    .eq('board_id', board.id)
    .eq('id', '00000000-0000-0000-0000-000000000000');

  if (logsError) {
    console.log(`❌ crawl_logs DELETE 권한 없음: ${logsError.message}\n`);
  } else {
    console.log('✅ crawl_logs DELETE 권한 있음\n');
  }
}

checkRLSDeletePolicy();

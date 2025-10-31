import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';
const USER_ID = '85823de2-b69b-4829-8e1b-c3764c7d633c';

async function checkState(label: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 ${label}`);
  console.log('='.repeat(70));

  const { data: sub } = await supabase
    .from('dev_board_submissions')
    .select('*')
    .eq('crawl_board_id', BOARD_ID)
    .single();

  const { data: board } = await supabase
    .from('crawl_boards')
    .select('approved_at')
    .eq('id', BOARD_ID)
    .single();

  console.log('\n📦 DB 상태:');
  console.log('  dev_board_submissions.status:', sub.status);
  console.log('  crawl_boards.approved_at:', board.approved_at);

  console.log('\n🖼️  UI 렌더링:');
  console.log('  1️⃣ "승인대기 크롤링 게시판" 섹션:');

  const showInPending = !board.approved_at;
  console.log('    - 표시 여부:', showInPending ? '✅ 표시됨' : '❌ 숨겨짐');

  if (showInPending && sub.status === 'pending') {
    console.log('    - 버튼: ✅ [AI 크롤러 생성] 활성화');
  } else if (showInPending && sub.status !== 'pending') {
    console.log('    - 버튼: ❌ 숨겨짐 (status가 pending 아님!)');
  }

  if (board.approved_at) {
    console.log('\n  2️⃣ 초록색 "승인됨" 박스: ✅ 표시됨');
  } else {
    console.log('\n  2️⃣ 초록색 "승인됨" 박스: ❌ 숨겨짐');
  }
}

async function unapproveBoard() {
  console.log('\n🔴 승인 취소 실행...');

  // 1. crawl_boards 승인 취소
  const { error: boardError } = await supabase
    .from('crawl_boards')
    .update({
      approved_at: null,
      approved_by: null
    })
    .eq('id', BOARD_ID);

  if (boardError) {
    console.error('❌ crawl_boards 업데이트 실패:', boardError);
    return;
  }

  // 2. dev_board_submissions status를 pending으로 변경
  const { error: submissionError } = await supabase
    .from('dev_board_submissions')
    .update({
      status: 'pending'
    })
    .eq('crawl_board_id', BOARD_ID);

  if (submissionError) {
    console.error('❌ dev_board_submissions 업데이트 실패:', submissionError);
    return;
  }

  console.log('✅ 승인 취소 완료');
}

async function approveBoard() {
  console.log('\n🔵 승인 실행...');

  const { error } = await supabase
    .from('crawl_boards')
    .update({
      approved_at: new Date().toISOString(),
      approved_by: USER_ID
    })
    .eq('id', BOARD_ID);

  if (error) {
    console.error('❌ 승인 실패:', error);
    return;
  }

  // status는 approved로 변경하지 않음 (의도적으로 approved로 유지)

  console.log('✅ 승인 완료');
}

async function main() {
  console.log('\n🧪 완전한 워크플로우 테스트\n');

  // Step 1: 현재 상태
  await checkState('Step 1: 현재 상태');

  // Step 2: 승인 취소
  await unapproveBoard();
  await new Promise(resolve => setTimeout(resolve, 500));
  await checkState('Step 2: 승인 취소 후 (status = pending)');

  // Step 3: 승인 처리
  await approveBoard();
  await new Promise(resolve => setTimeout(resolve, 500));
  await checkState('Step 3: 승인 후 (status = pending 유지)');

  // Step 4: 다시 승인 취소
  await unapproveBoard();
  await new Promise(resolve => setTimeout(resolve, 500));
  await checkState('Step 4: 재승인 취소 (최종)');

  console.log('\n' + '='.repeat(70));
  console.log('✅ 테스트 완료!');
  console.log('='.repeat(70));

  console.log('\n📋 예상 동작:');
  console.log('  • approved_at = NULL && status = pending → [AI 크롤러 생성] 버튼 표시');
  console.log('  • approved_at != NULL → "승인된 크롤링 게시판" 섹션으로 이동');
}

main();

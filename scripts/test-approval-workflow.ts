import { createClient } from '@supabase/supabase-js';

const url = 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM';

const supabase = createClient(url, key);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf'; // 남양주 게시판 ID
const USER_ID = '85823de2-b69b-4829-8e1b-c3764c7d633c'; // 테스트용 관리자 ID

async function checkBoardStatus(label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 ${label}`);
  console.log('='.repeat(60));

  // crawl_boards 상태 확인
  const { data: board } = await supabase
    .from('crawl_boards')
    .select('id, name, approved_at, approved_by')
    .eq('id', BOARD_ID)
    .single();

  console.log('\n1️⃣ crawl_boards 테이블:');
  console.log('  - name:', board?.name);
  console.log('  - approved_at:', board?.approved_at);
  console.log('  - approved_by:', board?.approved_by);

  // dev_board_submissions + JOIN 확인
  const { data: submissions } = await supabase
    .from('dev_board_submissions')
    .select(`
      id,
      board_name,
      crawl_board_id,
      approved_at,
      crawl_boards!dev_board_submissions_crawl_board_id_fkey(
        approved_at,
        approved_by
      )
    `)
    .eq('crawl_board_id', BOARD_ID);

  console.log('\n2️⃣ dev_board_submissions + JOIN:');
  if (submissions && submissions.length > 0) {
    const sub = submissions[0] as any;
    console.log('  - board_name:', sub.board_name);
    console.log('  - dev_board_submissions.approved_at:', sub.approved_at);
    console.log('  - crawl_boards.approved_at:', sub.crawl_boards?.approved_at);

    // 실제 로직: crawl_boards.approved_at 우선 사용
    const finalApprovedAt = sub.crawl_boards?.approved_at ?? sub.approved_at;
    console.log('  - 🎯 최종 approved_at:', finalApprovedAt);
    console.log('  - 🎯 filterPending=true 필터 결과:', finalApprovedAt ? '❌ 제외됨' : '✅ 포함됨');
  } else {
    console.log('  ❌ 제출을 찾을 수 없습니다');
  }
}

async function approveBoard() {
  console.log('\n🔵 승인 처리 중...');
  const { error } = await supabase
    .from('crawl_boards')
    .update({
      approved_at: new Date().toISOString(),
      approved_by: USER_ID
    })
    .eq('id', BOARD_ID);

  if (error) {
    console.error('❌ 승인 실패:', error);
  } else {
    console.log('✅ 승인 완료');
  }
}

async function unapproveBoard() {
  console.log('\n🔴 승인 취소 중...');
  const { error } = await supabase
    .from('crawl_boards')
    .update({
      approved_at: null,
      approved_by: null
    })
    .eq('id', BOARD_ID);

  if (error) {
    console.error('❌ 승인 취소 실패:', error);
  } else {
    console.log('✅ 승인 취소 완료');
  }
}

async function main() {
  console.log('\n🧪 승인 워크플로우 테스트 시작\n');
  console.log('대상 게시판: 남양주교육지원청 구인구직');
  console.log('게시판 ID:', BOARD_ID);

  // Step 1: 현재 상태 확인
  await checkBoardStatus('Step 1: 현재 상태 확인');

  // Step 2: 승인 처리
  await approveBoard();
  await checkBoardStatus('Step 2: 승인 처리 후');

  // Step 3: 승인 취소
  await unapproveBoard();
  await checkBoardStatus('Step 3: 승인 취소 후');

  // Step 4: 다시 승인 (반복 테스트)
  await approveBoard();
  await checkBoardStatus('Step 4: 재승인 후');

  // Step 5: 최종적으로 승인 취소 상태로 복원
  await unapproveBoard();
  await checkBoardStatus('Step 5: 최종 상태 (승인 취소)');

  console.log('\n' + '='.repeat(60));
  console.log('✅ 테스트 완료!');
  console.log('='.repeat(60));
  console.log('\n📋 예상 동작:');
  console.log('  • approved_at이 NULL이면 → filterPending=true 필터 통과 (승인대기 섹션에 표시)');
  console.log('  • approved_at이 있으면 → filterPending=true 필터 제외 (승인대기 섹션에서 사라짐)');
  console.log('  • 승인/취소를 반복해도 정상 동작');
}

main();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';
const USER_ID = '85823de2-b69b-4829-8e1b-c3764c7d633c';

async function simulateUI(label: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🖥️  ${label}`);
  console.log('='.repeat(70));

  // getBoardSubmissions 로직 시뮬레이션
  const { data } = await supabase
    .from('dev_board_submissions')
    .select(`
      *,
      crawl_boards!dev_board_submissions_crawl_board_id_fkey(
        approved_at,
        approved_by
      )
    `)
    .eq('crawl_board_id', BOARD_ID);

  if (!data || data.length === 0) {
    console.log('❌ 제출을 찾을 수 없습니다');
    return;
  }

  const row = data[0] as any;
  const finalApprovedAt = row.crawl_boards?.approved_at !== undefined
    ? row.crawl_boards.approved_at
    : row.approved_at;

  console.log('\n📊 DB 상태:');
  console.log('  dev_board_submissions.status:', row.status);
  console.log('  dev_board_submissions.approved_at:', row.approved_at);
  console.log('  crawl_boards.approved_at:', row.crawl_boards?.approved_at);
  console.log('  🎯 최종 approved_at:', finalApprovedAt);

  console.log('\n🖼️  UI 렌더링:');

  // filterPending=true 필터 테스트
  const includedInPending = !finalApprovedAt;
  console.log('\n  1️⃣ "승인대기 크롤링 게시판" 섹션:');
  console.log('     filterPending=true 결과:', includedInPending ? '✅ 표시됨' : '❌ 숨겨짐');

  if (includedInPending) {
    console.log('     버튼: [AI 크롤러 생성]');
  }

  // 승인 박스 표시 테스트
  console.log('\n  2️⃣ 초록색 "승인됨" 박스:');
  if (finalApprovedAt) {
    const date = new Date(finalApprovedAt).toLocaleString('ko-KR');
    console.log('     ✅ 표시됨');
    console.log(`     내용: "승인됨: ${date}"`);
  } else {
    console.log('     ❌ 숨겨짐 (approved_at이 NULL)');
  }
}

async function main() {
  console.log('\n🧪 UI 디스플레이 테스트 시작\n');

  // Step 1: 현재 상태 (승인 취소됨)
  await simulateUI('Step 1: 현재 상태 확인 (승인 취소됨)');

  // Step 2: 승인 처리
  await supabase
    .from('crawl_boards')
    .update({ approved_at: new Date().toISOString(), approved_by: USER_ID })
    .eq('id', BOARD_ID);

  await new Promise(resolve => setTimeout(resolve, 500));
  await simulateUI('Step 2: 승인 처리 후');

  // Step 3: 승인 취소
  await supabase
    .from('crawl_boards')
    .update({ approved_at: null, approved_by: null })
    .eq('id', BOARD_ID);

  await new Promise(resolve => setTimeout(resolve, 500));
  await simulateUI('Step 3: 승인 취소 후 (최종)');

  console.log('\n' + '='.repeat(70));
  console.log('✅ 테스트 완료!');
  console.log('='.repeat(70));
}

main();

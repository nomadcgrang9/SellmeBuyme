import { createClient } from '@supabase/supabase-js';

const url = 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDU3NzAsImV4cCI6MjA3NjI4MTc3MH0.e6m0XlUqmdWcFZMIUvdv_VzZvyXAqGsS58pCF8W9XPA';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM';

const supabaseService = createClient(url, serviceKey);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';
const USER_ID = '85823de2-b69b-4829-8e1b-c3764c7d633c';

// 실제 getBoardSubmissions 로직 복제
async function testGetBoardSubmissions(filterPending = false) {
  const { data, error } = await supabaseService
    .from('dev_board_submissions')
    .select(`
      *,
      crawl_boards!dev_board_submissions_crawl_board_id_fkey(
        approved_at,
        approved_by
      )
    `)
    .eq('crawl_board_id', BOARD_ID)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 쿼리 실패:', error);
    return [];
  }

  // 실제 코드와 동일한 로직
  const submissions = data.map((row: any) => {
    const approved_at = row.crawl_boards?.approved_at !== undefined
      ? row.crawl_boards.approved_at
      : row.approved_at;
    const approved_by = row.crawl_boards?.approved_by !== undefined
      ? row.crawl_boards.approved_by
      : row.approved_by;

    return {
      id: row.id,
      board_name: row.board_name,
      dev_approved_at: row.approved_at,
      crawl_approved_at: row.crawl_boards?.approved_at,
      final_approved_at: approved_at,
      final_approved_by: approved_by,
    };
  });

  if (filterPending) {
    return submissions.filter(sub => !sub.final_approved_at);
  }

  return submissions;
}

async function testWorkflow() {
  console.log('\n🧪 실제 TypeScript 함수 테스트\n');

  // Step 1: 승인 취소 상태로 설정
  console.log('Step 1: 승인 취소 상태로 설정');
  await supabaseService
    .from('crawl_boards')
    .update({ approved_at: null, approved_by: null })
    .eq('id', BOARD_ID);

  const results1 = await testGetBoardSubmissions(true);
  console.log('  filterPending=true 결과:', results1.length, '개');
  if (results1.length > 0) {
    console.log('  ✅ 통과: NULL이면 필터링됨');
    console.log('  상세:', JSON.stringify(results1[0], null, 2));
  } else {
    console.log('  ❌ 실패: NULL인데 필터링되지 않음!');
  }

  // Step 2: 승인 처리
  console.log('\nStep 2: 승인 처리');
  await supabaseService
    .from('crawl_boards')
    .update({ approved_at: new Date().toISOString(), approved_by: USER_ID })
    .eq('id', BOARD_ID);

  const results2 = await testGetBoardSubmissions(true);
  console.log('  filterPending=true 결과:', results2.length, '개');
  if (results2.length === 0) {
    console.log('  ✅ 통과: 승인되면 필터에서 제외됨');
  } else {
    console.log('  ❌ 실패: 승인되었는데 여전히 포함됨!');
    console.log('  상세:', JSON.stringify(results2[0], null, 2));
  }

  // Step 3: 다시 승인 취소
  console.log('\nStep 3: 다시 승인 취소');
  await supabaseService
    .from('crawl_boards')
    .update({ approved_at: null, approved_by: null })
    .eq('id', BOARD_ID);

  const results3 = await testGetBoardSubmissions(true);
  console.log('  filterPending=true 결과:', results3.length, '개');
  if (results3.length > 0) {
    console.log('  ✅ 통과: NULL이면 다시 필터링됨');
    console.log('  상세:', JSON.stringify(results3[0], null, 2));
  } else {
    console.log('  ❌ 실패: NULL인데 필터링되지 않음!');
  }

  console.log('\n✅ 테스트 완료');
}

testWorkflow();

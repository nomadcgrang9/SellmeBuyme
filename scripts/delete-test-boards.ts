import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const TEST_BOARD_IDS = [
  '1af6c9ea-4e13-4bf3-a339-844eea8aaaf9', // ???????? ?????
  '0ba0d7e2-7aeb-40c0-98dd-a97850c502c8', // ??? ???
  'b31e4bac-4f98-493d-85b6-856d249f1e15', // Test Board
  '26757f53-677f-4b39-b650-4cbcfd1d5ae8', // Pagination Test Board
];

async function deleteTestBoards() {
  console.log('🗑️  테스트 게시판 삭제 시작...\n');

  for (const boardId of TEST_BOARD_IDS) {
    try {
      // 1. 게시판 정보 먼저 확인
      const { data: board } = await supabase
        .from('crawl_boards')
        .select('name, status')
        .eq('id', boardId)
        .single();

      if (!board) {
        console.log(`⚠️  [${boardId}] 게시판을 찾을 수 없습니다.\n`);
        continue;
      }

      console.log(`🔍 [${board.name}]`);
      console.log(`   ID: ${boardId}`);
      console.log(`   상태: ${board.status}`);

      // 2. 관련 job_postings 삭제
      const { data: jobs, error: jobsError } = await supabase
        .from('job_postings')
        .delete()
        .eq('crawl_source_id', boardId);

      if (jobsError) {
        console.log(`   ⚠️  job_postings 삭제 실패:`, jobsError.message);
      } else {
        console.log(`   ✅ job_postings 삭제 완료`);
      }

      // 3. 관련 crawl_logs 삭제
      const { error: logsError } = await supabase
        .from('crawl_logs')
        .delete()
        .eq('board_id', boardId);

      if (logsError) {
        console.log(`   ⚠️  crawl_logs 삭제 실패:`, logsError.message);
      } else {
        console.log(`   ✅ crawl_logs 삭제 완료`);
      }

      // 4. 관련 dev_board_submissions 삭제
      const { error: submissionsError } = await supabase
        .from('dev_board_submissions')
        .delete()
        .eq('crawl_board_id', boardId);

      if (submissionsError) {
        console.log(`   ⚠️  dev_board_submissions 삭제 실패:`, submissionsError.message);
      } else {
        console.log(`   ✅ dev_board_submissions 삭제 완료`);
      }

      // 5. crawl_boards 삭제
      const { error: boardError } = await supabase
        .from('crawl_boards')
        .delete()
        .eq('id', boardId);

      if (boardError) {
        console.log(`   ❌ crawl_boards 삭제 실패:`, boardError.message);
      } else {
        console.log(`   ✅ crawl_boards 삭제 완료`);
      }

      console.log(`   🎉 [${board.name}] 완전 삭제 완료!\n`);
    } catch (error: any) {
      console.error(`   ❌ 오류 발생:`, error.message);
      console.log('');
    }
  }

  console.log('✅ 모든 테스트 게시판 삭제 작업 완료!');
}

deleteTestBoards().catch(err => console.error('Error:', err));

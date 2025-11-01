import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteNamyangjuData() {
  console.log('=== 남양주 관련 데이터 삭제 시작 ===\n');

  try {
    // 1. 먼저 남양주 관련 데이터 확인
    console.log('1. 남양주 관련 데이터 확인 중...\n');

    const { data: jobPostings, error: jobError } = await supabase
      .from('job_postings')
      .select('id, title, organization, source_url')
      .or('organization.ilike.%남양주%,title.ilike.%남양주%,source_url.ilike.%남양주%,source_url.ilike.%goegn%');

    if (jobError) {
      console.error('job_postings 조회 오류:', jobError);
    } else {
      console.log(`   📋 job_postings: ${jobPostings.length}개 발견`);
      if (jobPostings.length > 0) {
        console.log('   샘플:', jobPostings.slice(0, 3).map(j => `${j.title} - ${j.organization}`).join('\n        '));
      }
    }

    const { data: crawlBoards, error: boardError } = await supabase
      .from('crawl_boards')
      .select('id, name, board_url')
      .or('name.ilike.%남양주%,board_url.ilike.%남양주%,board_url.ilike.%goegn%');

    if (boardError) {
      console.error('crawl_boards 조회 오류:', boardError);
    } else {
      console.log(`   📋 crawl_boards: ${crawlBoards.length}개 발견`);
      if (crawlBoards.length > 0) {
        console.log('   샘플:', crawlBoards.map(b => `${b.name} - ${b.board_url}`).join('\n        '));
      }
    }

    const { data: submissions, error: submissionError } = await supabase
      .from('dev_board_submissions')
      .select('id, board_name, board_url')
      .or('board_name.ilike.%남양주%,board_url.ilike.%남양주%,board_url.ilike.%goegn%');

    if (submissionError) {
      console.error('dev_board_submissions 조회 오류:', submissionError);
    } else {
      console.log(`   📋 dev_board_submissions: ${submissions.length}개 발견\n`);
    }

    // 2. 삭제 진행 (Foreign Key 제약 순서 고려)
    console.log('2. 삭제 진행 중...\n');

    // dev_board_submissions 먼저 삭제 (crawl_board_id FK 참조)
    if (submissions && submissions.length > 0) {
      const { error: deleteSubmissionError } = await supabase
        .from('dev_board_submissions')
        .delete()
        .or('board_name.ilike.%남양주%,board_url.ilike.%남양주%,board_url.ilike.%goegn%');

      if (deleteSubmissionError) {
        console.error('   ❌ dev_board_submissions 삭제 실패:', deleteSubmissionError);
      } else {
        console.log(`   ✅ dev_board_submissions ${submissions.length}개 삭제 완료`);
      }
    }

    // crawl_logs 삭제 (board_id FK 참조)
    if (crawlBoards && crawlBoards.length > 0) {
      const boardIds = crawlBoards.map(b => b.id);
      const { error: deleteLogError } = await supabase
        .from('crawl_logs')
        .delete()
        .in('board_id', boardIds);

      if (deleteLogError) {
        console.error('   ❌ crawl_logs 삭제 실패:', deleteLogError);
      } else {
        console.log(`   ✅ crawl_logs 삭제 완료`);
      }
    }

    // job_postings 삭제
    if (jobPostings && jobPostings.length > 0) {
      const { error: deleteJobError } = await supabase
        .from('job_postings')
        .delete()
        .or('organization.ilike.%남양주%,title.ilike.%남양주%,source_url.ilike.%남양주%,source_url.ilike.%goegn%');

      if (deleteJobError) {
        console.error('   ❌ job_postings 삭제 실패:', deleteJobError);
      } else {
        console.log(`   ✅ job_postings ${jobPostings.length}개 삭제 완료`);
      }
    }

    // crawl_boards 마지막에 삭제 (다른 테이블들이 FK로 참조)
    if (crawlBoards && crawlBoards.length > 0) {
      const { error: deleteBoardError } = await supabase
        .from('crawl_boards')
        .delete()
        .or('name.ilike.%남양주%,board_url.ilike.%남양주%,board_url.ilike.%goegn%');

      if (deleteBoardError) {
        console.error('   ❌ crawl_boards 삭제 실패:', deleteBoardError);
      } else {
        console.log(`   ✅ crawl_boards ${crawlBoards.length}개 삭제 완료`);
      }
    }

    console.log('\n=== 삭제 완료 ===');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

deleteNamyangjuData();

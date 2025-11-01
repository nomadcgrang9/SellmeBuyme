import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function cleanupNamyangjuData() {
  console.log('\n🗑️  남양주 게시판 데이터 삭제 시작...');

  try {
    const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

    // 1. job_postings 삭제
    console.log('\n1️⃣  job_postings 테이블에서 남양주 공고 삭제 중...');
    const { data: jobs, error: jobsError } = await supabase
      .from('job_postings')
      .delete()
      .eq('organization', '남양주교육지원청 구인구직')
      .select();

    if (jobsError) {
      console.error('   ❌ job_postings 삭제 실패:', jobsError.message);
    } else {
      console.log(`   ✅ job_postings 삭제 완료: ${jobs?.length || 0}개`);
    }

    // 2. crawl_logs 삭제
    console.log('\n2️⃣  crawl_logs 테이블에서 남양주 로그 삭제 중...');
    const { data: logs, error: logsError } = await supabase
      .from('crawl_logs')
      .delete()
      .eq('board_id', boardId)
      .select();

    if (logsError) {
      console.error('   ❌ crawl_logs 삭제 실패:', logsError.message);
    } else {
      console.log(`   ✅ crawl_logs 삭제 완료: ${logs?.length || 0}개`);
    }

    // 3. crawl_boards 삭제
    console.log('\n3️⃣  crawl_boards 테이블에서 남양주 게시판 삭제 중...');
    const { data: board, error: boardError } = await supabase
      .from('crawl_boards')
      .delete()
      .eq('id', boardId)
      .select();

    if (boardError) {
      console.error('   ❌ crawl_boards 삭제 실패:', boardError.message);
    } else {
      console.log(`   ✅ crawl_boards 삭제 완료: ${board?.length || 0}개`);
    }

    console.log('\n✅ 남양주 게시판 데이터 삭제 완료!');
    console.log('\n📋 다음 단계:');
    console.log('   1. 웹 관리자 페이지에서 "AI 크롤러 생성" 버튼 클릭');
    console.log('   2. URL: https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656');
    console.log('   3. 게시판명: 남양주교육지원청 구인구직');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

cleanupNamyangjuData();

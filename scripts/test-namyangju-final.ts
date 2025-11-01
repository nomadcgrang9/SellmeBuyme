import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 구리남양주 게시판 데이터 확인\n');

  // 1. crawl_boards 테이블에서 구리남양주 게시판 확인
  const { data: boards, error: boardsError } = await supabase
    .from('crawl_boards')
    .select('*')
    .ilike('name', '%구리%남양주%')
    .order('created_at', { ascending: false });

  if (boardsError) {
    console.error('❌ crawl_boards 조회 실패:', boardsError.message);
    return;
  }

  console.log(`📋 구리남양주 게시판 찾기 결과: ${boards?.length || 0}개\n`);

  if (boards && boards.length > 0) {
    boards.forEach((board, index) => {
      console.log(`\n게시판 ${index + 1}:`);
      console.log(`  ID: ${board.id}`);
      console.log(`  이름: ${board.name}`);
      console.log(`  URL: ${board.board_url}`);
      console.log(`  마지막 크롤링: ${board.last_crawled_at || '없음'}`);
      console.log(`  크롤러 코드: ${board.crawler_source_code ? '있음 (' + board.crawler_source_code.length + '자)' : '없음'}`);
    });
  }

  // 2. job_postings 테이블에서 최근 구리남양주 공고 확인
  console.log('\n\n📄 최근 구리남양주 공고 5개:\n');

  const { data: jobs, error: jobsError } = await supabase
    .from('job_postings')
    .select('id, organization, title, location, attachment_url, created_at')
    .ilike('organization', '%남양주%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobsError) {
    console.error('❌ job_postings 조회 실패:', jobsError.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️  구리남양주 공고가 없습니다.\n');
  } else {
    jobs.forEach((job, index) => {
      console.log(`\n공고 ${index + 1}:`);
      console.log(`  제목: ${job.title}`);
      console.log(`  기관: ${job.organization}`);
      console.log(`  지역: ${JSON.stringify(job.location)}`);
      console.log(`  첨부파일: ${job.attachment_url ? '있음' : '❌ 없음'}`);
      console.log(`  등록일: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
    });
  }

  // 3. 지역이 null이거나 빈 배열인 남양주 공고 확인
  console.log('\n\n⚠️  지역 정보 누락된 남양주 관련 공고:\n');

  const { data: missingLocation, error: missingError } = await supabase
    .from('job_postings')
    .select('id, organization, title, location, created_at')
    .ilike('organization', '%남양주%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!missingError && missingLocation) {
    const problematic = missingLocation.filter(job =>
      !job.location ||
      (Array.isArray(job.location) && job.location.length === 0)
    );

    if (problematic.length > 0) {
      console.log(`발견된 문제 공고: ${problematic.length}개\n`);
      problematic.forEach((job, index) => {
        console.log(`${index + 1}. ${job.title}`);
        console.log(`   기관: ${job.organization}`);
        console.log(`   location 값: ${JSON.stringify(job.location)}`);
        console.log(`   등록일: ${new Date(job.created_at).toLocaleString('ko-KR')}\n`);
      });
    } else {
      console.log('✅ 모든 남양주 공고에 지역 정보가 있습니다.\n');
    }
  }
}

main().catch(console.error);

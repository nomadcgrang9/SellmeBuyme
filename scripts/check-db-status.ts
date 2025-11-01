import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkDBStatus() {
  console.log('\n📊 Supabase DB 상태 확인\n');

  // 1. crawl_boards 테이블에서 남양주 게시판 정보 확인
  console.log('1️⃣ crawl_boards 테이블 - 남양주 게시판 정보');
  console.log('='.repeat(80));

  const { data: boards, error: boardError } = await supabase
    .from('crawl_boards')
    .select('id, name, crawler_source_code, approved_at, last_crawled_at')
    .ilike('name', '%남양주%');

  if (boardError) {
    console.error('❌ 에러:', boardError);
  } else {
    for (const board of boards || []) {
      console.log(`\n게시판: ${board.name}`);
      console.log(`ID: ${board.id}`);
      console.log(`승인 상태: ${board.approved_at ? '승인됨' : '대기중'}`);
      console.log(`마지막 크롤링: ${board.last_crawled_at || '없음'}`);
      console.log(`코드 길이: ${board.crawler_source_code?.length || 0}자`);

      // organization 필드가 코드에 포함되어 있는지 확인
      if (board.crawler_source_code) {
        const hasOrganization = board.crawler_source_code.includes('organization:');
        console.log(`organization 필드 포함: ${hasOrganization ? '✅ 있음' : '❌ 없음'}`);

        if (hasOrganization) {
          const orgMatch = board.crawler_source_code.match(/organization:\s*([^,\n}]+)/);
          if (orgMatch) {
            console.log(`organization 값: ${orgMatch[1].trim()}`);
          }
        }
      }
    }
  }

  // 2. job_postings 테이블에서 남양주 관련 데이터 확인
  console.log('\n\n2️⃣ job_postings 테이블 - 남양주 게시판 데이터');
  console.log('='.repeat(80));

  const { data: jobs, error: jobError } = await supabase
    .from('job_postings')
    .select('id, organization, title, created_at, source_url')
    .or('organization.ilike.%남양주%,source_url.ilike.%goegn%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (jobError) {
    console.error('❌ 에러:', jobError);
  } else {
    console.log(`\n총 ${jobs?.length || 0}개의 게시글 발견\n`);

    if (jobs && jobs.length > 0) {
      for (const job of jobs) {
        console.log(`\n📄 ${job.title.substring(0, 50)}...`);
        console.log(`   Organization: ${job.organization}`);
        console.log(`   생성일: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
        console.log(`   URL: ${job.source_url?.substring(0, 80)}...`);
      }
    } else {
      console.log('⚠️  남양주 관련 게시글이 DB에 없습니다.');
    }
  }

  // 3. 최근 크롤링 로그 확인
  console.log('\n\n3️⃣ crawl_logs 테이블 - 최근 크롤링 로그');
  console.log('='.repeat(80));

  const { data: logs, error: logError } = await supabase
    .from('crawl_logs')
    .select('board_name, total_crawled, successful_saves, failed_saves, created_at')
    .ilike('board_name', '%남양주%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logError) {
    console.error('❌ 에러:', logError);
  } else {
    if (logs && logs.length > 0) {
      for (const log of logs) {
        console.log(`\n🕐 ${new Date(log.created_at).toLocaleString('ko-KR')}`);
        console.log(`   게시판: ${log.board_name}`);
        console.log(`   크롤링: ${log.total_crawled}개`);
        console.log(`   성공: ${log.successful_saves}개 | 실패: ${log.failed_saves}개`);
      }
    } else {
      console.log('\n⚠️  크롤링 로그가 없습니다.');
    }
  }

  console.log('\n\n✅ DB 상태 확인 완료\n');
}

checkDBStatus().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkGapyeongCrawler() {
  console.log('=== 가평 크롤러 상태 확인 ===\n');

  // 1. crawl_boards에서 가평 게시판 확인
  const { data: boards, error: boardError } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url, region, is_local_government, crawler_source_code')
    .or('name.ilike.%가평%,board_url.ilike.%가평%')
    .order('created_at', { ascending: false })
    .limit(3);

  if (boardError) {
    console.error('❌ crawl_boards 조회 실패:', boardError);
    return;
  }

  if (!boards || boards.length === 0) {
    console.log('❌ 가평 게시판을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ 가평 게시판 ${boards.length}개 발견:\n`);

  for (const board of boards) {
    console.log(`게시판 ID: ${board.id}`);
    console.log(`게시판명: ${board.name}`);
    console.log(`URL: ${board.board_url}`);
    console.log(`DB region 필드: ${board.region || 'NULL'}`);
    console.log(`기초자치단체: ${board.is_local_government ? '예' : '아니오'}`);

    // 크롤러 코드에서 location 하드코딩 확인
    if (board.crawler_source_code) {
      const locationMatch = board.crawler_source_code.match(/location:\s*['"]([^'"]+)['"]/);
      if (locationMatch) {
        console.log(`✅ 크롤러 코드에 하드코딩된 location: "${locationMatch[1]}"`);
      } else {
        const dynamicLocationMatch = board.crawler_source_code.match(/location:\s*\(/);
        if (dynamicLocationMatch) {
          console.log(`⚠️  크롤러 코드에 동적 location 추출 로직 있음 (하드코딩 아님)`);
        } else {
          console.log(`❌ 크롤러 코드에 location 설정을 찾을 수 없음`);
        }
      }
    } else {
      console.log('❌ 크롤러 코드가 없습니다.');
    }
    console.log('---\n');
  }

  // 2. job_postings에서 최근 가평 게시판 크롤링 결과 확인
  if (boards.length > 0) {
    const boardId = boards[0].id;
    console.log(`\n=== 최근 크롤링된 공고 (crawl_board_id = ${boardId}) ===\n`);

    const { data: jobs, error: jobError } = await supabase
      .from('job_postings')
      .select('id, title, location, organization, created_at')
      .eq('crawl_board_id', boardId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobError) {
      console.error('❌ job_postings 조회 실패:', jobError);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('❌ 이 게시판에서 크롤링된 공고가 없습니다.');
    } else {
      console.log(`✅ 총 ${jobs.length}개 공고 발견:\n`);
      for (const job of jobs) {
        console.log(`공고 ID: ${job.id}`);
        console.log(`제목: ${job.title}`);
        console.log(`기관: ${job.organization}`);
        console.log(`지역: ${job.location || '미상'} ${job.location === '미상' ? '❌' : '✅'}`);
        console.log(`생성일: ${job.created_at}`);
        console.log('---\n');
      }
    }
  }
}

checkGapyeongCrawler();

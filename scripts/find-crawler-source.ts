import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 공고의 크롤 소스 추적\n');

  // 공고 1, 2 + 3 조회
  const { data: jobs, error: jobsError } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, crawl_source_id')
    .in('title', ['특기적성 강사', '교육공무직원(특수교육지도사)', '방과후 과정 운영 인력'])
    .order('created_at', { ascending: false })
    .limit(3);

  if (jobsError || !jobs) {
    console.error('❌ job_postings 조회 실패:', jobsError?.message);
    return;
  }

  for (const job of jobs) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`${job.title} (${job.organization})`);
    console.log(`location: ${JSON.stringify(job.location)}`);
    console.log(`crawl_source_id: ${job.crawl_source_id || '없음'}`);

    if (job.crawl_source_id) {
      // crawl_boards에서 크롤 소스 정보 가져오기
      const { data: boards, error: boardError } = await supabase
        .from('crawl_boards')
        .select('id, name, board_url, crawler_source_code')
        .eq('id', job.crawl_source_id);

      if (boardError) {
        console.log(`  ⚠️  crawl_boards 조회 실패: ${boardError.message}`);
        continue;
      }

      const board = boards?.[0];

      if (board) {
        console.log(`\n📋 크롤 게시판 정보:`);
        console.log(`  이름: ${board.name}`);
        console.log(`  URL: ${board.board_url}`);
        console.log(`  크롤러 코드: ${board.crawler_source_code ? '있음 (' + board.crawler_source_code.length + '자)' : '없음'}`);

        // 크롤러 코드에서 location 처리 부분 확인
        if (board.crawler_source_code) {
          const locationMatch = board.crawler_source_code.match(/const location = (\[.*?\]|".*?"|'.*?');/);
          if (locationMatch) {
            console.log(`  \n  크롤러 코드의 location 설정:`);
            console.log(`  ${locationMatch[0]}`);
          }
        }
      }
    }
  }
}

main().catch(console.error);

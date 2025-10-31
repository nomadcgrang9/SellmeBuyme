import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function checkExistingBoards() {
  const boardIds = {
    '경기도': 'f4c852f1-f49a-42c5-8823-0edd346f99bb',
    '성남': '5a94f47d-5feb-4821-99af-f8805cc3d619',
    '의정부': '55d09cac-71aa-48d5-a8b8-bbd9181970bb'
  };

  for (const [name, id] of Object.entries(boardIds)) {
    const { data, error } = await supabase
      .from('crawl_boards')
      .select('name, last_crawled_at, last_success_at, error_count, error_message')
      .eq('id', id)
      .single();

    if (error) {
      console.log(`${name}: 조회 실패`, error);
      continue;
    }

    console.log(`\n=== ${name} 게시판 ===`);
    console.log(`최근 크롤링: ${data.last_crawled_at || '없음'}`);
    console.log(`최근 성공: ${data.last_success_at || '없음'}`);
    console.log(`에러 횟수: ${data.error_count}`);
    if (data.error_message) {
      console.log(`에러 메시지: ${data.error_message}`);
    }
  }

  // 최근 job_postings 확인
  console.log('\n=== 최근 등록된 공고 (최근 10개) ===');
  const { data: jobs, error: jobError } = await supabase
    .from('job_postings')
    .select('title, organization, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  if (jobError) {
    console.error('공고 조회 실패:', jobError);
    return;
  }

  jobs.forEach(job => {
    const date = new Date(job.created_at).toLocaleString('ko-KR');
    console.log(`- [${job.organization}] ${job.title} (${date})`);
  });
}

checkExistingBoards().catch(err => console.error('Error:', err));

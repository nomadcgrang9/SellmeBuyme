import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function checkLog() {
  const logId = 'cac4ccad-0d69-4dfb-9158-9072d42d6eea';

  const { data, error } = await supabase
    .from('crawl_logs')
    .select('*')
    .eq('id', logId)
    .single();

  if (error) {
    console.error('로그 조회 실패:', error);
    return;
  }

  console.log('=== 크롤링 로그 ===');
  console.log('ID:', data.id);
  console.log('Board ID:', data.board_id);
  console.log('Status:', data.status);
  console.log('Started At:', data.started_at);
  console.log('Completed At:', data.completed_at || '진행 중');
  console.log('Error Log:', data.error_log || '없음');

  // 해당 board의 최근 공고 확인
  console.log('\n=== 남양주 게시판 최근 공고 ===');
  const { data: jobs, error: jobError } = await supabase
    .from('job_postings')
    .select('title, organization, detail_content, created_at')
    .ilike('organization', '%남양주%')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobError) {
    console.error('공고 조회 실패:', jobError);
    return;
  }

  if (jobs.length === 0) {
    console.log('등록된 공고 없음');
  } else {
    jobs.forEach(job => {
      const date = new Date(job.created_at).toLocaleString('ko-KR');
      const contentLength = job.detail_content?.length || 0;
      console.log(`- ${job.title} (본문: ${contentLength}자, ${date})`);
    });
  }
}

checkLog().catch(err => console.error('Error:', err));

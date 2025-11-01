import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkData() {
  console.log('=== 남양주 DB 저장 상태 확인 ===\n');

  // 1. job_postings 확인
  const { data: jobs, error: jobError } = await supabase
    .from('job_postings')
    .select('id, organization, title, location, compensation, deadline, detail_content, created_at')
    .eq('organization', '남양주교육지원청 구인구직')
    .order('created_at', { ascending: false });

  if (jobError) {
    console.error('❌ job_postings 조회 실패:', jobError.message);
  } else {
    console.log(`📊 job_postings 저장된 건수: ${jobs?.length || 0}건\n`);
    jobs?.slice(0, 3).forEach((job, idx) => {
      console.log(`[${idx + 1}]`);
      console.log(`  organization: "${job.organization}"`);
      console.log(`  title: "${job.title?.substring(0, 50)}..."`);
      console.log(`  location: "${job.location}"`);
      console.log(`  compensation: "${job.compensation}"`);
      console.log(`  deadline: "${job.deadline}"`);
      console.log(`  detail_content 길이: ${(job.detail_content || '').length}자`);
      console.log(`  created_at: ${job.created_at}\n`);
    });
  }

  // 2. dev_board_submissions 확인
  const { data: submissions, error: subError } = await supabase
    .from('dev_board_submissions')
    .select('id, crawl_board_id, board_name, status, approved_at')
    .order('created_at', { ascending: false });

  if (subError) {
    console.error('❌ dev_board_submissions 조회 실패:', subError.message);
  } else {
    console.log(`\n📋 dev_board_submissions 전체:\n`);
    submissions?.forEach((sub, idx) => {
      console.log(`[${idx + 1}]`);
      console.log(`  board_name: "${sub.board_name}"`);
      console.log(`  status: "${sub.status}"`);
      console.log(`  crawl_board_id: ${sub.crawl_board_id}\n`);
    });
  }

  // 3. dev_board_submissions에서 남양주 찾기
  const { data: nmySubmission } = await supabase
    .from('dev_board_submissions')
    .select('crawl_board_id')
    .ilike('board_name', '%남양주%')
    .single();

  if (nmySubmission) {
    console.log(`\n🔍 남양주 crawl_board_id: ${nmySubmission.crawl_board_id}`);

    // 4. dev_generated_crawlers 확인
    const { data: crawler, error: crawlerError } = await supabase
      .from('dev_generated_crawlers')
      .select('id, crawl_board_id, code_length, approved_at')
      .eq('crawl_board_id', nmySubmission.crawl_board_id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (crawlerError) {
      console.error('❌ dev_generated_crawlers 조회 실패:', crawlerError.message);
    } else if (crawler && crawler.length > 0) {
      console.log(`\n🤖 최신 생성된 크롤러:`);
      console.log(`  code_length: ${crawler[0].code_length}자`);
      console.log(`  approved_at: ${crawler[0].approved_at}`);
    }
  }
}

checkData();

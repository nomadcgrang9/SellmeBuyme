import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 문제 공고 상세 추적\n');

  // 공고 1, 2 조회
  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('*')
    .in('title', ['특기적성 강사', '교육공무직원(특수교육지도사)'])
    .order('created_at', { ascending: false })
    .limit(2);

  if (error || !jobs) {
    console.error('❌ 조회 실패:', error?.message);
    return;
  }

  jobs.forEach((job, index) => {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`공고 ${index + 1}: ${job.title}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    console.log(`ID: ${job.id}`);
    console.log(`기관: ${job.organization}`);
    console.log(`location (타입: ${typeof job.location}): ${JSON.stringify(job.location)}`);
    console.log(`출처 URL: ${job.source_url}`);
    console.log(`attachment_url: ${job.attachment_url || '❌ 없음'}`);
    console.log(`등록일: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
    console.log(`updated_at: ${new Date(job.updated_at).toLocaleString('ko-KR')}`);

    console.log(`\n📋 Structured Content:`);
    if (job.structured_content) {
      console.log(JSON.stringify(job.structured_content, null, 2).substring(0, 500));
    } else {
      console.log('없음');
    }

    console.log(`\n📝 Tags: ${JSON.stringify(job.tags)}`);
    console.log(`학교급: ${job.school_level}`);
    console.log(`과목: ${job.subject}`);
  });

  // 비교: 한별초등학교 공고 (location이 제대로 된 것)
  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`비교: 정상 공고 (한별초등학교)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  const { data: goodJob } = await supabase
    .from('job_postings')
    .select('*')
    .eq('organization', '한별초등학교병설유치원')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (goodJob) {
    console.log(`기관: ${goodJob.organization}`);
    console.log(`제목: ${goodJob.title}`);
    console.log(`location (타입: ${typeof goodJob.location}): ${JSON.stringify(goodJob.location)}`);
    console.log(`등록일: ${new Date(goodJob.created_at).toLocaleString('ko-KR')}`);
  }
}

main().catch(console.error);

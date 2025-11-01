import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkUijeongbuAttachment() {
  // 의정부 게시판에서 최근 공고 3개 조회
  const { data: uijeongbuJobs } = await supabase
    .from('job_postings')
    .select('organization, attachment_url, source')
    .eq('location', '의정부')
    .not('attachment_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('=== 의정부 공고 attachment_url ===\n');
  uijeongbuJobs?.forEach(job => {
    console.log(`${job.organization}:`);
    console.log(`  ${job.attachment_url}\n`);
  });

  // 구리남양주 게시판에서 최근 공고 3개 조회
  const { data: guriJobs } = await supabase
    .from('job_postings')
    .select('organization, attachment_url, source')
    .eq('location', '구리남양주')
    .not('attachment_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  console.log('=== 구리남양주 공고 attachment_url ===\n');
  guriJobs?.forEach(job => {
    console.log(`${job.organization}:`);
    console.log(`  ${job.attachment_url}\n`);
  });
}

checkUijeongbuAttachment();

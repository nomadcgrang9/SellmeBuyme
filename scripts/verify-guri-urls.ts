import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyGuriUrls() {
  const { data: jobs } = await supabase
    .from('job_postings')
    .select('organization, attachment_url')
    .eq('crawl_source_id', '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd')
    .not('attachment_url', 'is', null)
    .limit(3);

  console.log('=== 구리남양주 공고 URL 샘플 ===\n');

  jobs?.forEach(job => {
    console.log(`${job.organization}:`);
    console.log(`  apikey 포함: ${job.attachment_url.includes('apikey=') ? '✅ YES' : '❌ NO'}`);
    console.log(`  URL: ${job.attachment_url.substring(0, 150)}...`);
    console.log('');
  });
}

verifyGuriUrls();

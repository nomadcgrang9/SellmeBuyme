import { createClient } from '@supabase/supabase-js';
import * as process from 'process';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkAttachmentUrls() {
  try {
    // 최근 10개 남양주 job_postings 확인
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('id, organization, title, location, attachment_url, source_url, created_at')
      .eq('location', '남양주')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }

    if (!jobs || jobs.length === 0) {
      console.log('❌ No jobs found with location="남양주"');
      process.exit(0);
    }

    console.log(`✅ Found ${jobs.length} jobs with location="남양주":\n`);

    for (const job of jobs) {
      console.log(`Title: ${job.title}`);
      console.log(`  Organization: ${job.organization}`);
      console.log(`  Location: ${job.location}`);
      console.log(`  Attachment URL: ${job.attachment_url || '❌ NULL'}`);
      console.log(`  Source URL: ${job.source_url}`);
      console.log(`  Created: ${job.created_at}`);
      console.log('');
    }

    // attachment_url이 null인 개수 확인
    const nullCount = jobs.filter((j) => !j.attachment_url).length;
    console.log(`📊 Summary:`);
    console.log(`  Total: ${jobs.length}`);
    console.log(`  With attachment: ${jobs.length - nullCount}`);
    console.log(`  Without attachment (NULL): ${nullCount}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAttachmentUrls();

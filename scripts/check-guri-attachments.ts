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

async function checkGuriAttachments() {
  try {
    const { data: jobs } = await supabase
      .from('job_postings')
      .select('id, organization, title, attachment_url, source_url')
      .ilike('location', '%구리%')
      .limit(10);

    console.log('📎 구리남양주 첨부파일 확인:\n');
    if (!jobs || jobs.length === 0) {
      console.log('❌ No jobs found');
      return;
    }

    jobs.forEach((j) => {
      console.log(`- ${j.organization}: ${j.title}`);
      console.log(`  Attachment: ${j.attachment_url || '❌ NULL'}`);
      console.log(`  Source: ${j.source_url}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkGuriAttachments();

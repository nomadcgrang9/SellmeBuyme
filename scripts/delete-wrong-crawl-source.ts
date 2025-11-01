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

async function deleteWrongCrawlSource() {
  try {
    const wrongCrawlSourceId = '857ae721-2806-4e59-b2e7-73473c8c2b68';

    console.log(`🗑️  Deleting jobs with wrong crawl_source_id: ${wrongCrawlSourceId}\n`);

    // 삭제 전 확인
    const { data: before } = await supabase
      .from('job_postings')
      .select('id, title', { count: 'exact' })
      .eq('crawl_source_id', wrongCrawlSourceId);

    console.log(`Before: ${before?.length || 0} jobs\n`);

    // 삭제 실행
    const { error, count } = await supabase
      .from('job_postings')
      .delete()
      .eq('crawl_source_id', wrongCrawlSourceId)
      .select('id', { count: 'exact' });

    if (error) {
      console.error('❌ Delete error:', error);
      process.exit(1);
    }

    console.log(`✅ Deleted: ${count} jobs`);

    // 삭제 후 확인
    const { data: after } = await supabase
      .from('job_postings')
      .select('id', { count: 'exact' })
      .eq('crawl_source_id', wrongCrawlSourceId);

    console.log(`After: ${after?.length || 0} jobs\n`);

    if ((after?.length || 0) === 0) {
      console.log('✅ All wrong crawl_source_id jobs deleted!');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteWrongCrawlSource();

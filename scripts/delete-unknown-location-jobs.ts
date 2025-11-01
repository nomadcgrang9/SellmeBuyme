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

async function deleteUnknownLocationJobs() {
  try {
    console.log('🗑️  Deleting "지역 미상" job_postings...\n');

    // 삭제 전 확인
    const { data: beforeDelete, error: beforeError } = await supabase
      .from('job_postings')
      .select('id', { count: 'exact' })
      .eq('location', '지역 미상');

    if (beforeError) {
      console.error('❌ Error:', beforeError);
      process.exit(1);
    }

    const beforeCount = beforeDelete?.length || 0;
    console.log(`Before: ${beforeCount} jobs with location="지역 미상"`);

    // 삭제 실행
    const { error: deleteError, count } = await supabase
      .from('job_postings')
      .delete()
      .eq('location', '지역 미상')
      .select('id', { count: 'exact' });

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      process.exit(1);
    }

    console.log(`\n✅ Deleted: ${count} jobs`);

    // 삭제 후 확인
    const { data: afterDelete } = await supabase
      .from('job_postings')
      .select('id', { count: 'exact' })
      .eq('location', '지역 미상');

    const afterCount = afterDelete?.length || 0;
    console.log(`After: ${afterCount} jobs with location="지역 미상"`);

    if (afterCount === 0) {
      console.log('\n✅ All "지역 미상" jobs successfully deleted!');
    } else {
      console.log(`\n⚠️  ${afterCount} jobs still remain`);
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

deleteUnknownLocationJobs();

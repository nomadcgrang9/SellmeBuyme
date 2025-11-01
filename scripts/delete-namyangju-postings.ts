import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// SERVICE_ROLE_KEY 사용하여 RLS 우회
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteNamyangju() {
  console.log('=== 남양주 공고 삭제 ===\n');

  // 삭제 전 확인
  const { data: before, error: beforeError } = await supabase
    .from('job_postings')
    .select('id, title, organization')
    .ilike('organization', '%남양주%');

  if (beforeError) {
    console.log('❌ 조회 실패:', beforeError.message);
    return;
  }

  console.log(`삭제 대상: ${before?.length || 0}개\n`);
  before?.forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
  });

  // 삭제 실행
  console.log('\n삭제 중...');
  const { error } = await supabase
    .from('job_postings')
    .delete()
    .ilike('organization', '%남양주%');

  if (error) {
    console.log('❌ 삭제 실패:', error.message);
    return;
  }

  console.log('✅ 삭제 완료');

  // 삭제 후 확인
  const { data: after } = await supabase
    .from('job_postings')
    .select('id')
    .ilike('organization', '%남양주%');

  console.log(`\n남은 공고: ${after?.length || 0}개`);
}

deleteNamyangju();

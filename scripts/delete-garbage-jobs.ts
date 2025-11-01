import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🗑️  7개의 쓰레기 공고 삭제 시작\n');

  // 남양주교육지원청-구인구직으로 저장된 모든 공고 조회
  const { data: jobs, error: selectError } = await supabase
    .from('job_postings')
    .select('id, title, organization')
    .eq('organization', '남양주교육지원청-구인구직');

  if (selectError) {
    console.error('❌ 조회 실패:', selectError.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️  삭제할 공고 없음');
    return;
  }

  console.log(`발견된 공고: ${jobs.length}개\n`);

  jobs.forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   ID: ${job.id}\n`);
  });

  // 모두 삭제
  const { error: deleteError } = await supabase
    .from('job_postings')
    .delete()
    .eq('organization', '남양주교육지원청-구인구직');

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message);
    return;
  }

  console.log(`✅ ${jobs.length}개 공고 삭제 완료`);
}

main().catch(console.error);

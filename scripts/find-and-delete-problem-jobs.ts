import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🔍 문제 공고 찾기\n');

  // 최근 100개 공고 조회
  const { data: allJobs, error: queryError } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (queryError) {
    console.error('❌ 조회 실패:', queryError.message);
    return;
  }

  console.log(`총 ${allJobs?.length || 0}개 공고 중에서 검색...\n`);

  // 문제 공고 찾기
  const problemJobs = allJobs?.filter(job =>
    job.location === '지역 미상' &&
    (job.title.includes('특기적성 강사') || job.title.includes('교육공무직원(특수교육지도사)'))
  ) || [];

  if (problemJobs.length === 0) {
    console.log('✅ 문제 공고 없음 - 모두 삭제됨');
    return;
  }

  console.log(`찾은 문제 공고: ${problemJobs.length}개\n`);

  problemJobs.forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   ID: ${job.id}`);
    console.log(`   기관: ${job.organization}`);
    console.log(`   지역: ${job.location}`);
    console.log(`   등록: ${new Date(job.created_at).toLocaleString('ko-KR')}\n`);
  });

  // 삭제
  console.log('🗑️  삭제 중...\n');

  const ids = problemJobs.map(j => j.id);
  const { error: deleteError } = await supabase
    .from('job_postings')
    .delete()
    .in('id', ids);

  if (deleteError) {
    console.error('❌ 삭제 실패:', deleteError.message);
    return;
  }

  console.log(`✅ ${problemJobs.length}개 공고 삭제 완료\n`);

  // 검증: 다시 조회해서 정말 없는지 확인
  console.log('🔍 검증 - 삭제 확인 중...\n');

  const { data: remaining } = await supabase
    .from('job_postings')
    .select('id, title, organization, location')
    .eq('location', '지역 미상')
    .in('title', ['특기적성 강사', '교육공무직원(특수교육지도사)']);

  if (!remaining || remaining.length === 0) {
    console.log('✅ 확인됨 - 문제 공고 모두 삭제됨');
  } else {
    console.log(`⚠️  여전히 ${remaining.length}개 남음:`);
    remaining.forEach(j => console.log(`  - ${j.title}`));
  }
}

main().catch(console.error);

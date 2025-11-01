import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n🔍 최근 등록된 모든 공고 확인\n');

  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('id, organization, title, location, attachment_url, created_at, source_url')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ 조회 실패:', error.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️  공고가 없습니다.\n');
    return;
  }

  console.log(`📋 총 ${jobs.length}개 공고 발견\n`);

  jobs.forEach((job, index) => {
    console.log(`\n공고 ${index + 1}:`);
    console.log(`  제목: ${job.title}`);
    console.log(`  기관: ${job.organization}`);
    console.log(`  지역: ${JSON.stringify(job.location) || '❌ 없음'}`);
    console.log(`  첨부파일: ${job.attachment_url ? '✅ 있음' : '❌ 없음'}`);
    console.log(`  등록일: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
    console.log(`  출처: ${job.source_url?.substring(0, 60)}...`);
  });

  // 통계
  const noLocation = jobs.filter(j => !j.location || (Array.isArray(j.location) && j.location.length === 0));
  const noAttachment = jobs.filter(j => !j.attachment_url);

  console.log('\n\n📊 통계:');
  console.log(`  지역 정보 없음: ${noLocation.length}개`);
  console.log(`  첨부파일 없음: ${noAttachment.length}개`);

  if (noLocation.length > 0) {
    console.log('\n\n⚠️  지역 정보 없는 공고:');
    noLocation.forEach((job, i) => {
      console.log(`  ${i + 1}. ${job.organization} - ${job.title}`);
    });
  }

  if (noAttachment.length > 0) {
    console.log('\n\n⚠️  첨부파일 없는 공고:');
    noAttachment.forEach((job, i) => {
      console.log(`  ${i + 1}. ${job.organization} - ${job.title}`);
    });
  }
}

main().catch(console.error);

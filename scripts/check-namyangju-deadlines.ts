import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('=== 남양주 공고 마감일 확인 ===\n');

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, deadline, created_at')
    .ilike('organization', '%남양주%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.log('❌ 에러:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('❌ 남양주 공고가 없습니다.');
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`총 ${data.length}개 발견\n`);
  console.log(`오늘 날짜: ${today.toISOString()}\n`);

  data.forEach((job, i) => {
    const deadlineDate = job.deadline ? new Date(job.deadline) : null;
    const isPassed = deadlineDate && deadlineDate < today;

    console.log(`${i + 1}. ${job.title?.substring(0, 50)}`);
    console.log(`   조직: ${job.organization}`);
    console.log(`   마감일: ${job.deadline || 'NULL'}`);
    console.log(`   마감 여부: ${isPassed ? '❌ 마감됨' : '✅ 유효함'}`);
    console.log(`   생성일: ${job.created_at}`);
    console.log();
  });

  const passedCount = data.filter(job => {
    const deadlineDate = job.deadline ? new Date(job.deadline) : null;
    return deadlineDate && deadlineDate < today;
  }).length;

  console.log(`\n📊 요약:`);
  console.log(`   전체: ${data.length}개`);
  console.log(`   마감됨: ${passedCount}개`);
  console.log(`   유효함: ${data.length - passedCount}개`);
}

check();

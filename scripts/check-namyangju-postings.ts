import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function check() {
  console.log('=== 남양주 공고 확인 ===\n');

  const { data, error, count } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact' })
    .ilike('organization', '%남양주%')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.log('❌ 에러:', error.message);
    return;
  }

  console.log(`총 ${count}개 발견\n`);

  if (!data || data.length === 0) {
    console.log('❌ 남양주 공고가 없습니다.');
    return;
  }

  data.forEach((job, i) => {
    console.log(`${i + 1}. ${job.title}`);
    console.log(`   조직: ${job.organization}`);
    console.log(`   본문 길이: ${job.detail_content?.length || 0}자`);
    console.log(`   이미지: ${job.has_content_images ? 'O' : 'X'}`);
    console.log(`   스크린샷: ${job.screenshot_base64 ? 'O' : 'X'}`);
    console.log(`   생성일: ${job.created_at}`);
    console.log(`   source_url: ${job.source_url}`);
    console.log();
  });
}

check();

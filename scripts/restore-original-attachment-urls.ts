import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function restoreOriginalUrls() {
  console.log('🔄 Edge Function URL을 원본 URL로 복원 중...\n');

  const { data: jobs } = await supabase
    .from('job_postings')
    .select('id, organization, attachment_url')
    .ilike('attachment_url', '%/functions/v1/download-attachment%')
    .limit(100);

  if (!jobs || jobs.length === 0) {
    console.log('✅ Edge Function URL을 사용하는 공고가 없습니다.');
    return;
  }

  console.log(`📊 총 ${jobs.length}개 공고 발견\n`);

  let updatedCount = 0;

  for (const job of jobs) {
    try {
      const urlObj = new URL(job.attachment_url);
      const originalUrl = urlObj.searchParams.get('url');

      if (!originalUrl) {
        console.log(`⚠️  ${job.organization}: 원본 URL을 찾을 수 없음`);
        continue;
      }

      console.log(`처리 중: ${job.organization}`);
      console.log(`  원본 URL: ${originalUrl.substring(0, 80)}...`);

      const { error } = await supabase
        .from('job_postings')
        .update({ attachment_url: originalUrl })
        .eq('id', job.id);

      if (error) {
        console.error(`  ❌ 업데이트 실패:`, error);
      } else {
        console.log(`  ✅ 복원 완료`);
        updatedCount++;
      }
    } catch (err) {
      console.error(`❌ ${job.organization} 처리 실패:`, err);
    }
    console.log('');
  }

  console.log('\n=== 복원 완료 ===');
  console.log(`✅ 복원: ${updatedCount}개`);
  console.log(`📊 총: ${jobs.length}개`);
}

restoreOriginalUrls();

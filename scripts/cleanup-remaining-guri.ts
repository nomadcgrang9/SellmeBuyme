import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function cleanupRemainingGuri() {
  console.log('\n🗑️  남은 구리남양주 공고 삭제 시작...');

  try {
    // 추가 키워드: 수택, 동인, 별가람, 송라 등
    const additionalKeywords = ['수택', '동인', '별가람', '송라'];

    for (const keyword of additionalKeywords) {
      console.log(`\n🔍 "${keyword}" 검색 중...`);

      const { data: jobs, error: searchError } = await supabase
        .from('job_postings')
        .select('id, organization, title')
        .ilike('organization', `%${keyword}%`);

      if (searchError) {
        console.error(`   ❌ 검색 실패:`, searchError.message);
        continue;
      }

      if (jobs && jobs.length > 0) {
        console.log(`   발견된 공고: ${jobs.length}개`);
        jobs.forEach(job => {
          console.log(`   - ${job.organization}: ${job.title}`);
        });

        console.log(`   🗑️  삭제 중...`);
        const { error: deleteError } = await supabase
          .from('job_postings')
          .delete()
          .ilike('organization', `%${keyword}%`);

        if (deleteError) {
          console.error(`   ❌ 삭제 실패:`, deleteError.message);
        } else {
          console.log(`   ✅ 삭제 완료`);
        }
      } else {
        console.log(`   발견된 공고 없음`);
      }
    }

    // 최종 확인: location 배열 확인
    console.log('\n🔍 location 필드로 최종 확인...');
    const { data: allJobs, error: allError } = await supabase
      .from('job_postings')
      .select('id, organization, title, location');

    if (!allError && allJobs) {
      // location에 "구리남양주" 포함된 것 필터링
      const guriJobs = allJobs.filter(job =>
        job.location &&
        Array.isArray(job.location) &&
        job.location.includes('구리남양주')
      );

      console.log(`   location에 "구리남양주" 포함된 공고: ${guriJobs.length}개`);

      if (guriJobs.length > 0) {
        guriJobs.forEach(job => {
          console.log(`   - ${job.organization}: ${job.title}`);
        });

        console.log(`\n   🗑️  ${guriJobs.length}개 공고 삭제 중...`);
        for (const job of guriJobs) {
          const { error: deleteError } = await supabase
            .from('job_postings')
            .delete()
            .eq('id', job.id);

          if (deleteError) {
            console.error(`   ❌ 삭제 실패 (ID: ${job.id}):`, deleteError.message);
          }
        }
        console.log(`   ✅ 삭제 완료`);
      }
    }

    console.log('\n✅ 남은 구리남양주 공고 삭제 완료!');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

cleanupRemainingGuri();

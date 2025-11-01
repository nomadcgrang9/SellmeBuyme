import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function cleanupAllNamyangjuGuri() {
  console.log('\n🗑️  남양주/구리 관련 모든 데이터 삭제 시작...');

  try {
    // 1. job_postings에서 location 필드가 "구리남양주"인 모든 데이터 조회 후 삭제
    console.log('\n1️⃣  job_postings 조회 (location 필드 기준):');

    // location 배열에 "구리남양주" 포함된 것 찾기
    const { data: jobsByLocation, error: locationError } = await supabase
      .from('job_postings')
      .select('id, organization, title, location')
      .contains('location', ['구리남양주']);

    if (locationError) {
      console.error('   ❌ location 조회 실패:', locationError.message);
    } else {
      console.log(`   발견된 공고 (location=구리남양주): ${jobsByLocation?.length || 0}개`);
      jobsByLocation?.slice(0, 10).forEach(job => {
        console.log(`   - ${job.organization}: ${job.title}`);
      });

      if (jobsByLocation && jobsByLocation.length > 0) {
        console.log(`\n   🗑️  ${jobsByLocation.length}개 공고 삭제 중...`);
        const { error: deleteError } = await supabase
          .from('job_postings')
          .delete()
          .contains('location', ['구리남양주']);

        if (deleteError) {
          console.error(`   ❌ 삭제 실패:`, deleteError.message);
        } else {
          console.log(`   ✅ 삭제 완료`);
        }
      }
    }

    // 2. organization 필드에 "남양주", "구리", "별내", "다산" 등 포함된 것도 삭제
    console.log('\n2️⃣  job_postings 조회 (organization 필드 기준):');

    const orgKeywords = ['남양주', '구리', '별내', '다산'];
    for (const keyword of orgKeywords) {
      const { data: jobsByOrg, error: orgError } = await supabase
        .from('job_postings')
        .select('id, organization, title')
        .ilike('organization', `%${keyword}%`);

      if (!orgError && jobsByOrg && jobsByOrg.length > 0) {
        console.log(`\n   발견된 공고 (organization 포함 "${keyword}"): ${jobsByOrg.length}개`);
        jobsByOrg.slice(0, 5).forEach(job => {
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
      }
    }

    // 3. 최종 확인
    console.log('\n3️⃣  최종 확인:');
    const { data: remainingJobs, error: checkError } = await supabase
      .from('job_postings')
      .select('id, organization, title, location')
      .or('location.cs.{"구리남양주"},organization.ilike.%남양주%,organization.ilike.%구리%,organization.ilike.%별내%,organization.ilike.%다산%');

    if (!checkError) {
      console.log(`   남은 공고: ${remainingJobs?.length || 0}개`);
      if (remainingJobs && remainingJobs.length > 0) {
        console.log('   ⚠️  아직 남아있는 공고:');
        remainingJobs.forEach(job => {
          console.log(`   - ${job.organization}: ${job.title} (location: ${JSON.stringify(job.location)})`);
        });
      }
    }

    console.log('\n✅ 남양주/구리 관련 데이터 삭제 완료!');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

cleanupAllNamyangjuGuri();

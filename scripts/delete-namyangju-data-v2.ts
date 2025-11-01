import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deleteNamyangjuData() {
  try {
    console.log('🗑️  남양주 관련 데이터 삭제 시작...\n');

    // job_postings에서 organization이 "남양주교육지원청 구인구직"인 데이터 찾기
    const { data: jobsToDelete, error: queryError } = await supabase
      .from('job_postings')
      .select('id, title, organization')
      .eq('organization', '남양주교육지원청 구인구직');

    if (queryError) {
      console.error('❌ 조회 실패:', queryError.message);
      return;
    }

    if (!jobsToDelete || jobsToDelete.length === 0) {
      console.log('⚠️  남양주 관련 job_postings가 없습니다.');
      return;
    }

    console.log(`📊 삭제 예정 데이터: ${jobsToDelete.length}건\n`);
    console.log('삭제될 공고 목록:');
    jobsToDelete.slice(0, 5).forEach((job, idx) => {
      console.log(`  ${idx + 1}. [${job.organization}] ${job.title.substring(0, 50)}...`);
    });
    if (jobsToDelete.length > 5) {
      console.log(`  ... 외 ${jobsToDelete.length - 5}건`);
    }
    console.log('');

    // 삭제 실행
    console.log('⚠️  확인: 위 데이터를 삭제하겠습니다.\n');

    const { error: deleteError, count } = await supabase
      .from('job_postings')
      .delete()
      .eq('organization', '남양주교육지원청 구인구직');

    if (deleteError) {
      console.error('❌ 삭제 실패:', deleteError.message);
      return;
    }

    console.log(`✅ 삭제 완료: ${count}건의 job_postings 삭제됨\n`);

    // 최종 확인
    const { data: remaining, error: finalCheckError } = await supabase
      .from('job_postings')
      .select('id', { count: 'exact' })
      .eq('organization', '남양주교육지원청 구인구직');

    if (finalCheckError) {
      console.error('❌ 최종 확인 실패:', finalCheckError.message);
      return;
    }

    console.log(`🎯 최종 확인: organization='남양주교육지원청 구인구직' 남은 건수 = ${remaining?.length || 0}건`);
    console.log('\n✅ 삭제 작업 완료! 이제 크롤러를 실행하면 새로운 정확한 데이터가 저장됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

deleteNamyangjuData();

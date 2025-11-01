import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixCheongSimLocation() {
  console.log('\n🔍 청심국제중학교 관련 공고 검색 중...\n');

  try {
    // 청심 관련 공고 찾기
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('*')
      .ilike('organization', '%청심%');

    if (error) {
      console.error('❌ 조회 실패:', error);
      process.exit(1);
    }

    console.log(`✅ 총 ${jobs.length}개의 청심 관련 공고 발견\n`);

    for (const job of jobs) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ID:', job.id);
      console.log('기관명:', job.organization);
      console.log('제목:', job.title);
      console.log('현재 지역:', job.location);
      console.log('생성일:', job.created_at);

      // 구리남양주로 되어있는 것을 가평으로 수정
      if (job.location && job.location.includes('구리남양주')) {
        console.log('\n🔧 지역 수정 필요: 구리남양주 → 가평');

        const updatedLocation = job.location.replace(/구리남양주/g, '가평');

        const { error: updateError } = await supabase
          .from('job_postings')
          .update({ location: updatedLocation })
          .eq('id', job.id);

        if (updateError) {
          console.error('❌ 수정 실패:', updateError);
        } else {
          console.log('✅ 수정 완료:', updatedLocation);
        }
      } else {
        console.log('✓ 지역 정보 정상');
      }
      console.log('');
    }

    console.log('✅ 청심국제중학교 지역 정보 수정 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

fixCheongSimLocation().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

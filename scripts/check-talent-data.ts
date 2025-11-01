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

async function checkTalentData() {
  console.log('\n🔍 인력 데이터 확인 중...\n');

  try {
    // 인력 데이터 조회 (status 컬럼 없음)
    const { data: talents, error } = await supabase
      .from('talents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ 조회 실패:', error);
      process.exit(1);
    }

    console.log(`✅ 총 ${talents.length}개의 활성 인력 데이터 발견\n`);

    if (talents.length === 0) {
      console.log('⚠️  인력 데이터가 하나도 없습니다!');
      console.log('   → 프론트엔드에서 보이는 인력 카드는 하드코딩된 데이터일 가능성이 높습니다.\n');
      return;
    }

    talents.forEach((talent, idx) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 #${idx + 1} 인력 데이터:`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('ID:', talent.id);
      console.log('이름:', JSON.stringify(talent.name));
      console.log('전문분야:', JSON.stringify(talent.specialty));
      console.log('태그:', JSON.stringify(talent.tags));
      console.log('지역:', JSON.stringify(talent.location));
      console.log('경력:', JSON.stringify(talent.experience));
      console.log('평점:', talent.rating);
      console.log('리뷰수:', talent.review_count);
      console.log('인증여부:', talent.is_verified);
      console.log('user_id:', talent.user_id);
      console.log('생성일:', talent.created_at);
      console.log('');
    });

    console.log('\n✅ 인력 데이터 확인 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

checkTalentData().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

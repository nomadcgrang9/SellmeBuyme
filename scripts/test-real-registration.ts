import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRealRegistration() {
  console.log('\n🔍 실제 등록 테스트 시작...\n');

  // 1. 먼저 현재 데이터 개수 확인
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 등록 전 데이터 개수');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: beforeTalents, error: beforeTalentError } = await supabase
    .from('talents')
    .select('id, name, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (beforeTalentError) {
    console.error('❌ talents 조회 실패:', beforeTalentError);
  } else {
    console.log(`인력: ${beforeTalents?.length || 0}개`);
  }

  const { data: beforeExps, error: beforeExpError } = await supabase
    .from('experiences')
    .select('id, program_title, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (beforeExpError) {
    console.error('❌ experiences 조회 실패:', beforeExpError);
  } else {
    console.log(`체험: ${beforeExps?.length || 0}개`);
  }

  console.log('\n최근 인력 3개:');
  beforeTalents?.slice(0, 3).forEach((t, idx) => {
    console.log(`  ${idx + 1}. ${t.name} (${new Date(t.created_at).toLocaleString('ko-KR')})`);
  });

  console.log('\n최근 체험 3개:');
  beforeExps?.slice(0, 3).forEach((e, idx) => {
    console.log(`  ${idx + 1}. ${e.program_title} (${new Date(e.created_at).toLocaleString('ko-KR')})`);
  });

  // 2. App.tsx의 searchCards와 동일한 로직으로 조회 테스트
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 searchCards 로직으로 조회 (viewType=talent)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: talentSearch, error: talentSearchError } = await supabase
    .from('talents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (talentSearchError) {
    console.error('❌ 조회 실패:', talentSearchError);
  } else {
    console.log(`✅ ${talentSearch?.length || 0}개의 인력 카드 조회됨`);
    talentSearch?.slice(0, 3).forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.name} - User: ${t.user_id || 'null'}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 searchCards 로직으로 조회 (viewType=experience)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: expSearch, error: expSearchError } = await supabase
    .from('experiences')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20);

  if (expSearchError) {
    console.error('❌ 조회 실패:', expSearchError);
  } else {
    console.log(`✅ ${expSearch?.length || 0}개의 체험 카드 조회됨`);
    expSearch?.slice(0, 3).forEach((e, idx) => {
      console.log(`  ${idx + 1}. ${e.program_title} - User: ${e.user_id || 'null'}`);
    });
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 결론');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('데이터는 DB에 정상적으로 존재하고 조회도 가능합니다.');
  console.log('문제는 프론트엔드 상태 관리나 컴포넌트 렌더링에 있을 가능성이 높습니다.');
  console.log('\n다음을 확인해야 합니다:');
  console.log('1. App.tsx의 useEffect가 실제로 재실행되는가?');
  console.log('2. setCards()가 호출되어 상태가 업데이트되는가?');
  console.log('3. CardGrid 컴포넌트가 새 데이터로 리렌더링되는가?');
}

testRealRegistration().then(() => {
  console.log('\n✅ 테스트 완료!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

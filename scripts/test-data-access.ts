import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey);
const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

async function testDataAccess() {
  console.log('\n🔍 데이터 접근 테스트 중...\n');

  try {
    // Service Role로 실제 데이터 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SERVICE ROLE (관리자) - talents 데이터');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: serviceTalents, error: serviceTalentError } = await serviceClient
      .from('talents')
      .select('id, name, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(3);

    if (serviceTalentError) {
      console.error('❌ 조회 실패:', serviceTalentError);
    } else {
      console.log(`✅ 총 ${serviceTalents?.length || 0}개의 인력 데이터 발견\n`);
      serviceTalents?.forEach((talent, idx) => {
        console.log(`#${idx + 1}:`);
        console.log(`  ID: ${talent.id}`);
        console.log(`  이름: ${talent.name}`);
        console.log(`  User ID: ${talent.user_id}`);
        console.log(`  생성일: ${talent.created_at}`);
        console.log('');
      });
    }

    // Service Role로 체험 데이터 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SERVICE ROLE (관리자) - experiences 데이터');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: serviceExps, error: serviceExpError } = await serviceClient
      .from('experiences')
      .select('id, program_title, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(3);

    if (serviceExpError) {
      console.error('❌ 조회 실패:', serviceExpError);
    } else {
      console.log(`✅ 총 ${serviceExps?.length || 0}개의 체험 데이터 발견\n`);
      serviceExps?.forEach((exp, idx) => {
        console.log(`#${idx + 1}:`);
        console.log(`  ID: ${exp.id}`);
        console.log(`  제목: ${exp.program_title}`);
        console.log(`  User ID: ${exp.user_id}`);
        console.log(`  생성일: ${exp.created_at}`);
        console.log('');
      });
    }

    // Anon Client로 조회 시도 (RLS 적용됨)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔓 ANON CLIENT (일반 사용자) - talents 데이터');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: anonTalents, error: anonTalentError } = await anonClient
      .from('talents')
      .select('id, name, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (anonTalentError) {
      console.error('❌ 조회 실패:', anonTalentError);
      console.log('⚠️  이것은 RLS 정책 때문일 수 있습니다!\n');
    } else {
      console.log(`✅ 총 ${anonTalents?.length || 0}개의 인력 데이터 발견\n`);
      if (anonTalents && anonTalents.length === 0) {
        console.log('⚠️  데이터가 0개입니다. RLS 정책이 모든 데이터를 차단하고 있습니다!');
      }
    }

    // Anon Client로 체험 데이터 조회
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔓 ANON CLIENT (일반 사용자) - experiences 데이터');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: anonExps, error: anonExpError } = await anonClient
      .from('experiences')
      .select('id, program_title, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (anonExpError) {
      console.error('❌ 조회 실패:', anonExpError);
      console.log('⚠️  이것은 RLS 정책 때문일 수 있습니다!\n');
    } else {
      console.log(`✅ 총 ${anonExps?.length || 0}개의 체험 데이터 발견\n`);
      if (anonExps && anonExps.length === 0) {
        console.log('⚠️  데이터가 0개입니다. RLS 정책이 모든 데이터를 차단하고 있습니다!');
      }
    }

    // 결론
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 최종 진단');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const serviceHasTalents = serviceTalents && serviceTalents.length > 0;
    const serviceHasExps = serviceExps && serviceExps.length > 0;
    const anonHasTalents = anonTalents && anonTalents.length > 0;
    const anonHasExps = anonExps && anonExps.length > 0;

    if (serviceHasTalents && !anonHasTalents) {
      console.log('❌ 인력 데이터: DB에는 존재하지만 RLS 정책이 읽기를 차단!');
      console.log('   → 해결: talents 테이블에 SELECT 정책 추가 필요');
    } else if (!serviceHasTalents) {
      console.log('ℹ️  인력 데이터: DB에 데이터 없음 (정상)');
    } else {
      console.log('✅ 인력 데이터: 정상 접근 가능');
    }

    console.log('');

    if (serviceHasExps && !anonHasExps) {
      console.log('❌ 체험 데이터: DB에는 존재하지만 RLS 정책이 읽기를 차단!');
      console.log('   → 해결: experiences 테이블에 SELECT 정책 추가 필요');
    } else if (!serviceHasExps) {
      console.log('ℹ️  체험 데이터: DB에 데이터 없음 (정상)');
    } else {
      console.log('✅ 체험 데이터: 정상 접근 가능');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

testDataAccess().then(() => {
  console.log('\n✅ 테스트 완료!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

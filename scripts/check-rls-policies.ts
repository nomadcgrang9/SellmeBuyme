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

async function checkRLSPolicies() {
  console.log('\n🔍 RLS 정책 확인 중...\n');

  try {
    // talents 테이블 RLS 정책 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 TALENTS 테이블 RLS 정책');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: talentPolicies, error: talentError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'talents');

    if (talentError) {
      console.error('❌ talents 정책 조회 실패:', talentError);
    } else {
      console.log(`✅ 총 ${talentPolicies?.length || 0}개의 정책 발견\n`);
      talentPolicies?.forEach((policy, idx) => {
        console.log(`정책 #${idx + 1}:`);
        console.log(`  이름: ${policy.policyname}`);
        console.log(`  명령: ${policy.cmd}`);
        console.log(`  역할: ${policy.roles}`);
        console.log(`  USING: ${policy.qual}`);
        console.log(`  WITH CHECK: ${policy.with_check}`);
        console.log('');
      });
    }

    // experiences 테이블 RLS 정책 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 EXPERIENCES 테이블 RLS 정책');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: expPolicies, error: expError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'experiences');

    if (expError) {
      console.error('❌ experiences 정책 조회 실패:', expError);
    } else {
      console.log(`✅ 총 ${expPolicies?.length || 0}개의 정책 발견\n`);
      expPolicies?.forEach((policy, idx) => {
        console.log(`정책 #${idx + 1}:`);
        console.log(`  이름: ${policy.policyname}`);
        console.log(`  명령: ${policy.cmd}`);
        console.log(`  역할: ${policy.roles}`);
        console.log(`  USING: ${policy.qual}`);
        console.log(`  WITH CHECK: ${policy.with_check}`);
        console.log('');
      });
    }

    // RLS 활성화 상태 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔒 RLS 활성화 상태');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: tables, error: tablesError } = await supabase.rpc('check_rls_status');

    if (tablesError) {
      // RPC 함수가 없을 수 있으므로 직접 쿼리
      console.log('⚠️  RPC 함수 없음, 직접 쿼리 시도...\n');

      const query = `
        SELECT
          schemaname,
          tablename,
          rowsecurity
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename IN ('talents', 'experiences')
      `;

      const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
        sql: query
      });

      if (rlsError) {
        console.log('❌ RLS 상태 확인 실패:', rlsError.message);
        console.log('⚠️  수동으로 Supabase 대시보드에서 확인이 필요합니다.');
      } else {
        console.log(rlsStatus);
      }
    } else {
      console.log(tables);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 분석 결과');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const hasTalentSelect = talentPolicies?.some(p => p.cmd === 'SELECT');
    const hasTalentInsert = talentPolicies?.some(p => p.cmd === 'INSERT');
    const hasExpSelect = expPolicies?.some(p => p.cmd === 'SELECT');
    const hasExpInsert = expPolicies?.some(p => p.cmd === 'INSERT');

    console.log('talents 테이블:');
    console.log(`  SELECT 정책: ${hasTalentSelect ? '✅ 있음' : '❌ 없음 - 이것이 문제!'}`);
    console.log(`  INSERT 정책: ${hasTalentInsert ? '✅ 있음' : '❌ 없음'}`);
    console.log('');
    console.log('experiences 테이블:');
    console.log(`  SELECT 정책: ${hasExpSelect ? '✅ 있음' : '❌ 없음 - 이것이 문제!'}`);
    console.log(`  INSERT 정책: ${hasExpInsert ? '✅ 있음' : '❌ 없음'}`);
    console.log('');

    if (!hasTalentSelect || !hasExpSelect) {
      console.log('⚠️  경고: SELECT 정책이 없으면 데이터 삽입 후 읽기가 불가능합니다!');
      console.log('⚠️  이것이 "등록 성공하지만 카드가 안 보이는" 원인입니다!');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

checkRLSPolicies().then(() => {
  console.log('\n✅ 정책 확인 완료!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

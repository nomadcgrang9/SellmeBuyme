/**
 * Supabase에서 PGroonga extension 사용 가능 여부 확인
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPGroongaAvailability() {
  console.log('\n🔍 Supabase PGroonga Extension 가용성 확인\n');
  console.log('='.repeat(60));

  // 1. 사용 가능한 모든 extension 조회
  console.log('\n📦 Step 1: 설치 가능한 Extension 목록 확인\n');

  const { data: availableExtensions, error: availError } = await supabase
    .rpc('pg_available_extensions')
    .select('*');

  if (availError) {
    // pg_available_extensions가 없으면 직접 쿼리
    const { data: extensions, error: extError } = await supabase
      .from('pg_available_extensions')
      .select('name, default_version, comment');

    if (extError) {
      console.log('⚠️  pg_available_extensions 테이블/함수 접근 불가');
      console.log('   대신 현재 설치된 extension 확인...\n');
    } else {
      const pgroonga = extensions?.find((ext: any) => ext.name === 'pgroonga');
      if (pgroonga) {
        console.log('✅ PGroonga 설치 가능!');
        console.log(`   버전: ${pgroonga.default_version}`);
        console.log(`   설명: ${pgroonga.comment}`);
      } else {
        console.log('❌ PGroonga가 설치 가능한 목록에 없습니다.');
      }
    }
  }

  // 2. 현재 설치된 extension 확인
  console.log('\n📦 Step 2: 현재 설치된 Extension 확인\n');

  const { data: installedData, error: installedError } = await supabase
    .rpc('sql', {
      query: `
        SELECT extname, extversion, extrelocatable
        FROM pg_extension
        WHERE extname LIKE '%groonga%' OR extname IN ('pg_trgm', 'unaccent', 'fuzzystrmatch')
        ORDER BY extname;
      `
    });

  if (installedError) {
    console.log('⚠️  직접 쿼리 실패, Supabase SQL Editor 사용 필요\n');
    console.log('SQL Editor에서 실행할 쿼리:');
    console.log('```sql');
    console.log('SELECT * FROM pg_available_extensions WHERE name LIKE \'%groonga%\';');
    console.log('SELECT extname, extversion FROM pg_extension;');
    console.log('```');
  } else {
    console.log('현재 설치된 관련 Extension:');
    if (installedData && installedData.length > 0) {
      installedData.forEach((ext: any) => {
        console.log(`  - ${ext.extname} (v${ext.extversion})`);
      });
    } else {
      console.log('  (없음 또는 조회 불가)');
    }
  }

  // 3. 대안: pg_trgm 확인 (이미 있을 가능성)
  console.log('\n📦 Step 3: 대안 Extension (pg_trgm) 확인\n');

  const { data: trgmCheck, error: trgmError } = await supabase
    .rpc('sql', {
      query: `
        SELECT EXISTS(
          SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
        ) as has_pg_trgm;
      `
    });

  if (!trgmError && trgmCheck) {
    console.log('pg_trgm:', trgmCheck[0]?.has_pg_trgm ? '✅ 설치됨' : '❌ 미설치');
  }

  console.log('\n' + '='.repeat(60));

  // 4. 결론 및 권장사항
  console.log('\n📋 결론 및 다음 단계:\n');

  console.log('PGroonga 확인 방법:');
  console.log('1. Supabase Dashboard → SQL Editor 접속');
  console.log('2. 다음 쿼리 실행:');
  console.log('   ```sql');
  console.log('   SELECT * FROM pg_available_extensions');
  console.log('   WHERE name = \'pgroonga\';');
  console.log('   ```');
  console.log('\n만약 PGroonga가 없다면:');
  console.log('- Option A: Supabase Support에 PGroonga 추가 요청');
  console.log('- Option B: 현재 동의어 사전 방식 유지');
  console.log('- Option C: pg_trgm + similarity 검색으로 개선\n');
}

checkPGroongaAvailability()
  .then(() => {
    console.log('✨ 확인 완료\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  });

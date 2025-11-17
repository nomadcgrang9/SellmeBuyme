import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function diagnoseMigrationMismatch() {
  console.log('🔍 마이그레이션 불일치 진단 시작...\n');
  console.log('='.repeat(80));

  try {
    // 1. 원격 DB의 schema_migrations 테이블 조회 (직접 SQL 사용)
    console.log('\n📍 Step 1: 원격 DB의 적용된 마이그레이션 조회');

    const { data: remoteMigrations, error: remoteError } = await supabase.rpc('exec_sql', {
      sql: 'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version ASC'
    }).catch(() => {
      // exec_sql 함수가 없으면 다른 방법 시도
      return { data: null, error: { message: 'exec_sql not available' } };
    });

    if (remoteError || !remoteMigrations) {
      console.log('⚠️  exec_sql 사용 불가, npx supabase migration list 결과 사용');
      console.log('\n수동으로 확인 필요:');
      console.log('1. Supabase Dashboard → SQL Editor');
      console.log('2. SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;');
      console.log('\n또는:');
      console.log('npx supabase migration list --linked');

      // 로컬 파일만 조회
      const remoteVersions: string[] = [];
      return { remoteVersions, skipRemoteCheck: true };
    }

    const remoteVersions = (remoteMigrations || []).map((m: any) => m.version);
    console.log(`✅ 원격 DB에 적용된 마이그레이션: ${remoteVersions.length}개`);
    console.log('\n원격 마이그레이션 버전들:');
    remoteVersions.forEach((v, i) => {
      console.log(`  [${i + 1}] ${v}`);
    });

    // 2. 로컬 migrations 폴더의 파일들 조회
    console.log('\n📍 Step 2: 로컬 마이그레이션 파일 조회');

    const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
    const localFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`✅ 로컬 마이그레이션 파일: ${localFiles.length}개`);
    console.log('\n로컬 마이그레이션 파일들:');
    localFiles.forEach((f, i) => {
      const version = f.replace('.sql', '').split('_')[0];
      console.log(`  [${i + 1}] ${f} → 버전: ${version}`);
    });

    // 3. 로컬 파일에서 추출한 버전들
    const localVersions = localFiles.map(f => {
      const parts = f.replace('.sql', '').split('_');
      return parts[0]; // 타임스탬프 부분만
    });

    // 4. 차이 분석
    console.log('\n📍 Step 3: 차이 분석');

    // 원격에는 있지만 로컬에는 없는 버전들
    const missingInLocal = remoteVersions.filter(rv => !localVersions.includes(rv));

    // 로컬에는 있지만 원격에는 없는 버전들
    const missingInRemote = localVersions.filter(lv => !remoteVersions.includes(lv));

    console.log('\n⚠️  원격에는 있지만 로컬에 없는 마이그레이션:');
    if (missingInLocal.length === 0) {
      console.log('  없음');
    } else {
      missingInLocal.forEach((v, i) => {
        console.log(`  [${i + 1}] ${v} ← 이 버전의 파일이 로컬에 없음!`);
      });
    }

    console.log('\n⚠️  로컬에는 있지만 원격에 적용되지 않은 마이그레이션:');
    if (missingInRemote.length === 0) {
      console.log('  없음');
    } else {
      missingInRemote.forEach((v, i) => {
        const file = localFiles.find(f => f.startsWith(v));
        console.log(`  [${i + 1}] ${v} (파일: ${file})`);
      });
    }

    // 5. 문제 원인 분석
    console.log('\n📍 Step 4: 문제 원인 분석');

    if (missingInLocal.length > 0) {
      console.log('\n❌ 문제 발견!');
      console.log(`원격 DB에는 ${missingInLocal.length}개의 마이그레이션이 적용되어 있지만,`);
      console.log('로컬 migrations 폴더에는 해당 파일들이 없습니다.');
      console.log('\n가능한 원인:');
      console.log('1. 다른 개발자 또는 다른 AI가 직접 DB에 SQL을 실행했을 수 있음');
      console.log('2. 이전에 마이그레이션 파일을 삭제했을 수 있음');
      console.log('3. git pull을 하지 않아서 최신 마이그레이션 파일이 없을 수 있음');

      console.log('\n✅ 해결 방법:');
      console.log('1. 원격 DB에서 해당 마이그레이션들을 "reverted" 상태로 변경');
      console.log('2. 또는 로컬에 더미 마이그레이션 파일 생성');
      console.log('3. 또는 supabase db pull로 현재 스키마를 새 마이그레이션으로 저장');

      console.log('\n명령어:');
      missingInLocal.forEach(v => {
        console.log(`npx supabase migration repair --status reverted ${v}`);
      });
    }

    if (missingInRemote.length > 0 && missingInLocal.length === 0) {
      console.log('\n✅ 로컬 마이그레이션이 원격보다 최신입니다.');
      console.log('다음 명령어로 원격 DB에 적용하세요:');
      console.log('npx supabase db push');
    }

    if (missingInLocal.length === 0 && missingInRemote.length === 0) {
      console.log('\n✅ 로컬과 원격의 마이그레이션이 완벽하게 일치합니다!');
    }

  } catch (error) {
    console.error('❌ 진단 중 오류 발생:', error);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ 진단 완료!');
}

diagnoseMigrationMismatch().catch(console.error);

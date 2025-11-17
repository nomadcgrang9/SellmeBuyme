import * as fs from 'fs';
import * as path from 'path';

/**
 * 로컬 마이그레이션 파일 목록을 기반으로
 * Supabase Dashboard SQL Editor에서 실행할 동기화 SQL 생성
 */

const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');

console.log('🔍 로컬 마이그레이션 파일 스캔...\n');
console.log('='.repeat(80));

// 로컬 파일 읽기
const localFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`\n✅ 발견된 로컬 마이그레이션 파일: ${localFiles.length}개\n`);

// 버전 추출
const versions = localFiles.map(file => {
  const match = file.match(/^(\d+)/);
  return match ? match[1] : null;
}).filter(v => v !== null);

console.log('📋 버전 목록:');
versions.forEach((v, i) => {
  const file = localFiles[i];
  console.log(`  [${String(i + 1).padStart(2, '0')}] ${v} - ${file}`);
});

// SQL 생성
console.log('\n' + '='.repeat(80));
console.log('\n📝 Supabase Dashboard SQL Editor에서 실행할 SQL:\n');
console.log('='.repeat(80));

const sql = `
-- 로컬 마이그레이션 파일과 원격 DB 동기화
-- 실행 전: SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
-- 실행 후: 다시 SELECT로 확인

-- Step 1: 기존 마이그레이션 상태 확인
SELECT
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Step 2: 로컬에 있는 모든 마이그레이션을 원격 DB에 "적용됨" 상태로 등록
-- (이미 존재하는 버전은 무시됨)
${versions.map(version => {
  const file = localFiles.find(f => f.startsWith(version));
  const description = file ? file.replace(/^\d+_/, '').replace('.sql', '') : 'unknown';
  return `INSERT INTO supabase_migrations.schema_migrations (version, name, executed_at)
VALUES ('${version}', '${description}', NOW())
ON CONFLICT (version) DO NOTHING;`;
}).join('\n\n')}

-- Step 3: 동기화 후 확인
SELECT
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Step 4: 로컬에 없는 마이그레이션 찾기 (이것들은 삭제 고려 대상)
SELECT
  sm.version,
  sm.name
FROM supabase_migrations.schema_migrations sm
WHERE sm.version NOT IN (${versions.map(v => `'${v}'`).join(', ')})
ORDER BY sm.version ASC;
`;

console.log(sql);
console.log('='.repeat(80));

console.log('\n✅ SQL 생성 완료!');
console.log('\n실행 순서:');
console.log('1. Supabase Dashboard → SQL Editor 열기');
console.log('2. 위 SQL 복사 & 붙여넣기');
console.log('3. "Run" 버튼 클릭');
console.log('4. Step 3와 Step 4 결과 확인');
console.log('5. GitHub에 빈 커밋 푸시해서 Supabase Preview 빌드 트리거');
console.log('\n' + '='.repeat(80));

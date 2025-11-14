import pg from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function fixRLS() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 RLS 정책 수정 (PostgreSQL 직접 연결)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Supabase PostgreSQL connection string format:
  // postgresql://postgres.[REF]:[PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres

  // Extract project ref from URL
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL이 필요합니다.');
    process.exit(1);
  }

  const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    console.error('❌ Supabase URL 형식이 잘못되었습니다.');
    process.exit(1);
  }

  const projectRef = urlMatch[1];
  console.log(`📌 프로젝트 REF: ${projectRef}\n`);
  console.log('⚠️  PostgreSQL 비밀번호가 필요합니다.');
  console.log('   Supabase Dashboard > Project Settings > Database > Connection string');
  console.log('   에서 "Connection Pooling" 탭의 비밀번호를 복사하세요.\n');
  console.log('   환경변수로 설정: export SUPABASE_DB_PASSWORD="your-password"');
  console.log('   또는 .env 파일에 추가: SUPABASE_DB_PASSWORD=your-password\n');

  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  if (!dbPassword) {
    console.error('❌ SUPABASE_DB_PASSWORD 환경변수가 필요합니다.');
    console.error('   Supabase Dashboard에서 데이터베이스 비밀번호를 확인하세요.\n');
    process.exit(1);
  }

  const connectionString = `postgresql://postgres.${projectRef}:${dbPassword}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 데이터베이스 연결 중...');
    await client.connect();
    console.log('✅ 연결 성공!\n');

    const sql1 = `DROP POLICY IF EXISTS "Only functions can create participant info" ON chat_participants;`;
    const sql2 = `DROP POLICY IF EXISTS "Users can create own participant info" ON chat_participants;`;

    console.log('📌 실행 1: DROP POLICY "Only functions can create participant info"');
    await client.query(sql1);
    console.log('   ✅ 실행 완료\n');

    console.log('📌 실행 2: DROP POLICY "Users can create own participant info"');
    await client.query(sql2);
    console.log('   ✅ 실행 완료\n');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RLS 정책 수정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 다음 단계: 데이터베이스 상태 확인');
    console.log('   npx tsx scripts/db/check-chat-state.ts\n');

  } catch (error: any) {
    console.error('❌ 에러 발생:', error.message);
    console.error('\n디버그 정보:');
    console.error('  Project Ref:', projectRef);
    console.error('  Connection String:', connectionString.replace(dbPassword, '***'));
    process.exit(1);
  } finally {
    await client.end();
  }
}

fixRLS();

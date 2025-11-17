import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Service Role 클라이언트 (RLS 우회)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🚀 채팅 시스템 마이그레이션 적용 시작...\n');

  // 마이그레이션 파일 읽기
  const migrationPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    '20250113_chat_system.sql'
  );

  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ 마이그레이션 파일을 찾을 수 없습니다: ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log(`📄 파일: ${migrationPath}`);
  console.log(`📏 크기: ${sql.length} bytes\n`);
  console.log('='.repeat(60));

  // SQL 실행 (Supabase는 여러 statement를 한번에 실행 불가능하므로 분할 필요)
  console.log('\n⚠️  주의: Supabase REST API는 다중 SQL 문을 지원하지 않습니다.');
  console.log('→ Supabase 대시보드에서 직접 실행해야 합니다.\n');

  console.log('📋 실행 방법:');
  console.log('1. https://supabase.com/dashboard/project/qpwnsvsiduvvqdijyxio 접속');
  console.log('2. SQL Editor 메뉴 클릭');
  console.log('3. New Query 생성');
  console.log('4. 아래 내용 복사해서 붙여넣기:');
  console.log('   파일: supabase/migrations/20250113_chat_system.sql');
  console.log('5. Run 버튼 클릭\n');

  console.log('='.repeat(60));
  console.log('\n✅ 안내 완료!');
  console.log('\n또는 psql 클라이언트가 있다면:');
  console.log('psql <connection_string> -f supabase/migrations/20250113_chat_system.sql');
}

applyMigration().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 환경변수 VITE_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyFix() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 RLS 정책 수정 적용');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sql = `
-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Only functions can create participant info" ON chat_participants;
DROP POLICY IF EXISTS "Users can create own participant info" ON chat_participants;

-- INSERT 정책을 만들지 않음!
-- RLS가 활성화되어 있지만 INSERT 정책이 없으면:
-- - 일반 사용자: INSERT 불가 (정책 없음 = 거부)
-- - SECURITY DEFINER 함수: INSERT 가능 (RLS 우회)
  `.trim();

  console.log('📌 실행할 SQL:');
  console.log(sql);
  console.log('\n');

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('❌ SQL 실행 실패:', error.message);
      console.log('\n대안: Supabase Dashboard에서 직접 실행하세요:');
      console.log('1. https://supabase.com/dashboard');
      console.log('2. SQL Editor');
      console.log('3. 위 SQL 붙여넣기 후 Run\n');
      process.exit(1);
    }

    console.log('✅ RLS 정책 수정 완료!\n');

  } catch (err: any) {
    console.error('❌ 에러:', err.message);
    console.log('\n❗ exec_sql RPC 함수가 없습니다.');
    console.log('Supabase Dashboard에서 수동으로 실행해야 합니다:\n');
    console.log(sql);
    console.log('\n');
    process.exit(1);
  }
}

applyFix();

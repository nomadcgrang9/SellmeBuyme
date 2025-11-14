import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function fixRLS() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 RLS 정책 수정 (Supabase Management API)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ 환경변수가 필요합니다.');
    process.exit(1);
  }

  // Extract project ref
  const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!urlMatch) {
    console.error('❌ Supabase URL 형식이 잘못되었습니다.');
    process.exit(1);
  }

  const projectRef = urlMatch[1];

  const sql1 = `DROP POLICY IF EXISTS "Only functions can create participant info" ON chat_participants;`;
  const sql2 = `DROP POLICY IF EXISTS "Users can create own participant info" ON chat_participants;`;

  console.log('📌 실행할 SQL:');
  console.log(sql1);
  console.log(sql2);
  console.log('');

  // Try using Supabase SQL endpoint directly
  const endpoint = `${supabaseUrl}/rest/v1/rpc/exec`;

  console.log('🔌 Supabase SQL API 호출 중...\n');

  try {
    // Try calling with both SQL statements
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql1 + '\n' + sql2 })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('⚠️  REST API 방식 실패:', response.status, errorText);
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('❌ 자동 실행 실패 - 수동 실행 필요');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('📌 Supabase Dashboard에서 직접 실행하세요:');
      console.log(`   1. https://supabase.com/dashboard/project/${projectRef}/sql/new`);
      console.log('   2. 아래 SQL 붙여넣기:');
      console.log('');
      console.log('```sql');
      console.log(sql1);
      console.log(sql2);
      console.log('```');
      console.log('');
      console.log('   3. "Run" 버튼 클릭\n');
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ SQL 실행 성공!');
    console.log('결과:', result);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ RLS 정책 수정 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('💡 다음 단계: 데이터베이스 상태 확인');
    console.log('   npx tsx scripts/db/check-chat-state.ts\n');

  } catch (error: any) {
    console.error('❌ 에러 발생:', error.message);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('❌ 자동 실행 실패 - 수동 실행 필요');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📌 Supabase Dashboard에서 직접 실행하세요:');
    console.log(`   1. https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log('   2. 아래 SQL 붙여넣기:');
    console.log('');
    console.log('```sql');
    console.log(sql1);
    console.log(sql2);
    console.log('```');
    console.log('');
    console.log('   3. "Run" 버튼 클릭\n');
    process.exit(1);
  }
}

fixRLS();

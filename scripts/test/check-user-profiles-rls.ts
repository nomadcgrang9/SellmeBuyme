import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

// Service Role client (bypasses RLS)
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Anon client (subject to RLS)
const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkRLS() {
  console.log('🔍 user_profiles RLS 정책 진단...\n');
  console.log('='.repeat(60));

  // 1. Check if RLS is enabled
  console.log('\n📍 Step 1: RLS 활성화 상태 확인');

  const { data: rlsStatus, error: rlsError } = await adminClient.rpc('pg_catalog.pg_get_expr', {
    pg_node_tree: null,
    pg_relation_oid: null
  }).then(() =>
    adminClient.from('pg_tables').select('*').eq('tablename', 'user_profiles').single()
  ).catch(() => null);

  // Simpler approach - try to query RLS status
  const { data: tables } = await adminClient
    .from('information_schema.tables')
    .select('*')
    .eq('table_name', 'user_profiles')
    .eq('table_schema', 'public');

  console.log('✅ user_profiles 테이블 존재:', tables && tables.length > 0);

  // 2. Check RLS policies
  console.log('\n📍 Step 2: RLS 정책 목록 조회 (스킵 - 직접 접근 불가)');

  // 3. Test actual access with anon key
  console.log('\n📍 Step 3: Anon Key로 user_profiles 읽기 테스트');

  const { data: anonData, error: anonError } = await anonClient
    .from('user_profiles')
    .select('user_id, display_name')
    .limit(5);

  if (anonError) {
    console.log('❌ Anon Key 읽기 실패:', anonError.message);
    console.log('   Code:', anonError.code);
    console.log('   Details:', anonError.details);
  } else {
    console.log(`✅ Anon Key 읽기 성공: ${anonData?.length || 0}개 레코드`);
    anonData?.forEach((p, i) => {
      console.log(`   [${i + 1}] ${p.user_id.substring(0, 8)}... → ${p.display_name || 'NULL'}`);
    });
  }

  // 4. Test with Service Role
  console.log('\n📍 Step 4: Service Role로 user_profiles 읽기 테스트');

  const { data: adminData, error: adminError } = await adminClient
    .from('user_profiles')
    .select('user_id, display_name')
    .limit(5);

  if (adminError) {
    console.log('❌ Service Role 읽기 실패:', adminError.message);
  } else {
    console.log(`✅ Service Role 읽기 성공: ${adminData?.length || 0}개 레코드`);
    adminData?.forEach((p, i) => {
      console.log(`   [${i + 1}] ${p.user_id.substring(0, 8)}... → ${p.display_name || 'NULL'}`);
    });
  }

  // 5. Test authenticated user access
  console.log('\n📍 Step 5: 인증된 사용자로 다른 사용자 프로필 읽기 테스트');

  // Login as a test user
  const testEmail = 'l30417305@gmail.com';
  const testPassword = 'your_test_password'; // This won't work without actual password

  console.log(`⚠️  실제 사용자 인증 테스트는 브라우저에서 확인 필요`);
  console.log(`   - 로그인 후 Console에서 다음 실행:`);
  console.log(`   - supabase.from('user_profiles').select('user_id, display_name').limit(5)`);

  console.log('\n='.repeat(60));
  console.log('\n📊 진단 결론\n');

  if (anonError) {
    console.log('🔴 CRITICAL: Anon Key로 user_profiles 읽기 불가');
    console.log('   → RLS 정책이 없거나 너무 제한적입니다.');
    console.log('   → getUserDisplayName()이 실패하는 원인입니다.');
    console.log('\n🛠️  해결 방법:');
    console.log('   1. user_profiles에 SELECT 정책 추가 필요');
    console.log('   2. 최소한 display_name 컬럼은 모든 인증 사용자가 읽을 수 있어야 함');
  } else {
    console.log('✅ Anon Key로 읽기 가능 - RLS 정책 문제 아님');
    console.log('   → getUserDisplayName() 로직 자체에 문제가 있음');
    console.log('   → auth.admin.getUserById() 호출이 실패하는 것으로 추정');
  }

  console.log('\n✅ 진단 완료!');
}

checkRLS().catch(console.error);

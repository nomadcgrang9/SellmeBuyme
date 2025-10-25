import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function grantAdminRole(userId: string): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 관리자 권한 부여');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log(`User ID: ${userId}\n`);

  // 현재 역할 확인
  const { data: beforeProfile, error: beforeError } = await supabase
    .from('user_profiles')
    .select('roles, display_name')
    .eq('user_id', userId)
    .single();

  if (beforeError) {
    console.error('❌ 프로필 조회 실패:', beforeError);
    return;
  }

  console.log('📋 변경 전:');
  console.log(`   Display Name: ${beforeProfile.display_name}`);
  console.log(`   Roles: ${JSON.stringify(beforeProfile.roles)}\n`);

  // Admin 역할 추가
  const { data: updatedProfile, error: updateError } = await supabase
    .from('user_profiles')
    .update({ roles: ['admin'] })
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    console.error('❌ 역할 업데이트 실패:', updateError);
    return;
  }

  console.log('✅ 관리자 권한 부여 완료!\n');
  console.log('📋 변경 후:');
  console.log(`   Display Name: ${updatedProfile.display_name}`);
  console.log(`   Roles: ${JSON.stringify(updatedProfile.roles)}\n`);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 작업 완료!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('이제 관리자 페이지에서 띠지배너 관리 기능을 사용할 수 있습니다.');
  console.log('앱을 새로고침하면 변경사항이 적용됩니다.\n');
}

// Command-line argument support
const userId = process.argv[2] || '85823de2-b69b-4829-8e1b-c3764c7d633c';

// 실행
grantAdminRole(userId).catch(console.error);

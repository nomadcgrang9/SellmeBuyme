/**
 * 관리자 페이지 사용자 관리 기능 검증 스크립트
 *
 * 검증 항목:
 * 1. auth.admin.listUsers() API 호출 가능 여부
 * 2. user_activity_logs 테이블 존재 및 데이터 조회 가능 여부
 * 3. user_profiles 테이블과 데이터 병합 가능 여부
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('필요한 변수: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('🔍 관리자 사용자 관리 기능 검증 시작\n');

  // 1. auth.admin.listUsers() 테스트
  console.log('1️⃣ auth.admin.listUsers() API 호출 테스트');
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ auth.admin.listUsers() 실패:', authError.message);
      throw authError;
    }

    console.log(`✅ auth.users에서 ${authUsers.users.length}명의 사용자 조회 성공`);
    if (authUsers.users.length > 0) {
      const sample = authUsers.users[0];
      console.log(`   샘플 데이터: ${sample.email} (가입일: ${sample.created_at})`);
    }
  } catch (error) {
    console.error('💥 auth.admin.listUsers() 호출 중 오류:', error);
    return false;
  }

  console.log('');

  // 2. user_activity_logs 테이블 확인
  console.log('2️⃣ user_activity_logs 테이블 존재 여부 확인');
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activityLogs, error: activityError } = await supabase
      .from('user_activity_logs')
      .select('user_id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(10);

    if (activityError) {
      if (activityError.code === '42P01') {
        console.error('❌ user_activity_logs 테이블이 존재하지 않습니다!');
        console.error('   AdminUserManagement 컴포넌트에서 이 테이블을 사용하려고 시도하지만 실제로는 존재하지 않음.');
        return false;
      }
      throw activityError;
    }

    console.log(`✅ user_activity_logs 테이블 존재 확인`);
    console.log(`   최근 30일 활동 로그: ${activityLogs?.length || 0}개`);
  } catch (error: any) {
    console.error('💥 user_activity_logs 조회 중 오류:', error.message);
    return false;
  }

  console.log('');

  // 3. user_profiles 테이블 확인
  console.log('3️⃣ user_profiles 테이블 데이터 조회');
  try {
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);

    if (profileError) {
      console.error('❌ user_profiles 조회 실패:', profileError.message);
      throw profileError;
    }

    console.log(`✅ user_profiles에서 ${profiles?.length || 0}개 프로필 조회 성공`);
    if (profiles && profiles.length > 0) {
      const sample = profiles[0];
      console.log(`   샘플 프로필: ${sample.display_name} (역할: ${sample.roles?.[0] || '없음'})`);
    }
  } catch (error) {
    console.error('💥 user_profiles 조회 중 오류:', error);
    return false;
  }

  console.log('');

  // 4. 데이터 병합 시뮬레이션
  console.log('4️⃣ AdminUserManagement 로직 시뮬레이션');
  try {
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const { data: profiles } = await supabase.from('user_profiles').select('*');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activityLogs } = await supabase
      .from('user_activity_logs')
      .select('user_id')
      .gte('created_at', thirtyDaysAgo.toISOString());

    const activeUserIds = new Set(activityLogs?.map(log => log.user_id) || []);

    const mergedUsers = (authUsers?.users || []).map(authUser => {
      const profile = profiles?.find(p => p.user_id === authUser.id);
      const isActive = activeUserIds.has(authUser.id);

      return {
        id: authUser.id,
        name: profile?.display_name || authUser.email?.split('@')[0] || '미설정',
        email: authUser.email || '',
        role: profile?.roles?.[0] || '강사',
        status: isActive ? '정상' : '휴면',
        isAdmin: profile?.roles?.includes('admin') || false,
      };
    });

    console.log(`✅ ${mergedUsers.length}명의 사용자 데이터 병합 성공`);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newLast7Days = mergedUsers.filter(user => {
      const authUser = authUsers?.users.find(u => u.id === user.id);
      if (!authUser) return false;
      const joined = new Date(authUser.created_at);
      return joined >= sevenDaysAgo;
    }).length;

    const activeLast30Days = mergedUsers.filter(user => activeUserIds.has(user.id)).length;

    console.log(`   전체 가입자: ${mergedUsers.length}명`);
    console.log(`   최근 7일 신규: ${newLast7Days}명`);
    console.log(`   최근 30일 활성: ${activeLast30Days}명`);
  } catch (error) {
    console.error('💥 데이터 병합 시뮬레이션 실패:', error);
    return false;
  }

  console.log('');
  console.log('✅ 모든 검증 통과!');
  return true;
}

main()
  .then((success) => {
    if (!success) {
      console.log('\n❌ 검증 실패: AdminUserManagement 컴포넌트가 제대로 동작하지 않을 수 있습니다.');
      process.exit(1);
    }
    console.log('\n✅ AdminUserManagement 컴포넌트는 실제 DB와 연동되어 동작할 수 있습니다.');
  })
  .catch((error) => {
    console.error('\n💥 검증 중 치명적 오류 발생:', error);
    process.exit(1);
  });

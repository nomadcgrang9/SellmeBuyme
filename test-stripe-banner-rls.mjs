import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDU3NzAsImV4cCI6MjA3NjI4MTc3MH0.anomdGhxNrL3aHJ4x-PM6wXWcADNKuKZnuQ2mv8cWuQ';

const supabase = createClient(supabaseUrl, anonKey);

async function testRLS() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 Phase 3-5-1a: RLS 정책 읽기 권한 테스트');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let allPassed = true;

  // Test 1: stripe_banner_config 읽기
  console.log('Test 1: stripe_banner_config 읽기');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const { data, error } = await supabase
      .from('stripe_banner_config')
      .select('*')
      .single();

    if (error) {
      console.error('❌ 실패:', error.message);
      console.error('   상세:', error.details);
      allPassed = false;
    } else {
      console.log('✅ 성공: 설정 데이터 읽기 가능');
      console.log(`   - is_active: ${data.is_active}`);
      console.log(`   - rotation_speed: ${data.rotation_speed}`);
    }
  } catch (err) {
    console.error('❌ 예외 발생:', err.message);
    allPassed = false;
  }
  console.log('');

  // Test 2: stripe_banners 읽기
  console.log('Test 2: stripe_banners 읽기');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const { data, error } = await supabase
      .from('stripe_banners')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) {
      console.error('❌ 실패:', error.message);
      console.error('   상세:', error.details);
      allPassed = false;
    } else {
      console.log(`✅ 성공: ${data.length}개 배너 읽기 가능`);
      data.forEach((banner, idx) => {
        console.log(`   ${idx + 1}. [${banner.type}] ${banner.title}`);
      });
    }
  } catch (err) {
    console.error('❌ 예외 발생:', err.message);
    allPassed = false;
  }
  console.log('');

  // Test 3: stripe_statistics 읽기
  console.log('Test 3: stripe_statistics 읽기');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('stripe_statistics')
      .select('*')
      .eq('stats_date', today)
      .maybeSingle();

    if (error) {
      console.error('❌ 실패:', error.message);
      console.error('   상세:', error.details);
      allPassed = false;
    } else {
      console.log('✅ 성공: 통계 데이터 읽기 가능');
      if (data) {
        console.log(`   - 신규 공고: ${data.new_jobs_count}건`);
        console.log(`   - 마감임박: ${data.urgent_jobs_count}건`);
      } else {
        console.log('   ℹ️  오늘 통계 데이터 없음');
      }
    }
  } catch (err) {
    console.error('❌ 예외 발생:', err.message);
    allPassed = false;
  }
  console.log('');

  // Test 4: popular_keywords 읽기
  console.log('Test 4: popular_keywords 읽기');
  console.log('─────────────────────────────────────────────────────────────');
  try {
    const { data, error } = await supabase
      .from('popular_keywords')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(10);

    if (error) {
      console.error('❌ 실패:', error.message);
      console.error('   상세:', error.details);
      allPassed = false;
    } else {
      console.log(`✅ 성공: ${data.length}개 키워드 읽기 가능`);
      console.log('   키워드:', data.map(k => k.keyword).join(', '));
    }
  } catch (err) {
    console.error('❌ 예외 발생:', err.message);
    allPassed = false;
  }
  console.log('');

  // 최종 결과
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (allPassed) {
    console.log('✅ Phase 3-5-1a: 모든 RLS 읽기 테스트 통과!');
    console.log('');
    console.log('🎯 다음 단계: AIInsightBox 컴포넌트 수정 가능');
  } else {
    console.log('❌ Phase 3-5-1a: RLS 정책 오류 발생');
    console.log('');
    console.log('⚠️  사용자 확인 필요:');
    console.log('   1. Supabase 대시보드에서 RLS 정책 확인');
    console.log('   2. anon 역할에 SELECT 권한이 있는지 확인');
    console.log('   3. 오류 메시지를 개발자에게 전달');
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testRLS();

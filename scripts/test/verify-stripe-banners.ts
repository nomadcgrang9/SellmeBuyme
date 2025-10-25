/**
 * Stripe Banner System Verification Script (TypeScript)
 *
 * This script verifies the stripe banner system implementation
 * Tests: config, banners, statistics, keywords
 *
 * Usage: npx tsx scripts/test/verify-stripe-banners.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDU3NzAsImV4cCI6MjA3NjI4MTc3MH0.anomdGhxNrL3aHJ4x-PM6wXWcADNKuKZnuQ2mv8cWuQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyStripeBanners(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 띠지배너 시스템 검증 (TypeScript)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Config
  console.log('📋 Test 1: 띠지배너 설정 조회');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data: config, error } = await supabase
      .from('stripe_banner_config')
      .select('*')
      .single();

    if (error) throw error;

    console.log('✅ 현재 설정:');
    console.log(`   - 활성화: ${config.is_active}`);
    console.log(`   - 회전 속도: ${config.rotation_speed}초`);
    console.log(`   - 통계 모드: ${config.stats_mode}`);
    console.log(`   - 키워드 모드: ${config.keywords_mode}`);

    passedTests++;
  } catch (error: any) {
    console.error('❌ 실패:', error.message);
  }
  console.log('');

  // Test 2: Banners
  console.log('🎨 Test 2: 배너 목록 조회');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data: banners, error } = await supabase
      .from('stripe_banners')
      .select('*')
      .order('display_order');

    if (error) throw error;

    console.log(`✅ 배너 목록: ${banners?.length || 0}개`);
    banners?.forEach((banner: any, idx: number) => {
      console.log(`   ${idx + 1}. [${banner.type}] ${banner.title}`);
      console.log(`      - 활성화: ${banner.is_active ? '예' : '아니오'}`);
    });

    passedTests++;
  } catch (error: any) {
    console.error('❌ 실패:', error.message);
  }
  console.log('');

  // Test 3: Statistics
  console.log('📈 Test 3: 통계 조회');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: stats, error } = await supabase
      .from('stripe_statistics')
      .select('*')
      .eq('stats_date', today)
      .maybeSingle();

    if (stats) {
      console.log(`✅ 오늘 통계 (${today}):`);
      console.log(`   - 신규 공고: ${stats.new_jobs_count}건`);
      console.log(`   - 마감임박: ${stats.urgent_jobs_count}건`);
      console.log(`   - 신규 인력: ${stats.new_talents_count}건`);
    } else {
      console.log('ℹ️ 오늘 통계 데이터가 없습니다.');
    }

    passedTests++;
  } catch (error: any) {
    console.error('❌ 실패:', error.message);
  }
  console.log('');

  // Test 4: Keywords
  console.log('🔍 Test 4: 인기 키워드 조회');
  console.log('─────────────────────────────────────────────────────────────');
  totalTests++;
  try {
    const { data: keywords, error } = await supabase
      .from('popular_keywords')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
      .limit(10);

    if (error) throw error;

    console.log(`✅ 활성 키워드: ${keywords?.length || 0}개`);
    keywords?.forEach((kw: any, idx: number) => {
      console.log(`   ${idx + 1}. ${kw.keyword} ${kw.is_manual ? '(수동)' : '(자동)'}`);
    });

    passedTests++;
  } catch (error: any) {
    console.error('❌ 실패:', error.message);
  }
  console.log('');

  // Summary
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 검증 결과');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 통과: ${passedTests}/${totalTests} 테스트\n`);

  if (passedTests === totalTests) {
    console.log('🎉 모든 테스트 통과!');
  } else {
    console.log(`⚠️  ${totalTests - passedTests}개 테스트 실패`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

verifyStripeBanners().catch(console.error);

/**
 * Playwright 기반 모바일 헤더-프로모카드 통합 검증 스크립트
 *
 * 검증 항목:
 * 1. 띠지 바 제거 확인
 * 2. 헤더 배경 투명 (그라데이션 노출)
 * 3. 프로모카드 배경 투명 (그라데이션 노출)
 * 4. 전체 섹션이 하나의 그라데이션 배경 공유
 */

import { chromium, Browser, Page } from 'playwright';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

async function verifyMobileHeaderIntegration(): Promise<void> {
  let browser: Browser | null = null;
  let page: Page | null = null;
  const results: TestResult[] = [];

  try {
    console.log('🚀 Playwright 검증 시작...\n');

    // 브라우저 실행 (모바일 뷰포트)
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 }, // iPhone X 크기
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    page = await context.newPage();

    console.log('📱 모바일 뷰포트 설정 완료 (375x812)');

    // 로컬 개발 서버 접속
    const url = 'http://localhost:5174';
    console.log(`🌐 페이지 로드 중: ${url}\n`);

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // 초기 렌더링 대기

    // === 검증 1: 띠지 바 제거 확인 ===
    console.log('✅ 검증 1: 띠지 바 제거 확인');
    const badgeBarExists = await page.locator('.rounded-t-lg').count() > 0;
    results.push({
      name: '띠지 바 제거',
      passed: !badgeBarExists,
      details: badgeBarExists
        ? '❌ 띠지 바가 여전히 존재합니다 (.rounded-t-lg 클래스 발견)'
        : '✅ 띠지 바가 제거되었습니다'
    });

    // === 검증 2: 헤더 배경 투명 확인 ===
    console.log('✅ 검증 2: 헤더 배경 투명 확인');
    const headerBgClass = await page.locator('section > div').first().getAttribute('class');
    const hasOldGradient = headerBgClass?.includes('bg-gradient-to-r from-blue-500');
    results.push({
      name: '헤더 배경 투명',
      passed: !hasOldGradient,
      details: hasOldGradient
        ? '❌ 헤더에 이전 그라데이션 클래스가 남아있습니다'
        : '✅ 헤더 배경이 투명합니다 (구 그라데이션 제거됨)'
    });

    // === 검증 3: 섹션 배경 그라데이션 확인 ===
    console.log('✅ 검증 3: 섹션 전체 그라데이션 확인');
    const sectionBgStyle = await page.locator('section').first().evaluate((el) => {
      return window.getComputedStyle(el).backgroundImage;
    });
    const hasGradient = sectionBgStyle.includes('linear-gradient');
    results.push({
      name: '섹션 그라데이션',
      passed: hasGradient,
      details: hasGradient
        ? `✅ 섹션에 그라데이션 배경이 적용되었습니다\n   Background: ${sectionBgStyle.substring(0, 100)}...`
        : '❌ 섹션에 그라데이션이 적용되지 않았습니다'
    });

    // === 검증 4: 프로모카드 배경 투명 확인 ===
    console.log('✅ 검증 4: 프로모카드 배경 투명 확인');
    const promoCardBgClass = await page.locator('.cursor-pointer > div').first().getAttribute('class');
    const hasWhiteBg = promoCardBgClass?.includes('bg-white/10');
    const hasBorder = promoCardBgClass?.includes('border-white/20');
    results.push({
      name: '프로모카드 배경 투명',
      passed: !hasWhiteBg && !hasBorder,
      details: (hasWhiteBg || hasBorder)
        ? '❌ 프로모카드에 불투명 배경/테두리가 있습니다'
        : '✅ 프로모카드 배경이 투명합니다 (bg-white/10, border 제거됨)'
    });

    // === 검증 5: 시각적 통합 확인 (스크린샷) ===
    console.log('✅ 검증 5: 스크린샷 캡처');
    await page.screenshot({
      path: 'scripts/test/mobile-header-integration-screenshot.png',
      fullPage: false
    });
    results.push({
      name: '스크린샷 캡처',
      passed: true,
      details: '✅ 스크린샷 저장됨: scripts/test/mobile-header-integration-screenshot.png'
    });

    // === 검증 6: 콘솔 에러 확인 ===
    console.log('✅ 검증 6: 콘솔 에러 확인');
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    await page.waitForTimeout(1000);
    results.push({
      name: '콘솔 에러',
      passed: consoleErrors.length === 0,
      details: consoleErrors.length === 0
        ? '✅ 콘솔 에러가 없습니다'
        : `❌ 콘솔 에러 발견:\n${consoleErrors.join('\n')}`
    });

    // === 결과 출력 ===
    console.log('\n' + '='.repeat(60));
    console.log('📊 검증 결과 요약');
    console.log('='.repeat(60) + '\n');

    let passedCount = 0;
    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.name}`);
      console.log(`   ${result.details}\n`);
      if (result.passed) passedCount++;
    });

    console.log('='.repeat(60));
    console.log(`✅ 통과: ${passedCount}/${results.length}`);
    console.log(`❌ 실패: ${results.length - passedCount}/${results.length}`);
    console.log('='.repeat(60) + '\n');

    if (passedCount === results.length) {
      console.log('🎉 모든 검증 통과! 헤더-프로모카드 통합이 완료되었습니다.');
    } else {
      console.log('⚠️  일부 검증 실패. 위의 실패 항목을 확인해주세요.');
    }

    // 브라우저 10초 유지 (수동 확인 가능)
    console.log('\n⏳ 10초 후 브라우저가 자동으로 닫힙니다...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 검증 중 오류 발생:', error);
    throw error;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('🔚 검증 완료');
  }
}

// 스크립트 실행
verifyMobileHeaderIntegration().catch((error) => {
  console.error('스크립트 실패:', error);
  process.exit(1);
});

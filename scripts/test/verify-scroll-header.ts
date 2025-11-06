/**
 * 스크롤에 따른 헤더 색상 변경 검증 스크립트
 */

import { chromium, Browser, Page } from 'playwright';

async function verifyScrollHeader(): Promise<void> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('🚀 스크롤 헤더 검증 시작...\n');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    page = await context.newPage();

    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('=== 검증 1: 스크롤 전 (프로모 카드 영역) ===\n');

    // 헤더 요소 확인
    const header = page.locator('header').first();
    const headerVisible = await header.isVisible();
    console.log(`헤더 보임: ${headerVisible ? '✅' : '❌'}`);

    // 헤더 배경색 확인 (스크롤 전 - 그라데이션)
    const headerBgBefore = await header.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor
      };
    });
    console.log(`헤더 배경 (스크롤 전): ${headerBgBefore.backgroundImage !== 'none' ? '그라데이션 ✅' : '단색'}`);
    console.log(`  - backgroundImage: ${headerBgBefore.backgroundImage.substring(0, 80)}...`);

    // 로고 색상 확인 (항상 그라데이션)
    const logoColor = await page.locator('h1').first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage,
        backgroundClip: style.backgroundClip,
        webkitBackgroundClip: (el as any).style.webkitBackgroundClip
      };
    });
    console.log(`로고 그라데이션: ${logoColor.backgroundImage !== 'none' ? '✅' : '❌'}`);
    console.log(`  - backgroundClip: ${logoColor.backgroundClip}`);

    // 아이콘 색상 확인 (스크롤 전 - 흰색)
    const iconColorBefore = await page.locator('button[aria-label="검색"] svg').first().evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log(`아이콘 색상 (스크롤 전): ${iconColorBefore} ${iconColorBefore.includes('255, 255, 255') ? '✅ 흰색' : '❌'}`);

    // 프로모 섹션 높이 측정
    const promoSection = page.locator('section').first();
    const promoHeight = await promoSection.evaluate((el) => {
      return el.getBoundingClientRect().height;
    });
    console.log(`\n프로모 섹션 높이: ${promoHeight.toFixed(2)}px`);

    // 스크린샷 1
    await page.screenshot({
      path: 'scripts/test/scroll-before.png',
      fullPage: false
    });
    console.log('📸 스크린샷 저장: scroll-before.png\n');

    // === 스크롤 다운 ===
    console.log('=== 검증 2: 스크롤 후 (프로모 카드 사라진 상태) ===\n');

    const scrollAmount = promoHeight + 10; // 프로모 높이 + 여유
    await page.evaluate((y) => window.scrollTo(0, y), scrollAmount);
    await page.waitForTimeout(500); // 트랜지션 대기

    console.log(`스크롤 이동: ${scrollAmount.toFixed(2)}px ⬇️`);

    // 헤더 배경색 확인 (스크롤 후 - 흰색)
    const headerBgAfter = await header.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor
      };
    });
    console.log(`헤더 배경 (스크롤 후): ${headerBgAfter.backgroundColor === 'rgb(255, 255, 255)' ? '흰색 ✅' : '❌'}`);
    console.log(`  - backgroundColor: ${headerBgAfter.backgroundColor}`);

    // 로고는 여전히 그라데이션인지 확인
    const logoColorAfter = await page.locator('h1').first().evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage
      };
    });
    console.log(`로고 그라데이션 (스크롤 후도 유지): ${logoColorAfter.backgroundImage !== 'none' ? '✅' : '❌'}`);

    // 아이콘 색상 확인 (스크롤 후 - 검은색)
    const iconColorAfter = await page.locator('button[aria-label="검색"] svg').first().evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log(`아이콘 색상 (스크롤 후): ${iconColorAfter} ${iconColorAfter.includes('31, 41, 55') || iconColorAfter.includes('55, 65, 81') ? '✅ 검은색' : '❌'}`);

    // 헤더가 sticky인지 확인
    const isSticky = await header.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.position === 'sticky';
    });
    console.log(`헤더 sticky 적용: ${isSticky ? '✅' : '❌'}`);

    // 스크린샷 2
    await page.screenshot({
      path: 'scripts/test/scroll-after.png',
      fullPage: false
    });
    console.log('📸 스크린샷 저장: scroll-after.png\n');

    // === 스크롤 업 (역방향 테스트) ===
    console.log('=== 검증 3: 스크롤 역방향 (다시 위로) ===\n');

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    console.log('스크롤 이동: 0px ⬆️');

    // 다시 그라데이션으로 돌아왔는지 확인
    const headerBgRestored = await header.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor
      };
    });
    console.log(`헤더 배경 (다시 위로): ${headerBgRestored.backgroundImage !== 'none' ? '그라데이션 복원 ✅' : '❌'}`);

    // 아이콘도 다시 흰색인지
    const iconColorRestored = await page.locator('button[aria-label="검색"] svg').first().evaluate((el) => {
      return window.getComputedStyle(el).color;
    });
    console.log(`아이콘 색상 (다시 위로): ${iconColorRestored} ${iconColorRestored.includes('255, 255, 255') ? '✅ 흰색 복원' : '❌'}`);

    // 스크린샷 3
    await page.screenshot({
      path: 'scripts/test/scroll-restored.png',
      fullPage: false
    });
    console.log('📸 스크린샷 저장: scroll-restored.png\n');

    console.log('⏳ 5초 후 브라우저가 자동으로 닫힙니다...');
    await page.waitForTimeout(5000);

    console.log('\n✅ 모든 검증 완료!');

  } catch (error) {
    console.error('❌ 검증 중 오류:', error);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('🔚 검증 종료');
  }
}

verifyScrollHeader().catch(console.error);

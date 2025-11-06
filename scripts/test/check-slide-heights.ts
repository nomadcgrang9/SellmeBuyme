/**
 * 각 슬라이드 높이 측정 스크립트
 */

import { chromium, Browser, Page } from 'playwright';

async function checkSlideHeights(): Promise<void> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('🔍 슬라이드 높이 측정 시작...\n');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    page = await context.newPage();

    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 5개 슬라이드 순회하며 높이 측정
    for (let i = 0; i < 5; i++) {
      console.log(`\n=== 슬라이드 ${i + 1} ===`);

      // 섹션 전체 높이
      const sectionHeight = await page.locator('section').first().evaluate((el) => {
        return el.getBoundingClientRect().height;
      });
      console.log(`섹션 전체 높이: ${sectionHeight.toFixed(2)}px`);

      // 헤더 높이
      const headerHeight = await page.locator('section > div').first().evaluate((el) => {
        return el.getBoundingClientRect().height;
      });
      console.log(`헤더 높이: ${headerHeight.toFixed(2)}px`);

      // 프로모 카드 영역 높이
      const promoHeight = await page.locator('.cursor-pointer').first().evaluate((el) => {
        return el.getBoundingClientRect().height;
      });
      console.log(`프로모 영역 높이: ${promoHeight.toFixed(2)}px`);

      // 이미지 영역 높이
      const imageHeight = await page.locator('.w-48.h-48').first().evaluate((el) => {
        return el.getBoundingClientRect().height;
      });
      console.log(`이미지 영역 높이: ${imageHeight.toFixed(2)}px`);

      // 글귀 높이
      const headlineHeight = await page.locator('h3').first().evaluate((el) => {
        return el.getBoundingClientRect().height;
      });
      const headlineText = await page.locator('h3').first().textContent();
      console.log(`글귀 높이: ${headlineHeight.toFixed(2)}px`);
      console.log(`글귀 텍스트: "${headlineText?.trim()}"`);

      // 다음 슬라이드로
      if (i < 4) {
        await page.locator('.cursor-pointer').first().click();
        await page.waitForTimeout(500);
      }
    }

    console.log('\n⏳ 5초 후 브라우저가 자동으로 닫힙니다...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('🔚 측정 완료');
  }
}

checkSlideHeights().catch(console.error);

/**
 * 데스크톱 프로모카드 스타일 검증 스크립트
 */

import { chromium, Browser, Page } from 'playwright';

async function verifyDesktopPromo(): Promise<void> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('🖥️  데스크톱 프로모카드 검증 시작...\n');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    page = await context.newPage();

    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('=== 데스크톱 레이아웃 검증 ===\n');

    // 1. 모바일 헤더가 숨겨져 있는지 확인
    const mobileHeaderVisible = await page.locator('section h1').first().isVisible().catch(() => false);
    console.log(`모바일 IntegratedHeaderPromo: ${mobileHeaderVisible ? '❌ 보임 (문제)' : '✅ 숨김 (정상)'}`);

    // 2. 데스크톱 헤더가 보이는지 확인
    const desktopHeader = page.locator('header').first();
    const desktopHeaderVisible = await desktopHeader.isVisible();
    console.log(`데스크톱 Header: ${desktopHeaderVisible ? '✅ 보임' : '❌ 숨김'}`);

    // 3. PromoCardStack 찾기 (AIRecommendations 우측)
    const promoCard = page.locator('article').filter({ hasText: /공고 등록하면|인력풀 등록하면|잠자는 교육자원/ }).first();
    const promoCardVisible = await promoCard.isVisible().catch(() => false);
    console.log(`데스크톱 PromoCardStack: ${promoCardVisible ? '✅ 보임' : '❌ 안보임'}\n`);

    if (promoCardVisible) {
      console.log('=== PromoCardStack 스타일 검증 ===\n');

      // 배경 그라데이션 확인
      const cardContent = promoCard.locator('div').nth(1);
      const bgStyle = await cardContent.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor
        };
      });

      console.log('배경 스타일:');
      console.log(`  - backgroundImage: ${bgStyle.backgroundImage.substring(0, 100)}...`);

      // 시안 그라데이션인지 확인
      const isCyanGradient = bgStyle.backgroundImage.includes('79, 172, 254') ||
                             bgStyle.backgroundImage.includes('4facfe');

      if (isCyanGradient) {
        console.log('  - ❌ 모바일용 시안 그라데이션 감지됨 (문제!)');
      } else {
        console.log('  - ✅ 데스크톱용 그라데이션 적용됨 (정상)');
      }

      // 스크린샷 저장
      await promoCard.screenshot({ path: 'scripts/test/desktop-promo-card.png' });
      console.log('\n📸 스크린샷 저장: desktop-promo-card.png');
    }

    console.log('\n⏳ 5초 후 브라우저가 자동으로 닫힙니다...');
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('🔚 검증 완료');
  }
}

verifyDesktopPromo().catch(console.error);

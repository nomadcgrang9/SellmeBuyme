/**
 * 모든 프로모카드 슬라이드 검증
 */

import { chromium, Browser, Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function verifyAllSlides(): Promise<void> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log('🚀 모든 프로모카드 슬라이드 검증 시작...\n');

    // 1. DB에서 활성화된 카드 확인
    const { data: cards } = await supabase
      .from('promo_cards')
      .select('*')
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    console.log(`📊 활성화된 카드 개수: ${cards?.length || 0}\n`);

    if (!cards || cards.length === 0) {
      console.log('❌ 활성화된 프로모카드가 없습니다.');
      return;
    }

    // 각 카드 정보 출력
    cards.forEach((card, index) => {
      console.log(`--- 카드 ${index + 1} ---`);
      console.log(`헤드라인: ${card.headline}`);
      console.log(`배경 모드: ${card.background_color_mode}`);
      console.log(`배경색/그라데이션: ${card.background_color || `${card.background_gradient_start} → ${card.background_gradient_end}`}`);
      console.log(`폰트 색: ${card.font_color}`);
      console.log('');
    });

    // 2. 브라우저 실행
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    page = await context.newPage();

    console.log('📱 모바일 뷰포트 설정 완료 (375x812)\n');

    await page.goto('http://localhost:5174', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 3. 각 슬라이드 확인
    for (let i = 0; i < cards.length; i++) {
      console.log(`\n=== 슬라이드 ${i + 1} 검증 ===`);

      // 헤더 요소 확인 (모바일 헤더만)
      const headerVisible = await page.locator('section h1').first().isVisible();
      const headerText = await page.locator('section h1').first().textContent();
      console.log(`헤더: ${headerVisible ? '✅ 보임' : '❌ 안보임'} ("${headerText}")`);

      // 아이콘 확인
      const searchIcon = await page.locator('button[aria-label="검색"]').isVisible();
      const bellIcon = await page.locator('button[aria-label="알림"]').isVisible();
      const heartIcon = await page.locator('button[aria-label="북마크"]').isVisible();
      console.log(`아이콘: 검색 ${searchIcon ? '✅' : '❌'} / 알림 ${bellIcon ? '✅' : '❌'} / 북마크 ${heartIcon ? '✅' : '❌'}`);

      // 프로모 헤드라인 확인
      const headlineText = await page.locator('h3').first().textContent();
      console.log(`프로모 헤드라인: "${headlineText}"`);

      // 배경 그라데이션 확인
      const sectionBg = await page.locator('section').first().evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          backgroundImage: style.backgroundImage,
          backgroundColor: style.backgroundColor
        };
      });
      console.log(`섹션 배경: ${sectionBg.backgroundImage !== 'none' ? sectionBg.backgroundImage.substring(0, 80) + '...' : sectionBg.backgroundColor}`);

      // 헤더 텍스트 색상 확인
      const headerColor = await page.locator('h1').first().evaluate((el) => {
        return window.getComputedStyle(el).color;
      });
      console.log(`헤더 텍스트 색상: ${headerColor}`);

      // 스크린샷 저장
      await page.screenshot({
        path: `scripts/test/slide-${i + 1}-screenshot.png`,
        fullPage: false
      });
      console.log(`📸 스크린샷 저장: slide-${i + 1}-screenshot.png`);

      // 다음 슬라이드로 (마지막이 아니면)
      if (i < cards.length - 1) {
        console.log('⏭️  다음 슬라이드로 이동...');
        await page.locator('.cursor-pointer').first().click();
        await page.waitForTimeout(500); // 트랜지션 대기
      }
    }

    console.log('\n⏳ 10초 후 브라우저가 자동으로 닫힙니다...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('❌ 검증 중 오류:', error);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('🔚 검증 완료');
  }
}

verifyAllSlides().catch(console.error);

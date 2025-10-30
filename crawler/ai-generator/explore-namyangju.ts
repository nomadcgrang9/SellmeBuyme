/**
 * 구리남양주교육지원청 게시판 구조 탐색
 */

import { chromium } from 'playwright';

async function exploreNamyangjuBoard(): Promise<void> {
  console.log('🔍 구리남양주교육지원청 게시판 구조 탐색\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto('http://www.goegn.kr', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 게시판 관련 링크 찾기
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'));
      return anchors
        .filter(a => {
          const href = a.getAttribute('href') || '';
          const text = a.innerText?.trim() || '';
          return href.includes('board') ||
                 href.includes('ntt') ||
                 href.includes('list') ||
                 href.includes('bbs') ||
                 text.includes('게시판') ||
                 text.includes('공고') ||
                 text.includes('채용') ||
                 text.includes('모집');
        })
        .map(a => ({
          text: a.innerText?.trim() || '',
          href: a.getAttribute('href') || ''
        }))
        .slice(0, 30);
    });

    console.log('📋 게시판 관련 링크 (최대 30개):');
    links.forEach((l, idx) => {
      console.log(`  ${idx + 1}. [${l.text}] ${l.href}`);
    });

    console.log('\n📸 페이지 스크린샷 저장...');
    await page.screenshot({ path: './temp/namyangju-homepage.png', fullPage: true });
    console.log('   저장: ./temp/namyangju-homepage.png');

  } catch (error: any) {
    console.error('❌ 오류:', error.message);
  } finally {
    await browser.close();
  }
}

exploreNamyangjuBoard();

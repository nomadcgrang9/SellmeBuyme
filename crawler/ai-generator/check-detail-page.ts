/**
 * 상세 페이지 구조 확인
 */
import { chromium } from 'playwright';

async function checkDetailPage() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  const detailUrl = 'https://www.goegn.kr/goegn/na/ntt/selectNttInfo.do?mi=13515&bbsId=8356&nttSn=1340895';

  await page.goto(detailUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('🔍 상세 페이지 구조 분석\n');

  // 본문 컨테이너 찾기
  const selectors = [
    'div.nttCn',
    '.view_con',
    '.view-content',
    'div.board_view',
    'div.cont',
    'td.cont',
    'div[class*="content"]',
    'div[class*="view"]'
  ];

  for (const selector of selectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      const text = await page.locator(selector).first().textContent();
      console.log(`✅ ${selector}: ${count}개 (텍스트 길이: ${text?.length}자)`);
      if (text && text.length > 50) {
        console.log(`   내용: ${text.substring(0, 100)}...\n`);
      }
    }
  }

  // 첨부파일 찾기
  console.log('\n📎 첨부파일 링크 찾기:');
  const attachSelectors = [
    'a[href*="download"]',
    'a[href*="file"]',
    'a.file',
    'div.file a',
    'ul.file li a'
  ];

  for (const selector of attachSelectors) {
    const count = await page.locator(selector).count();
    if (count > 0) {
      console.log(`✅ ${selector}: ${count}개`);
      const href = await page.locator(selector).first().getAttribute('href');
      const text = await page.locator(selector).first().textContent();
      console.log(`   href: ${href}`);
      console.log(`   text: ${text}`);
    }
  }

  await page.waitForTimeout(10000);
  await browser.close();
}

checkDetailPage();

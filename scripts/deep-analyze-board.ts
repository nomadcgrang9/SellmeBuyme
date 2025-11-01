import { chromium } from 'playwright';

const TEST_URL = 'https://www.goegn.kr/goegn/na/ntt/selectNttInfo.do?mi=14084&bbsId=8656&nttSn=42578';

async function deepAnalyze() {
  console.log('\n🔍 상세 페이지 HTML 구조 분석\n');
  console.log(`URL: ${TEST_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 1. 모든 가능한 본문 셀렉터 테스트
  const contentAnalysis = await page.evaluate(() => {
    const selectors = [
      '.nttCn',
      '#nttCn',
      '.cn',
      '.content',
      '.view-content',
      '.view_content',
      '.detail',
      '.board-view',
      '.board_view',
      '.txt_area',
      '.view_txt',
      '[class*="content"]',
      '[class*="view"]',
      '[id*="content"]',
      '[id*="view"]'
    ];

    const results: any[] = [];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent?.trim() || '';
        const html = el.innerHTML;
        results.push({
          selector,
          textLength: text.length,
          htmlLength: html.length,
          hasImages: html.includes('<img'),
          preview: text.substring(0, 150),
          tagName: el.tagName,
          classList: Array.from(el.classList)
        });
      }
    }

    return results;
  });

  console.log('📝 발견된 요소들:\n');
  for (const result of contentAnalysis) {
    console.log(`✅ ${result.selector}:`);
    console.log(`   태그: <${result.tagName}>`);
    console.log(`   클래스: [${result.classList.join(', ')}]`);
    console.log(`   텍스트: ${result.textLength}자`);
    console.log(`   HTML: ${result.htmlLength}자`);
    console.log(`   이미지: ${result.hasImages ? '있음' : '없음'}`);
    console.log(`   미리보기: "${result.preview}..."`);
    console.log('');
  }

  // 2. 본문이 가장 많은 요소 찾기
  const largestContent = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('div, article, section, td'));

    const sorted = allElements
      .map(el => ({
        selector: el.className ? `.${el.className.split(' ')[0]}` : el.id ? `#${el.id}` : el.tagName.toLowerCase(),
        textLength: (el.textContent?.trim() || '').length,
        htmlLength: el.innerHTML.length,
        tagName: el.tagName,
        id: el.id,
        classList: Array.from(el.classList)
      }))
      .filter(item => item.textLength > 100)
      .sort((a, b) => b.textLength - a.textLength)
      .slice(0, 5);

    return sorted;
  });

  console.log('\n📦 텍스트가 많은 상위 5개 요소:\n');
  largestContent.forEach((item, index) => {
    console.log(`${index + 1}. ${item.selector}`);
    console.log(`   태그: <${item.tagName}>`);
    console.log(`   ID: ${item.id || '(없음)'}`);
    console.log(`   클래스: [${item.classList.join(', ')}]`);
    console.log(`   텍스트: ${item.textLength}자`);
    console.log('');
  });

  await browser.close();
}

deepAnalyze();

import { chromium } from 'playwright';

// 실제 게시글 URL (첫 번째 게시글)
const TEST_URL = 'https://www.goegn.kr/goegn/na/ntt/selectNttInfo.do?mi=14084&bbsId=8656&nttSn=1343374';

async function testContentSelectors() {
  console.log('\n🔍 본문 셀렉터 테스트\n');
  console.log(`URL: ${TEST_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 현재 크롤러에 있는 셀렉터들 테스트
  const results = await page.evaluate(() => {
    const selectors = [
      '.nttCn',
      '#nttCn',
      '.cn',
      '.txt_area',
      '.view_content',
      '.view-content',
      '.content',
      '.detail',
      '.board-view',
      '.board_view'
    ];

    const results: any[] = [];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el) {
        const text = el.textContent?.trim() || '';
        results.push({
          selector,
          found: true,
          textLength: text.length,
          preview: text.substring(0, 200),
          tagName: el.tagName,
          classList: Array.from(el.classList).join(', ')
        });
      } else {
        results.push({
          selector,
          found: false
        });
      }
    }

    return results;
  });

  console.log('📊 셀렉터 테스트 결과:\n');
  for (const result of results) {
    if (result.found) {
      console.log(`✅ ${result.selector}`);
      console.log(`   태그: <${result.tagName}> (${result.classList})`);
      console.log(`   길이: ${result.textLength}자`);
      console.log(`   미리보기: "${result.preview}..."`);
      console.log('');
    } else {
      console.log(`❌ ${result.selector} - 찾을 수 없음`);
    }
  }

  // 가장 큰 텍스트 컨테이너 찾기
  const largestContent = await page.evaluate(() => {
    const allElements = Array.from(document.querySelectorAll('div, article, section, td, p'));

    const sorted = allElements
      .map(el => {
        const text = el.textContent?.trim() || '';
        // 직접 자식의 텍스트만 계산 (중복 방지)
        let directText = '';
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            directText += node.textContent;
          }
        }

        return {
          selector: el.className ? `.${el.className.split(' ')[0]}` : el.id ? `#${el.id}` : el.tagName.toLowerCase(),
          textLength: text.length,
          directTextLength: directText.trim().length,
          tagName: el.tagName,
          id: el.id,
          classList: Array.from(el.classList).join(', '),
          preview: text.substring(0, 150)
        };
      })
      .filter(item => item.textLength > 50)
      .sort((a, b) => b.textLength - a.textLength)
      .slice(0, 10);

    return sorted;
  });

  console.log('\n\n📦 텍스트가 많은 상위 10개 요소:\n');
  largestContent.forEach((item, index) => {
    console.log(`${index + 1}. ${item.selector}`);
    console.log(`   태그: <${item.tagName}> (${item.classList || '(클래스 없음)'})`);
    console.log(`   ID: ${item.id || '(없음)'}`);
    console.log(`   길이: ${item.textLength}자`);
    console.log(`   미리보기: "${item.preview}..."`);
    console.log('');
  });

  await browser.close();
}

testContentSelectors().catch(console.error);

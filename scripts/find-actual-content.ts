import { chromium } from 'playwright';

const TEST_URL = 'https://www.goegn.kr/goegn/na/ntt/selectNttInfo.do?mi=14084&bbsId=8656&nttSn=1343374';

async function findActualContent() {
  console.log('\n🔍 실제 본문 요소 찾기\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 게시판 관련 클래스/ID 찾기
  const boardElements = await page.evaluate(() => {
    // 게시판 본문은 보통 table 안에 있음
    const tables = document.querySelectorAll('table');
    const results: any[] = [];

    for (const table of tables) {
      // table 안의 td들 중에서 실제 본문이 있을만한 것 찾기
      const tds = table.querySelectorAll('td');
      for (const td of tds) {
        const text = td.textContent?.trim() || '';
        // 200자 이상의 텍스트가 있으면 본문일 가능성이 높음
        if (text.length > 200 && text.length < 10000) {
          results.push({
            type: 'td',
            id: td.id,
            classList: Array.from(td.classList).join(', '),
            textLength: text.length,
            preview: text.substring(0, 300),
            // 부모 요소 정보
            parentTag: td.parentElement?.tagName,
            parentClass: td.parentElement?.className || ''
          });
        }
      }
    }

    // div.board-view, div.view 같은 것도 찾기
    const divs = document.querySelectorAll('div[class*="view"], div[class*="board"], div[class*="content"]');
    for (const div of divs) {
      const text = div.textContent?.trim() || '';
      if (text.length > 200 && text.length < 10000) {
        results.push({
          type: 'div',
          id: div.id,
          classList: Array.from(div.classList).join(', '),
          textLength: text.length,
          preview: text.substring(0, 300)
        });
      }
    }

    return results.sort((a, b) => a.textLength - b.textLength); // 짧은 것부터 (더 정확할 가능성)
  });

  console.log('📝 본문으로 추정되는 요소들:\n');
  boardElements.slice(0, 5).forEach((item, index) => {
    console.log(`${index + 1}. <${item.type.toUpperCase()}>`);
    console.log(`   ID: ${item.id || '(없음)'}`);
    console.log(`   클래스: ${item.classList || '(없음)'}`);
    if (item.parentTag) {
      console.log(`   부모: <${item.parentTag}> class="${item.parentClass}"`);
    }
    console.log(`   길이: ${item.textLength}자`);
    console.log(`   미리보기:\n   "${item.preview}..."\n`);
  });

  await browser.close();
}

findActualContent().catch(console.error);

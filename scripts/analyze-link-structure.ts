import { chromium } from 'playwright';

const TEST_URL = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656';

async function analyzeLinks() {
  console.log('\n🔍 남양주 게시판 링크 구조 분석\n');
  console.log(`URL: ${TEST_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 테이블 첫 행 분석
  const linkAnalysis = await page.evaluate(() => {
    const firstRow = document.querySelector('tbody tr');
    if (!firstRow) return { error: '테이블을 찾을 수 없음' };

    console.log('\n📋 첫 행의 전체 HTML:');
    console.log(firstRow.innerHTML);

    // 모든 a 태그 찾기
    const allLinks = firstRow.querySelectorAll('a');
    const results: any[] = [];

    for (const link of allLinks) {
      const href = link.getAttribute('href');
      const onclick = link.getAttribute('onclick');
      const dataValue = link.getAttribute('data-value');
      const text = link.textContent?.trim();

      results.push({
        text: text?.substring(0, 50),
        href: href?.substring(0, 100),
        onclick: onclick?.substring(0, 150),
        dataValue: dataValue,
        className: link.className
      });
    }

    return results;
  });

  console.log('\n📝 발견된 링크들:');
  console.log(JSON.stringify(linkAnalysis, null, 2));

  // JavaScript 함수 찾기
  const jsAnalysis = await page.evaluate(() => {
    const firstRow = document.querySelector('tbody tr');
    if (!firstRow) return null;

    const linkWithOnclick = firstRow.querySelector('a[onclick]');
    if (linkWithOnclick) {
      const onclick = linkWithOnclick.getAttribute('onclick');
      console.log('\n🔗 onClick 함수:');
      console.log(onclick);

      // onclick에서 실제 URL 추출 시도
      if (onclick && onclick.includes("'")) {
        const matches = onclick.match(/'([^']+)'/g);
        console.log('\n🔎 추출된 파라미터들:');
        console.log(matches);
      }
    }

    return linkWithOnclick?.getAttribute('onclick');
  });

  console.log('\n\n✅ 분석 완료');
  console.log('다음 단계: onclick 함수를 분석하여 실제 URL을 생성해야 합니다');

  await browser.close();
}

analyzeLinks().catch(console.error);

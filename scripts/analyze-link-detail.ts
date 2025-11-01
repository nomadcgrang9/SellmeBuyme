import { chromium } from 'playwright';

const TEST_URL = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656';

async function analyzeLinks() {
  console.log('\n🔍 남양주 게시판 상세 링크 분석\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  // 페이지의 모든 스크립트 함수 확인
  const pageInfo = await page.evaluate(() => {
    const firstRow = document.querySelector('tbody tr');
    if (!firstRow) return { error: '테이블을 찾을 수 없음' };

    // 모든 속성 확인
    const allElements = firstRow.querySelectorAll('*');
    const attributes: any = {};

    for (const el of allElements) {
      // 모든 속성 수집
      for (const attr of el.attributes) {
        if (attr.name.includes('data') || attr.name.includes('ntt') || attr.name.includes('id')) {
          attributes[el.tagName + '.' + el.className] = {
            ...attributes[el.tagName + '.' + el.className],
            [attr.name]: attr.value.substring(0, 200)
          };
        }
      }
    }

    // td 요소들 검사
    const tds = Array.from(firstRow.querySelectorAll('td')).map((td, idx) => ({
      index: idx,
      text: td.textContent?.substring(0, 100),
      classes: td.className,
      dataAttrs: Array.from(td.attributes)
        .filter(a => a.name.startsWith('data-'))
        .map(a => `${a.name}=${a.value.substring(0, 100)}`)
    }));

    return {
      attributes,
      tds,
      innerHTML: firstRow.innerHTML.substring(0, 1000)
    };
  });

  console.log('📊 테이블 행 구조:');
  console.log(JSON.stringify(pageInfo, null, 2));

  // 직접 클릭해서 어디로 가는지 확인
  const afterClick = await page.evaluate(async () => {
    const link = document.querySelector('tbody tr a.nttInfoBtn');
    if (!link) return null;

    // onclick 이벤트 리스너 확인
    const onclickAttr = link.getAttribute('onclick');
    console.log('\n🔗 onclick 속성값:');
    console.log(onclickAttr);

    // 부모 tr의 모든 데이터 확인
    const tr = link.closest('tr');
    console.log('\n📋 tr 요소의 모든 data-* 속성:');
    for (const attr of tr?.attributes || []) {
      if (attr.name.startsWith('data-')) {
        console.log(`${attr.name}: ${attr.value}`);
      }
    }

    // nttSn 찾기 (일반적으로 사용되는 속성)
    const nttSnElements = document.querySelectorAll('[*|nttSn], [data-ntt-sn], input[value*="ntt"]');
    console.log('\n🔎 nttSn 관련 요소:');
    for (const el of nttSnElements) {
      console.log(el.outerHTML.substring(0, 200));
    }

    return onclickAttr;
  });

  console.log('\n\n✅ 분석 완료');

  await browser.close();
}

analyzeLinks().catch(console.error);

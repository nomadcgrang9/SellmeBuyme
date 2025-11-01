import { chromium } from 'playwright';

async function debugAttachment() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('\n=== 남양주 사이트 첨부파일 구조 분석 ===\n');

    // 목록 페이지
    await page.goto('https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656');
    await page.waitForTimeout(2000);

    // 첫 공고 클릭
    await page.click('tbody tr:first-child td.ta_l a');
    await page.waitForTimeout(3000);

    console.log('🔍 페이지 로드 완료. 첨부파일 섹션 분석 중...\n');

    // 방법 1: .hwp 텍스트 포함된 모든 요소
    const hwpElements = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all
        .filter(el => (el.textContent || '').includes('.hwp'))
        .map(el => ({
          tag: el.tagName,
          text: (el.textContent || '').trim().substring(0, 100),
          html: el.outerHTML.substring(0, 300)
        }))
        .slice(0, 5);
    });

    console.log('📎 .hwp 포함 요소:');
    hwpElements.forEach((el, i) => {
      console.log(`\n[${i + 1}] <${el.tag}>`);
      console.log(`텍스트: ${el.text}`);
      console.log(`HTML: ${el.html}...`);
    });

    // 방법 2: 모든 <a> 태그의 onclick 확인
    const allLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({
        href: a.getAttribute('href') || '',
        text: (a.textContent || '').trim(),
        onclick: a.getAttribute('onclick') || ''
      })).filter(link =>
        link.href.includes('hwp') ||
        link.text.includes('.hwp') ||
        link.onclick.includes('file') ||
        link.onclick.includes('download')
      );
    });

    console.log('\n\n📎 파일 관련 링크:');
    allLinks.forEach((link, i) => {
      console.log(`\n[${i + 1}]`);
      console.log(`  href: ${link.href}`);
      console.log(`  text: ${link.text}`);
      console.log(`  onclick: ${link.onclick}`);
    });

    console.log('\n\n✅ 브라우저 유지 중 (20초)...');
    await page.waitForTimeout(20000);

  } finally {
    await browser.close();
  }
}

debugAttachment();

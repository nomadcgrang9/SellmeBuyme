import { chromium } from 'playwright';

async function compareAttachmentStructure() {
  const browser = await chromium.launch({ headless: false });

  console.log('\n🔍 의정부 vs 남양주 첨부파일 구조 비교\n');

  // 1. 의정부 분석
  console.log('=== 1. 의정부 교육지원청 ===\n');
  const page1 = await browser.newPage();

  try {
    await page1.goto('http://222.120.4.134/goeujb/na/ntt/selectNttList.do?mi=7019&bbsId=4117');
    await page1.waitForTimeout(2000);

    await page1.click('tbody tr:first-child td.ta_l a');
    await page1.waitForTimeout(3000);

    const uijeongbuAttachment = await page1.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const hwpLinks = links.filter(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        const text = (link.textContent || '').toLowerCase();
        return href.includes('.hwp') || text.includes('.hwp');
      });

      return hwpLinks.map(link => ({
        href: link.getAttribute('href') || '',
        text: link.textContent?.trim() || '',
        onclick: link.getAttribute('onclick') || '',
        html: link.outerHTML.substring(0, 300)
      }));
    });

    console.log(`의정부 .hwp 링크: ${uijeongbuAttachment.length}개\n`);
    uijeongbuAttachment.forEach((link, i) => {
      console.log(`[${i + 1}]`);
      console.log(`  href: "${link.href}"`);
      console.log(`  text: "${link.text}"`);
      console.log(`  onclick: "${link.onclick}"`);
      console.log(`  HTML: ${link.html}...\n`);
    });

  } catch (error) {
    console.error('의정부 에러:', error);
  }

  await page1.close();

  // 2. 남양주 분석
  console.log('\n=== 2. 남양주 교육지원청 ===\n');
  const page2 = await browser.newPage();

  try {
    await page2.goto('https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656');
    await page2.waitForTimeout(2000);

    await page2.click('tbody tr:first-child td.ta_l a');
    await page2.waitForTimeout(3000);

    const namyangjuAttachment = await page2.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const hwpLinks = links.filter(link => {
        const href = (link.getAttribute('href') || '').toLowerCase();
        const text = (link.textContent || '').toLowerCase();
        return href.includes('.hwp') || text.includes('.hwp');
      });

      return hwpLinks.map(link => ({
        href: link.getAttribute('href') || '',
        text: link.textContent?.trim() || '',
        onclick: link.getAttribute('onclick') || '',
        html: link.outerHTML.substring(0, 300)
      }));
    });

    console.log(`남양주 .hwp 링크: ${namyangjuAttachment.length}개\n`);
    namyangjuAttachment.forEach((link, i) => {
      console.log(`[${i + 1}]`);
      console.log(`  href: "${link.href}"`);
      console.log(`  text: "${link.text}"`);
      console.log(`  onclick: "${link.onclick}"`);
      console.log(`  HTML: ${link.html}...\n`);
    });

  } catch (error) {
    console.error('남양주 에러:', error);
  }

  await page2.close();

  console.log('\n✅ 분석 완료! 브라우저를 10초간 유지합니다...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  await browser.close();
}

compareAttachmentStructure();

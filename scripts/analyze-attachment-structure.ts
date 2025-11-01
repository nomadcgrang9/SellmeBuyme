import { chromium } from 'playwright';

async function analyzeAttachmentStructure() {
  console.log('\n🔍 남양주 사이트 첨부파일 구조 정밀 분석\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. 목록 페이지
    console.log('📍 Step 1: 목록 페이지 접속...');
    await page.goto('https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // 2. 첫 번째 공고 클릭
    console.log('\n📍 Step 2: 첫 번째 공고 클릭...');
    const firstLink = await page.$('tbody tr:first-child td.ta_l a');
    const title = await firstLink?.textContent();
    console.log(`   제목: ${title?.trim()}`);

    await firstLink?.click();
    await page.waitForTimeout(3000);

    // 3. 첨부파일 섹션 찾기
    console.log('\n📍 Step 3: 첨부파일 섹션 HTML 추출...\n');

    const attachmentAnalysis = await page.evaluate(() => {
      // 첨부파일이라는 텍스트를 포함한 요소 찾기
      const allElements = Array.from(document.querySelectorAll('*'));
      const attachmentElements = allElements.filter(el => {
        const text = el.textContent || '';
        return text.includes('첨부파일') && el.children.length < 20;
      });

      if (attachmentElements.length === 0) {
        return { found: false };
      }

      // 첨부파일 섹션의 상위 테이블/div 찾기
      const section = attachmentElements[0].closest('table, tbody, tr, div.file, div[class*="attach"]');

      if (!section) {
        return {
          found: true,
          directHTML: attachmentElements[0].outerHTML
        };
      }

      // 모든 <a> 태그 분석
      const links = Array.from(section.querySelectorAll('a'));
      const linkData = links.map(link => ({
        href: link.getAttribute('href') || '',
        text: link.textContent?.trim() || '',
        onclick: link.getAttribute('onclick') || '',
        className: link.className,
        outerHTML: link.outerHTML
      }));

      return {
        found: true,
        sectionHTML: section.outerHTML,
        links: linkData,
        sectionTagName: section.tagName
      };
    });

    if (!attachmentAnalysis.found) {
      console.log('❌ 첨부파일 섹션을 찾을 수 없습니다.');
    } else {
      console.log('✅ 첨부파일 섹션 찾음!\n');
      console.log(`태그: <${attachmentAnalysis.sectionTagName}>\n`);

      if (attachmentAnalysis.links && attachmentAnalysis.links.length > 0) {
        console.log(`발견된 링크: ${attachmentAnalysis.links.length}개\n`);
        attachmentAnalysis.links.forEach((link, i) => {
          console.log(`[링크 ${i + 1}]`);
          console.log(`  href: "${link.href}"`);
          console.log(`  text: "${link.text}"`);
          console.log(`  onclick: "${link.onclick}"`);
          console.log(`  class: "${link.className}"`);
          console.log(`  HTML: ${link.outerHTML.substring(0, 200)}\n`);
        });
      }

      console.log('\n=== 전체 HTML (처음 2000자) ===\n');
      console.log(attachmentAnalysis.sectionHTML?.substring(0, 2000));
    }

    console.log('\n\n브라우저를 15초간 유지합니다...');
    await page.waitForTimeout(15000);

  } catch (error) {
    console.error('\n❌ 에러:', error);
  } finally {
    await browser.close();
  }
}

analyzeAttachmentStructure();

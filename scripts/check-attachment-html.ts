import { chromium } from 'playwright';

async function checkAttachmentHTML() {
  console.log('\n🔍 남양주 사이트 첨부파일 HTML 구조 확인...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 목록 페이지 접속
    await page.goto('https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // 첫 번째 공고 클릭
    await page.click('tbody tr td.ta_l a');
    await page.waitForTimeout(3000);

    // 첨부파일 섹션의 HTML 추출
    const attachmentHTML = await page.evaluate(() => {
      // "첨부파일" 텍스트 포함된 섹션 찾기
      const allText = document.body.innerText;
      if (!allText.includes('첨부파일')) {
        return { found: false, message: '첨부파일 섹션을 찾을 수 없습니다' };
      }

      // 첨부파일 관련 요소들 찾기
      const elements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent || '';
        return text.includes('첨부파일') && el.children.length < 10;
      });

      if (elements.length === 0) {
        return { found: false, message: '첨부파일 요소를 찾을 수 없습니다' };
      }

      // 첨부파일 섹션의 부모 요소 HTML 추출
      const attachmentSection = elements[0].closest('table, div, section');
      return {
        found: true,
        html: attachmentSection ? attachmentSection.outerHTML : elements[0].outerHTML
      };
    });

    if (!attachmentHTML.found) {
      console.log(`❌ ${attachmentHTML.message}`);
    } else {
      console.log('✅ 첨부파일 섹션 HTML:\n');
      console.log(attachmentHTML.html);
    }

    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ 에러:', error);
  } finally {
    await browser.close();
  }
}

checkAttachmentHTML();

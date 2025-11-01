import { chromium } from 'playwright';

const BOARDS = {
  '남양주': 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656',
  '성남': 'https://www.goesn.kr/goesn/na/ntt/selectNttList.do?mi=23603&bbsId=17872',
  '의정부': 'http://222.120.4.134/goeujb/na/ntt/selectNttList.do?mi=7019&bbsId=4117'
};

async function analyzeBoard(name: string, url: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 ${name} 게시판 구조 분석`);
  console.log('='.repeat(70));
  console.log(`URL: ${url}\n`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. 목록 페이지 접속
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 2. 첫 번째 게시글 링크 찾기
    console.log('1️⃣ 목록 페이지:');
    const firstLink = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      const boardLink = links.find(a => {
        const href = a.getAttribute('href');
        return href && (
          href.includes('selectNttInfo') ||
          href.includes('view') ||
          href.includes('detail') ||
          href.includes('nttId')
        );
      });

      if (boardLink) {
        return {
          href: boardLink.getAttribute('href'),
          text: boardLink.textContent?.trim()
        };
      }
      return null;
    });

    if (!firstLink) {
      console.log('   ❌ 게시글 링크를 찾을 수 없습니다');
      await browser.close();
      return;
    }

    console.log(`   ✅ 첫 게시글: "${firstLink.text}"`);
    console.log(`   링크: ${firstLink.href}`);

    // 3. 상세 페이지 접속
    const detailUrl = firstLink.href.startsWith('http')
      ? firstLink.href
      : new URL(firstLink.href, url).href;

    console.log(`\n2️⃣ 상세 페이지 분석:`);
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 4. 본문 구조 분석
    const contentAnalysis = await page.evaluate(() => {
      // 가능한 본문 셀렉터들
      const selectors = [
        '.view-content',
        '.content',
        '.detail',
        '.board-view',
        '.board_view',
        '.nttCn',
        '.cn',
        '.view_content',
        '#nttCn',
        '#content',
        '.txt_area',
        '.view_txt'
      ];

      const results: any = {};

      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el) {
          const text = el.textContent?.trim() || '';
          const html = el.innerHTML;
          results[selector] = {
            found: true,
            textLength: text.length,
            htmlLength: html.length,
            hasImages: html.includes('<img'),
            preview: text.substring(0, 100)
          };
        }
      }

      // 모든 div, article, section 중 텍스트가 많은 것 찾기
      const allContainers = Array.from(document.querySelectorAll('div, article, section'));
      const largestContainer = allContainers
        .map(el => ({
          selector: el.className ? `.${el.className.split(' ')[0]}` : el.tagName.toLowerCase(),
          textLength: (el.textContent?.trim() || '').length,
          hasClass: !!el.className
        }))
        .filter(item => item.textLength > 100)
        .sort((a, b) => b.textLength - a.textLength)[0];

      return {
        knownSelectors: results,
        largestContainer
      };
    });

    console.log('\n   📝 발견된 본문 셀렉터:');
    for (const [selector, info] of Object.entries(contentAnalysis.knownSelectors)) {
      const data = info as any;
      console.log(`   ${selector}:`);
      console.log(`     - 텍스트 길이: ${data.textLength}자`);
      console.log(`     - 이미지 포함: ${data.hasImages ? '✅' : '❌'}`);
      console.log(`     - 미리보기: ${data.preview}...`);
    }

    if (Object.keys(contentAnalysis.knownSelectors).length === 0) {
      console.log('   ❌ 알려진 셀렉터로 본문을 찾을 수 없습니다');
      console.log('\n   📦 가장 큰 컨테이너:');
      console.log(`   ${contentAnalysis.largestContainer.selector}`);
      console.log(`     - 텍스트 길이: ${contentAnalysis.largestContainer.textLength}자`);
    }

  } catch (error) {
    console.error('   ❌ 분석 실패:', error instanceof Error ? error.message : error);
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('\n🔍 교육청 게시판 구조 분석 시작\n');

  for (const [name, url] of Object.entries(BOARDS)) {
    try {
      await analyzeBoard(name, url);
    } catch (error) {
      console.error(`\n❌ ${name} 분석 실패:`, error);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 분석 완료');
  console.log('='.repeat(70));
}

main();

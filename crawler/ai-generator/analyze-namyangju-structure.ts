/**
 * 구리남양주교육지원청 게시판 실제 HTML 구조 분석
 * 정확한 선택자를 찾기 위한 상세 분석
 */

import { chromium } from 'playwright';
import { writeFile } from 'fs/promises';
import { join } from 'path';

async function analyzeNamyangjuStructure(): Promise<void> {
  console.log('🔍 구리남양주교육지원청 게시판 상세 구조 분석\n');

  const boardUrl = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=13515&bbsId=8356';
  const browser = await chromium.launch({ headless: false }); // 시각적으로 확인
  const page = await browser.newPage();

  try {
    console.log(`📍 게시판 접속: ${boardUrl}`);
    await page.goto(boardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // 1. 페이지 제목 확인
    const title = await page.title();
    console.log(`\n📄 페이지 제목: ${title}`);

    // 2. 게시판 컨테이너 찾기
    console.log('\n🔍 게시판 컨테이너 선택자 검색:');
    const containerSelectors = [
      'table',
      'table.board-list',
      'table.tbl_list',
      'div.board',
      'div.boardList',
      'ul.list',
      'div.list',
      'tbody',
      '.tbl_board tbody',
      '.board tbody'
    ];

    for (const selector of containerSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   ✅ ${selector}: ${count}개 발견`);
      }
    }

    // 3. 게시판 행(rows) 찾기
    console.log('\n🔍 게시판 행 선택자 검색:');
    const rowSelectors = [
      'table tbody tr',
      'table tr',
      '.tbl_list tbody tr',
      '.board-list tbody tr',
      'ul.list li',
      'div.list-item'
    ];

    for (const selector of rowSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        console.log(`   ✅ ${selector}: ${count}개 발견`);
      }
    }

    // 4. 첫 번째 게시글 상세 분석
    console.log('\n📋 첫 번째 게시글 상세 분석:');

    // 가장 많은 tr 찾기
    const allTrs = await page.locator('table tbody tr').all();
    console.log(`   총 tr 개수: ${allTrs.length}개`);

    if (allTrs.length > 0) {
      const firstRow = allTrs[0];
      const firstRowHtml = await firstRow.innerHTML();
      console.log(`\n   첫 번째 행 HTML:\n${firstRowHtml}\n`);

      // td 개수 확인
      const tds = await firstRow.locator('td').all();
      console.log(`   td 개수: ${tds.length}개`);

      // 각 td 내용 확인
      for (let i = 0; i < tds.length; i++) {
        const text = await tds[i].textContent();
        const classes = await tds[i].getAttribute('class');
        console.log(`   td[${i}]: class="${classes}" text="${text?.trim().substring(0, 50)}"`);
      }

      // 링크 찾기
      const links = await firstRow.locator('a').all();
      console.log(`\n   링크 개수: ${links.length}개`);
      for (let i = 0; i < links.length; i++) {
        const href = await links[i].getAttribute('href');
        const onclick = await links[i].getAttribute('onclick');
        const text = await links[i].textContent();
        console.log(`   링크[${i}]:`);
        console.log(`      href: ${href}`);
        console.log(`      onclick: ${onclick}`);
        console.log(`      text: ${text?.trim().substring(0, 50)}`);
      }
    }

    // 5. 전체 HTML 저장
    const fullHtml = await page.content();
    const savePath = join(process.cwd(), 'temp', 'namyangju-full-analysis.html');
    await writeFile(savePath, fullHtml, 'utf-8');
    console.log(`\n💾 전체 HTML 저장: ${savePath}`);

    // 6. 스크린샷 저장
    const screenshotPath = join(process.cwd(), 'temp', 'namyangju-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 스크린샷 저장: ${screenshotPath}`);

    // 7. JavaScript 함수 찾기
    console.log('\n🔍 JavaScript 함수 분석:');
    const functions = await page.evaluate(() => {
      const fnNames: string[] = [];
      // window 객체에서 함수 찾기
      for (const key in window) {
        if (typeof (window as any)[key] === 'function' &&
            (key.includes('ntt') || key.includes('view') || key.includes('detail') || key.includes('fn'))) {
          fnNames.push(key);
        }
      }
      return fnNames;
    });
    console.log(`   발견된 함수들: ${functions.join(', ')}`);

    console.log('\n✅ 분석 완료! 브라우저를 10초 후에 닫습니다...');
    await page.waitForTimeout(10000);

  } catch (error: any) {
    console.error('❌ 오류:', error.message);
  } finally {
    await browser.close();
  }
}

analyzeNamyangjuStructure();

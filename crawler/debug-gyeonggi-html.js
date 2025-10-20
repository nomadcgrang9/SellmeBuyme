/**
 * 경기도 게시판 HTML 구조 디버깅
 */

import { chromium } from 'playwright';
import fs from 'fs';

async function debugHtml() {
  console.log('🔍 경기도 게시판 HTML 구조 분석 시작\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    const listEndpoint = 'https://www.goe.go.kr/recruit/ad/func/pb/hnfpPbancList.do';
    const formData = {
      mi: '10502',
      searchCondition: '',
      searchKeyword: '',
      pageIndex: '1'
    };
    
    console.log('📥 목록 페이지 POST 요청 중...');
    await page.goto(listEndpoint, { waitUntil: 'domcontentloaded' });
    
    const formDataString = new URLSearchParams(formData).toString();
    const listResponse = await page.evaluate(async ({ endpoint, data }) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data
      });
      return await response.text();
    }, { endpoint: listEndpoint, data: formDataString });
    
    await page.setContent(listResponse);
    await page.waitForTimeout(2000);
    
    // HTML 저장
    fs.writeFileSync('gyeonggi_list_debug.html', listResponse, 'utf-8');
    console.log('✅ HTML 저장 완료: gyeonggi_list_debug.html\n');
    
    // 첫 번째 게시글 카드의 HTML 구조 출력
    const firstCardHtml = await page.evaluate(() => {
      const cards = document.querySelectorAll('li');
      for (const card of cards) {
        const cardHtml = card.innerHTML || '';
        if (cardHtml.includes('goView')) {
          return {
            outerHTML: card.outerHTML.substring(0, 2000),
            className: card.className,
            tagName: card.tagName
          };
        }
      }
      return null;
    });
    
    if (firstCardHtml) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('첫 번째 게시글 카드 정보:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`태그: ${firstCardHtml.tagName}`);
      console.log(`클래스: ${firstCardHtml.className}`);
      console.log('\nHTML (처음 2000자):\n');
      console.log(firstCardHtml.outerHTML);
    }
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await browser.close();
  }
}

debugHtml();

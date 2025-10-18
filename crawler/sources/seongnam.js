import { loadPage, getTextBySelectors, getAttributeBySelectors, resolveUrl } from '../lib/playwright.js';

/**
 * 성남교육지원청 크롤러
 */
export async function crawlSeongnam(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);
  
  // 1. 목록 페이지 로딩
  await loadPage(page, config.baseUrl, config.selectors.listContainer);
  
  // 2. 페이지 구조 분석 (디버깅용)
  const pageTitle = await page.title();
  console.log(`📄 페이지 제목: ${pageTitle}`);
  
  // 3. 공고 목록 추출
  const jobs = [];
  
  try {
    // 여러 선택자 시도
    const rows = await page.$$(config.selectors.rows);
    
    if (rows.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다. HTML 구조 확인 필요');
      
      // 디버깅: 페이지 HTML 일부 출력
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('페이지 내용 샘플:', bodyText);
      
      return [];
    }
    
    console.log(`📋 발견된 공고 수: ${rows.length}개`);
    
    // 4. 각 행에서 데이터 추출 (최신 3개만)
    const maxRows = Math.min(rows.length, 3);
    for (let i = 0; i < maxRows; i++) {
      try {
        // 매번 새로 rows를 가져와서 stale element 방지
        const currentRows = await page.$$(config.selectors.rows);
        if (i >= currentRows.length) {
          console.warn(`  ⚠️  행 ${i + 1} 찾을 수 없음`);
          continue;
        }
        
        const row = currentRows[i];
        
        console.log(`\n  🔍 행 ${i + 1} 디버깅:`);
        
        const title = await getTextBySelectors(row, config.selectors.title);
        console.log(`     title: "${title}" (길이: ${title ? title.length : 0})`);
        
        const date = await getTextBySelectors(row, config.selectors.date);
        console.log(`     date: "${date}"`);
        
        // data-id 속성 추출 (javascript: 링크 대신)
        const dataId = await getAttributeBySelectors(row, config.selectors.link, 'data-id');
        console.log(`     dataId: "${dataId}"`);
        
        // 행의 HTML 구조 출력 (디버깅)
        if (!title || !dataId) {
          const rowHtml = await row.innerHTML();
          console.log(`     ❌ 실패 원인 - HTML 구조:`);
          console.log(`     ${rowHtml.substring(0, 300)}`);
        }
        
        // 필수 필드 검증
        if (!title || !dataId) {
          console.warn(`  ⚠️  행 ${i + 1} 필수 필드 누락 (title: ${!!title}, dataId: ${!!dataId})`);
          continue;
        }
        
        // data-id로 상세 페이지 URL 생성
        const absoluteLink = config.detailUrlTemplate + dataId;
        
        console.log(`  📄 ${i + 1}. ${title}`);
        console.log(`     상세 페이지 접속 중...`);
        
        // 상세 페이지 크롤링
        const detailData = await crawlDetailPage(page, absoluteLink, config);
        
        jobs.push({
          title: title,
          date: date || '날짜 없음',
          link: absoluteLink,
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
        });
        
        console.log(`  ✅ ${i + 1}. 완료`);
        
        // 목록 페이지로 돌아가기
        if (i < maxRows - 1) { // 마지막 행이 아니면
          console.log(`     목록으로 돌아가는 중...`);
          await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.warn(`  ⚠️  행 ${i + 1} 파싱 실패: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`❌ 크롤링 실패: ${error.message}`);
    throw error;
  }
  
  console.log(`✅ ${config.name} 크롤링 완료: ${jobs.length}개 수집\n`);
  return jobs;
}

/**
 * 상세 페이지 크롤링 (본문 + 첨부파일)
 */
async function crawlDetailPage(page, detailUrl, config) {
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
    // 본문 내용 추출
    const content = await page.evaluate(() => {
      // 일반적인 게시판 본문 선택자들
      const selectors = [
        '.board-view-content',
        '.view-content',
        '.content',
        '#content',
        '.nttCn',
        '.board_view',
      ];
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.innerText.trim();
        }
      }
      
      // 선택자로 못 찾으면 body 전체
      return document.body.innerText.substring(0, 5000);
    });
    
    // HWP 첨부파일 링크 추출
    const attachmentUrl = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const hwpLink = links.find(link => 
        link.href.includes('.hwp') || 
        link.href.includes('download') ||
        link.textContent.includes('.hwp')
      );
      return hwpLink ? hwpLink.href : null;
    });
    
    console.log(`     본문 길이: ${content.length}자`);
    console.log(`     첨부파일: ${attachmentUrl ? '있음' : '없음'}`);
    
    return {
      content: content,
      attachmentUrl: attachmentUrl,
    };
  } catch (error) {
    console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
    return {
      content: '',
      attachmentUrl: null,
    };
  }
}

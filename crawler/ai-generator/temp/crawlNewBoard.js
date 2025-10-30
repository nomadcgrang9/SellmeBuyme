```javascript
import { resolveUrl } from '../../lib/playwright.js';

/**
 * 구리남양주교육지원청 인력풀 크롤러
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - 크롤러 설정 객체
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlCrawlNewBoard(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);
  
  const jobs = [];
  
  try {
    // 1. 목록 페이지로 이동
    console.log(`🌐 목록 페이지로 이동 중: ${config.url}`);
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });
    
    // 목록 컨테이너가 로드될 때까지 대기
    await page.waitForSelector('div.board-list table', { timeout: 10000 });
    
    // 2. 게시판 목록에서 구조화된 정보 추출
    // 이 게시판은 전통적인 테이블 형태이므로, 템플릿의 li/regex 기반이 아닌 DOM 쿼리 방식으로 변경합니다.
    const jobListData = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // 분석 결과에 따른 행 선택자(tbody tr)를 사용하여 모든 게시글 행을 선택합니다.
      const rows = document.querySelectorAll('div.board-list table tbody tr');
      
      rows.forEach(row => {
        try {
          // 공지사항 행(보통 'notice' 클래스 포함)은 건너뜁니다.
          if (row.querySelector('td.notice')) {
            return;
          }
          
          // 제목과 날짜 요소를 선택합니다.
          const titleElement = row.querySelector('td.subject a');
          const dateElement = row.querySelector('td.date');
          
          if (!titleElement || !dateElement) {
            return; // 필수 요소가 없으면 해당 행은 건너뜁니다.
          }
          
          const title = titleElement.textContent.trim();
          const onclickAttr = titleElement.getAttribute('onclick') || '';
          
          // 링크 추출: onclick="fnNttView('13515', '8356', 'NTT_...')" 형태에서 게시물 ID(nttSn)를 추출합니다.
          const idMatch = onclickAttr.match(/fnNttView\s*\([^,]+,[^,]+,\s*'([^']+)'\)/);
          
          if (!idMatch || !idMatch[1]) {
            return; // 게시물 ID를 추출할 수 없으면 건너뜁니다.
          }
          
          const nttSn = idMatch[1];
          if (seen.has(nttSn)) {
            return; // 중복된 ID는 건너뜁니다.
          }
          seen.add(nttSn);
          
          const registeredDate = dateElement.textContent.trim();
          
          results.push({
            nttSn,
            title,
            registeredDate,
          });
        } catch (e) {
          console.error('목록 항목 처리 중 오류 발생:', e.message, row.innerHTML);
        }
      });
      
      return results;
    });
    
    console.log(`📋 발견된 공고 수: ${jobListData.length}개`);
    
    if (jobListData.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');
      return [];
    }
    
    // 3. 각 공고 상세 페이지 크롤링 (config.crawlBatchSize 또는 기본값 10개)
    const batchSize = config.crawlBatchSize || 10;
    const maxJobs = Math.min(jobListData.length, batchSize);
    
    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      const nttSn = listInfo.nttSn;
      
      // 데이터 검증: 제목이 없는 경우 건너뛰기
      if (!listInfo.title) {
        console.warn(`  ⚠️ ID ${nttSn} 공고의 제목이 없어 건너뜁니다.`);
        continue;
      }
      
      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${nttSn})`);
      console.log(`     게시판 정보: ${listInfo.title}`);
      
      try {
        const detailData = await crawlDetailPage(page, config, nttSn);
        
        // 데이터 검증: 본문 내용이 너무 짧은 경우 경고
        if (!detailData.content || detailData.content.length < 100) {
          console.warn(`  ⚠️ ID ${nttSn} 공고의 본문 내용이 너무 짧아(${detailData.content?.length || 0}자) 확인이 필요합니다.`);
        }
        
        // 데이터 검증: 상세 페이지 링크 생성
        const detailUrl = new URL(config.detailEndpoint);
        detailUrl.searchParams.set('mi', config.formData.mi);
        detailUrl.searchParams.set('bbsId', config.formData.bbsId);
        detailUrl.searchParams.set('nttSn', nttSn);
        const link = detailUrl
/**
 * 경기도 게시판 목록 정보 추출 테스트
 * 게시판에서 구조화된 정보를 제대로 추출하는지 확인
 */

import { chromium } from 'playwright';

async function testListExtraction() {
  console.log('🧪 경기도 게시판 목록 정보 추출 테스트 시작\n');
  
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
    
    // 1. 목록 페이지 로드
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
    
    // 2. 게시판 목록 정보 추출
    console.log('🔍 게시판 목록 정보 추출 중...\n');
    
    const jobListData = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // 각 게시글 카드 찾기 (li 태그)
      const cards = document.querySelectorAll('li');
      
      cards.forEach(card => {
        const cardHtml = card.innerHTML || '';
        const idMatch = cardHtml.match(/goView\s*\(\s*['"](\d+)['"]\s*\)/);
        
        if (!idMatch || !idMatch[1]) return;
        
        const pbancSn = idMatch[1];
        if (seen.has(pbancSn)) return;
        seen.add(pbancSn);
        
        const getText = (selector) => {
          const el = card.querySelector(selector);
          return el ? el.textContent.trim() : '';
        };
        
        // 학교명 추출 (.cont_top > span:first-child)
        const schoolName = getText('.cont_top > span:first-child');
        
        // 제목 추출 (.cont_tit의 텍스트 노드, 배지 제외)
        let title = '';
        const titleEl = card.querySelector('.cont_tit');
        if (titleEl) {
          const clone = titleEl.cloneNode(true);
          const badges = clone.querySelectorAll('.krds-badge');
          badges.forEach(badge => badge.remove());
          title = clone.textContent.trim();
        }
        
        // 연락처
        const phoneMatch = cardHtml.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
        const phone = phoneMatch ? phoneMatch[1] : '';
        
        // 등록일
        const regDateMatch = cardHtml.match(/등록일\s*:\s*(\d{4}\/\d{2}\/\d{2})/);
        const registeredDate = regDateMatch ? regDateMatch[1] : '';
        
        // 조회수
        const viewMatch = cardHtml.match(/조회수\s*:\s*(\d+)/);
        const viewCount = viewMatch ? viewMatch[1] : '';
        
        // 마감 상태
        const deadlineStatus = cardHtml.includes('마감임박') ? '마감임박' : 
                               cardHtml.includes('오늘마감') ? '오늘마감' : '';
        
        // 지역
        const locationMatch = cardHtml.match(/(고양시|수원시|성남시|용인시|부천시|안산시|안양시|남양주시|화성시|평택시|의정부시|시흥시|파주시|김포시|광명시|광주시|군포시|오산시|이천시|양주시|안성시|구리시|포천시|의왕시|하남시|여주시|양평군|동두천시|과천시|가평군|연천군)/);
        const location = locationMatch ? locationMatch[1] : '';
        
        // 채용인원
        const recruitMatch = cardHtml.match(/채용인원<\/em>\s*(\d+)/);
        const recruitCount = recruitMatch ? recruitMatch[1] : '';
        
        // 접수기간
        const applicationPeriodMatch = cardHtml.match(/접수기간<\/em>\s*(\d{4}\/\d{2}\/\d{2})\s*~\s*(\d{4}\/\d{2}\/\d{2})/);
        const applicationStart = applicationPeriodMatch ? applicationPeriodMatch[1] : '';
        const applicationEnd = applicationPeriodMatch ? applicationPeriodMatch[2] : '';
        
        // 채용기간
        const employmentPeriodMatch = cardHtml.match(/채용기간<\/em>\s*(\d{4}\/\d{2}\/\d{2})\s*~\s*(\d{4}\/\d{2}\/\d{2})/);
        const employmentStart = employmentPeriodMatch ? employmentPeriodMatch[1] : '';
        const employmentEnd = employmentPeriodMatch ? employmentPeriodMatch[2] : '';
        
        // 직무분야
        const jobFieldMatch = cardHtml.match(/직무분야<\/em>\s*([^<]+)/);
        let jobField = jobFieldMatch ? jobFieldMatch[1].trim() : '';
        jobField = jobField.replace(/\s+/g, ' ').trim();
        
        results.push({
          pbancSn,
          schoolName,
          title,
          phone,
          location,
          recruitCount,
          applicationStart,
          applicationEnd,
          employmentStart,
          employmentEnd,
          jobField,
          registeredDate,
          viewCount,
          deadlineStatus
        });
      });
      
      return results;
    });
    
    // 3. 결과 출력
    console.log(`✅ 총 ${jobListData.length}개의 공고 발견\n`);
    
    jobListData.slice(0, 5).forEach((job, idx) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📌 공고 ${idx + 1} (ID: ${job.pbancSn})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🏫 학교명: ${job.schoolName || '(없음)'}`);
      console.log(`📝 제목: ${job.title || '(없음)'}`);
      console.log(`📞 연락처: ${job.phone || '(없음)'}`);
      console.log(`📍 지역: ${job.location || '(없음)'}`);
      console.log(`👥 채용인원: ${job.recruitCount || '(없음)'}명`);
      console.log(`💼 직무분야: ${job.jobField || '(없음)'}`);
      console.log(`📅 접수기간: ${job.applicationStart} ~ ${job.applicationEnd}`);
      console.log(`📅 채용기간: ${job.employmentStart} ~ ${job.employmentEnd}`);
      console.log(`📆 등록일: ${job.registeredDate || '(없음)'}`);
      console.log(`👁️  조회수: ${job.viewCount || '(없음)'}`);
      console.log(`⏰ 마감상태: ${job.deadlineStatus || '(없음)'}`);
      console.log('');
    });
    
    if (jobListData.length > 5) {
      console.log(`... 외 ${jobListData.length - 5}개 공고\n`);
    }
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await browser.close();
  }
}

testListExtraction();

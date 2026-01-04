import { resolveUrl } from '../lib/playwright.js';
import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 교육지원청 도메인 → 관할 지역 매핑
 */
const EDUCATION_OFFICE_REGIONS = {
  'goegp.kr': '가평군',           // 가평교육지원청
  'www.goegp.kr': '가평군',       // 가평교육지원청 (www)
  'goegn.kr': '구리남양주',       // 구리남양주교육지원청
  'www.goegn.kr': '구리남양주',   // 구리남양주교육지원청 (www)
  'goeujb.kr': '의정부',          // 의정부교육지원청
  'www.goeujb.kr': '의정부',      // 의정부교육지원청 (www)
  '222.120.4.134': '의정부',      // 의정부교육지원청 (IP)
  'goesn.kr': '성남',             // 성남교육지원청
  'www.goesn.kr': '성남',         // 성남교육지원청 (www)
  'goeyp.kr': '양평군',           // 양평교육지원청
  'www.goeyp.kr': '양평군',       // 양평교육지원청 (www)
  'goepy.kr': '평택',             // 평택교육지원청
  'www.goepy.kr': '평택',         // 평택교육지원청 (www)
  'goeguri.kr': '구리',           // 구리교육지원청 (별도)
  'www.goeguri.kr': '구리',       // 구리교육지원청 (www)
  'goegj.kr': '광주',             // 광주하남교육지원청
  'www.goegj.kr': '광주',         // 광주하남교육지원청 (www)
  'goeysn.kr': '용인',            // 용인교육지원청
  'www.goeysn.kr': '용인',        // 용인교육지원청 (www)
  'goesw.kr': '수원',             // 수원교육지원청
  'www.goesw.kr': '수원',         // 수원교육지원청 (www)
  // 추가 교육지원청은 필요시 여기에 추가
};

/**
 * URL에서 교육지원청 관할 지역 추출
 */
function getRegionFromUrl(url) {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = parsedUrl.hostname;

    // 도메인 매칭
    for (const [domain, region] of Object.entries(EDUCATION_OFFICE_REGIONS)) {
      if (hostname.includes(domain)) {
        return region;
      }
    }

    // IP 주소 매칭
    const ip = parsedUrl.hostname;
    if (EDUCATION_OFFICE_REGIONS[ip]) {
      return EDUCATION_OFFICE_REGIONS[ip];
    }
  } catch (error) {
    console.warn(`URL 파싱 실패: ${url}`, error.message);
  }

  return null;
}

/**
 * 학교명에서 지역 추론 (보조 수단)
 */
function inferRegionFromSchoolName(schoolName) {
  if (!schoolName) return null;

  // 특정 학교명 직접 매핑 (지역명이 없는 학교)
  const exactSchoolMapping = {
    '청심국제중고등학교': '가평군',
    '청심국제중학교': '가평군',
    '청심국제고등학교': '가평군',
    '청심국제': '가평군',
  };

  // 정확한 학교명 매칭 우선
  for (const [schoolKey, region] of Object.entries(exactSchoolMapping)) {
    if (schoolName.includes(schoolKey)) {
      return region;
    }
  }

  // 학교명에 포함된 지역명 패턴
  const regionPatterns = [
    { pattern: /가평/, region: '가평군' },
    { pattern: /구리/, region: '구리남양주' },
    { pattern: /남양주/, region: '구리남양주' },
    { pattern: /의정부/, region: '의정부' },
    { pattern: /양평/, region: '양평군' },
    { pattern: /평택/, region: '평택' },
    { pattern: /성남/, region: '성남' },
    { pattern: /용인/, region: '용인' },
    { pattern: /수원/, region: '수원' },
  ];

  for (const { pattern, region } of regionPatterns) {
    if (pattern.test(schoolName)) {
      return region;
    }
  }

  return null;
}

/**
 * 경기도교육청 크롤러 (POST 기반)
 */
export async function crawlGyeonggi(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  const jobs = [];
  let skippedCount = 0;

  try {
    // 1. 목록 페이지 POST 요청으로 로드
    console.log(`🌐 목록 페이지 POST 요청 중...`);
    
    await page.goto(config.listEndpoint, { waitUntil: 'domcontentloaded' });
    
    // POST 요청을 통해 목록 HTML 가져오기
    const formData = new URLSearchParams(config.formData).toString();
    
    const listResponse = await page.evaluate(async ({ endpoint, data }) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data
      });
      return await response.text();
    }, { endpoint: config.listEndpoint, data: formData });
    
    // 임시 페이지에 HTML 로드
    await page.setContent(listResponse);
    await page.waitForTimeout(1000);
    
    // 2. 게시판 목록에서 구조화된 정보 추출
    const jobListData = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      
      // 각 게시글 카드 찾기 (li 태그)
      const cards = document.querySelectorAll('li');
      
      cards.forEach(card => {
        // goView 패턴으로 ID 추출
        const cardHtml = card.innerHTML || '';
        const idMatch = cardHtml.match(/goView\s*\(\s*['"](\d+)['"]\s*\)/);
        
        if (!idMatch || !idMatch[1]) return;
        
        const pbancSn = idMatch[1];
        if (seen.has(pbancSn)) return;
        seen.add(pbancSn);
        
        // 카드 내 정보 추출 헬퍼 함수
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
          // 배지 요소 제거 후 텍스트 추출
          const clone = titleEl.cloneNode(true);
          const badges = clone.querySelectorAll('.krds-badge');
          badges.forEach(badge => badge.remove());
          title = clone.textContent.trim();
        }
        
        // 연락처 추출 (전화번호 패턴)
        const phoneMatch = cardHtml.match(/(\d{2,3}[-\s]?\d{3,4}[-\s]?\d{4})/);
        const phone = phoneMatch ? phoneMatch[1] : '';
        
        // 등록일 추출
        const regDateMatch = cardHtml.match(/등록일\s*:\s*(\d{4}\/\d{2}\/\d{2})/);
        const registeredDate = regDateMatch ? regDateMatch[1] : '';
        
        // 조회수 추출
        const viewMatch = cardHtml.match(/조회수\s*:\s*(\d+)/);
        const viewCount = viewMatch ? viewMatch[1] : '';
        
        // 마감 상태 추출
        const deadlineStatus = cardHtml.includes('마감임박') ? '마감임박' : 
                               cardHtml.includes('오늘마감') ? '오늘마감' : '';
        
        // 지역 추출 (모집정보 섹션에서)
        const locationMatch = cardHtml.match(/(고양시|수원시|성남시|용인시|부천시|안산시|안양시|남양주시|화성시|평택시|의정부시|시흥시|파주시|김포시|광명시|광주시|군포시|오산시|이천시|양주시|안성시|구리시|포천시|의왕시|하남시|여주시|양평군|동두천시|과천시|가평군|연천군)/);
        const location = locationMatch ? locationMatch[1] : '';
        
        // 채용인원 추출
        const recruitMatch = cardHtml.match(/채용인원<\/em>\s*(\d+)/);
        const recruitCount = recruitMatch ? recruitMatch[1] : '';
        
        // 접수기간 추출
        const applicationPeriodMatch = cardHtml.match(/접수기간<\/em>\s*(\d{4}\/\d{2}\/\d{2})\s*~\s*(\d{4}\/\d{2}\/\d{2})/);
        const applicationStart = applicationPeriodMatch ? applicationPeriodMatch[1] : '';
        const applicationEnd = applicationPeriodMatch ? applicationPeriodMatch[2] : '';
        
        // 채용기간 추출
        const employmentPeriodMatch = cardHtml.match(/채용기간<\/em>\s*(\d{4}\/\d{2}\/\d{2})\s*~\s*(\d{4}\/\d{2}\/\d{2})/);
        const employmentStart = employmentPeriodMatch ? employmentPeriodMatch[1] : '';
        const employmentEnd = employmentPeriodMatch ? employmentPeriodMatch[2] : '';
        
        // 직무분야 추출
        const jobFieldMatch = cardHtml.match(/직무분야<\/em>\s*([^<]+)/);
        let jobField = jobFieldMatch ? jobFieldMatch[1].trim() : '';
        // 공백 정리
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
    
    console.log(`📋 발견된 공고 수: ${jobListData.length}개`);
    
    if (jobListData.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');
      return [];
    }
    
    // 3. 각 공고 상세 페이지 크롤링 (중복 발견 시 중단)
    const SAFETY = {
      maxItems: 100,           // 무한 루프 방지
      duplicateThreshold: 3,   // 연속 중복 시 중단
    };

    let consecutiveDuplicates = 0;
    let processedCount = 0;

    for (const listInfo of jobListData) {
      // 안전장치 1: 최대 개수
      if (processedCount >= SAFETY.maxItems) {
        console.log(`  ⚠️ 최대 수집 개수(${SAFETY.maxItems}) 도달`);
        break;
      }

      const pbancSn = listInfo.pbancSn;
      const jobUrl = `${config.detailEndpoint}?pbancSn=${pbancSn}`;

      // 중복 체크 (크롤러 단계에서 수행)
      const existing = await getExistingJobBySource(jobUrl);

      if (existing) {
        consecutiveDuplicates++;
        skippedCount++;
        console.log(`  ⏭️ 중복 ${consecutiveDuplicates}/${SAFETY.duplicateThreshold}: ${listInfo.title?.substring(0, 30)}...`);

        // 안전장치 2: 연속 중복 시 중단
        if (consecutiveDuplicates >= SAFETY.duplicateThreshold) {
          console.log(`  🛑 연속 ${SAFETY.duplicateThreshold}개 중복 - 기존 영역 도달, 크롤링 완료`);
          break;
        }
        continue;
      }

      // 신규 공고 발견 - 중복 카운터 리셋
      consecutiveDuplicates = 0;
      processedCount++;

      console.log(`\n  🔍 신규 공고 ${processedCount} (ID: ${pbancSn})`);
      console.log(`     게시판 정보: ${listInfo.schoolName} - ${listInfo.title}`);
      
      try {
        const detailData = await crawlDetailPage(page, config, pbancSn);

        // 지역 정보 결정 (우선순위: 게시판 정규식 추출 > URL 기반 매핑 > 학교명 추론)
        let finalLocation = listInfo.location;

        // 지역이 비어있거나 잘못된 경우 URL 기반 매핑 시도
        if (!finalLocation || finalLocation.trim() === '') {
          finalLocation = getRegionFromUrl(config.listEndpoint) ||
                          getRegionFromUrl(config.detailEndpoint);
        }

        // 여전히 비어있으면 학교명으로 추론
        if (!finalLocation || finalLocation.trim() === '') {
          finalLocation = inferRegionFromSchoolName(listInfo.schoolName);
        }

        // 게시판 정보와 상세 정보 병합
        const mergedJob = {
          // 기본 정보 (게시판 우선)
          title: listInfo.title || detailData.title,
          schoolName: listInfo.schoolName,
          phone: listInfo.phone,
          location: finalLocation || listInfo.location,
          
          // 날짜 정보 (게시판 우선)
          applicationStart: listInfo.applicationStart,
          applicationEnd: listInfo.applicationEnd,
          employmentStart: listInfo.employmentStart,
          employmentEnd: listInfo.employmentEnd,
          registeredDate: listInfo.registeredDate,
          
          // 채용 정보 (게시판 우선)
          recruitCount: listInfo.recruitCount,
          jobField: listInfo.jobField,
          deadlineStatus: listInfo.deadlineStatus,
          viewCount: listInfo.viewCount,
          
          // 상세 정보 (상세 페이지에서만 가져올 수 있는 정보)
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachments: detailData.attachments,
          attachmentFilename:
            detailData.attachments && detailData.attachments.length > 0
              ? detailData.attachments[0].name
              : null,
          screenshotBase64: detailData.screenshot,
          
          // 링크
          link: `${config.detailEndpoint}?pbancSn=${pbancSn}`,
          
          // 호환성을 위한 date 필드
          date: listInfo.registeredDate || detailData.date || '날짜 없음',
        };
        
        jobs.push(mergedJob);
        console.log(`  ✅ 완료: ${mergedJob.title}`);
        
      } catch (error) {
        console.warn(`  ⚠️  공고 ${pbancSn} 처리 실패: ${error.message}`);
      }
      
      // API 제한 방지
      await page.waitForTimeout(1000);
    }
    
  } catch (error) {
    console.error(`❌ 크롤링 실패: ${error.message}`);
    throw error;
  }
  
  console.log(`\n✅ ${config.name} 크롤링 완료`);
  console.log(`   - 신규: ${jobs.length}개`);
  console.log(`   - 중복 스킵: ${skippedCount}개`);
  console.log(`   - 총 처리: ${jobs.length + skippedCount}개\n`);
  return jobs;
}

/**
 * 상세 페이지 크롤링
 */
async function crawlDetailPage(page, config, pbancSn) {
  try {
    console.log(`     상세 페이지 POST 요청 중...`);
    
    // 상세 페이지 폼 데이터 준비
    const detailFormData = {
      ...config.formData,
      pbancSn: pbancSn
    };
    
    const formDataString = new URLSearchParams(detailFormData).toString();
    
    // POST 요청으로 상세 HTML 가져오기
    const detailHtml = await page.evaluate(async ({ endpoint, data }) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data
      });
      return await response.text();
    }, { endpoint: config.detailEndpoint, data: formDataString });
    
    // 상세 페이지 HTML 로드
    await page.setContent(detailHtml);
    await page.waitForTimeout(2000);
    
    // 제목 추출
    const title = await page.evaluate(() => {
      const selectors = [
        'h1', 'h2', 'h3',
        '.title', '.subject',
        '[class*="title"]', '[class*="subject"]'
      ];
      
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (el && el.textContent.trim().length > 5) {
          return el.textContent.trim();
        }
      }
      
      return document.title || '제목 없음';
    });
    
    // 본문 내용 추출
    const content = await page.evaluate(() => {
      // 불필요한 요소 제거
      const removeSelectors = [
        'header', 'footer', 'nav', '.header', '.footer', '.navigation',
        '.gnb', '.lnb', '.sidebar', '.breadcrumb', '.btn-area'
      ];
      
      removeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });
      
      // 본문 선택자 시도
      const contentSelectors = [
        '.content', '#content', '.view-content',
        '.detail', '.board-view', 'main', 'article'
      ];
      
      for (const selector of contentSelectors) {
        const el = document.querySelector(selector);
        if (el) {
          let text = el.innerText.trim();
          text = text.replace(/\n{3,}/g, '\n\n').trim();
          if (text.length > 100) {
            return text;
          }
        }
      }
      
      // 전체 body 사용
      return document.body.innerText.substring(0, 5000).trim();
    });
    
    // 첨부파일 추출
    const attachments = await page.evaluate(() => {
      const results = [];
      const seen = new Set();
      const buildUrl = (key) => `https://www.goe.go.kr/recruit/comm/fileDownload.do?fileKey=${key}`;

      const sanitize = (text, fallback) => {
        if (!text) return fallback;
        const cleaned = text
          .replace(/\s+/g, ' ')
          .replace(/다운로드|미리보기|첨부파일|참고파일|파일명|:|：/gi, '')
          .trim();
        return cleaned || fallback;
      };

      const extractFilename = (element) => {
        // 1. data-file-name 속성
        const dataName = element.getAttribute('data-file-name');
        if (dataName && dataName.trim()) return dataName.trim();

        // 2. 부모 요소의 테이블 행에서 파일명 찾기
        const row = element.closest('tr');
        if (row) {
          const cells = row.querySelectorAll('td');
          for (const cell of cells) {
            const text = cell.textContent.trim();
            // .hwp, .pdf 등 확장자가 포함된 텍스트 찾기
            if (/\.(hwp|hwpx|pdf|doc|docx|xls|xlsx)$/i.test(text)) {
              return text;
            }
          }
        }

        // 3. 인접 요소에서 파일명 찾기
        const siblings = [
          element.nextElementSibling,
          element.previousElementSibling,
          element.parentElement?.querySelector('.file-name'),
          element.parentElement?.querySelector('[class*="name"]')
        ];
        
        for (const sibling of siblings) {
          if (!sibling) continue;
          const text = sibling.textContent.trim();
          if (text && /\.(hwp|hwpx|pdf|doc|docx|xls|xlsx)$/i.test(text)) {
            return text;
          }
        }

        // 4. 부모 요소 텍스트에서 파일명 추출
        const parentText = element.parentElement?.textContent || '';
        const filenameMatch = parentText.match(/([^\s]+\.(hwp|hwpx|pdf|doc|docx|xls|xlsx))/i);
        if (filenameMatch) {
          return filenameMatch[1];
        }

        return null;
      };

      const addAttachment = (fileKey, element) => {
        if (!fileKey || seen.has(fileKey)) return;
        seen.add(fileKey);
        
        const filename = extractFilename(element);
        const sanitizedName = sanitize(filename, null);
        
        results.push({
          fileKey,
          url: buildUrl(fileKey),
          name: sanitizedName || `공고문_${fileKey}.hwp`
        });
      };

      const buttonSelector = '[onclick*="fileDwld"], [data-file-dl]';
      document.querySelectorAll(buttonSelector).forEach((el) => {
        const onclick = el.getAttribute('onclick') || el.getAttribute('data-file-dl') || '';
        const match = onclick.match(/fileDwld\s*\(\s*['\"]?(\d+)['\"]?\s*\)/);
        if (match && match[1]) {
          addAttachment(match[1], el);
        }
      });

      document.querySelectorAll('a[href*="fileDownload.do"]').forEach((link) => {
        try {
          const url = new URL(link.href, window.location.origin);
          const fileKey = url.searchParams.get('fileKey');
          if (fileKey) {
            addAttachment(fileKey, link);
          }
        } catch (error) {
          // ignore invalid URLs
        }
      });

      return results;
    });

    console.log('     📎 첨부파일 추출 결과:', attachments);

    // 스크린샷 캡처
    console.log(`     📸 스크린샷 캡처 중...`);
    const screenshot = await page.screenshot({ 
      fullPage: true,
      type: 'png'
    });
    const screenshotBase64 = screenshot.toString('base64');
    
    console.log(`     본문 길이: ${content.length}자`);
    console.log(`     첨부파일: ${attachments.length > 0 ? `${attachments.length}건` : '없음'}`);
    console.log(`     스크린샷: ${(screenshotBase64.length / 1024).toFixed(0)}KB`);
    
    return {
      title,
      content,
      attachmentUrl: attachments.length > 0 ? attachments[0].url : null,
      attachments,
      screenshot: screenshotBase64,
      date: new Date().toISOString().split('T')[0]
    };
    
  } catch (error) {
    console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
    return {
      title: '',
      content: '',
      attachmentUrl: null,
      attachments: [],
      screenshot: null,
      date: null
    };
  }
}

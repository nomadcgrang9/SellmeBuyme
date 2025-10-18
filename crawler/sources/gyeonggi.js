import { resolveUrl } from '../lib/playwright.js';

/**
 * 경기도교육청 크롤러 (POST 기반)
 */
export async function crawlGyeonggi(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);
  
  const jobs = [];
  
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
    
    // 2. goView('pbancSn') 패턴으로 공고 ID 추출
    const jobIds = await page.evaluate(() => {
      const results = [];
      
      // 디버깅: HTML 일부 출력
      console.log('HTML 샘플:', document.body.innerHTML.substring(0, 500));
      
      const scripts = document.querySelectorAll('script, a, button, [onclick]');
      
      scripts.forEach(el => {
        const onclick = el.getAttribute('onclick') || el.textContent || '';
        const match = onclick.match(/goView\s*\(\s*['"](\d+)['"]\s*\)/);
        if (match && match[1]) {
          results.push(match[1]);
        }
      });
      
      // 전체 HTML에서도 검색
      const bodyText = document.body.innerHTML;
      const globalMatches = bodyText.matchAll(/goView\s*\(\s*['"](\d+)['"]\s*\)/g);
      for (const match of globalMatches) {
        if (match[1]) {
          results.push(match[1]);
        }
      }
      
      return [...new Set(results)]; // 중복 제거
    });
    
    console.log(`📋 발견된 공고 수: ${jobIds.length}개`);
    
    if (jobIds.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');
      return [];
    }
    
    // 3. 각 공고 상세 페이지 크롤링 (최대 3개)
    const maxJobs = Math.min(jobIds.length, 3);
    
    for (let i = 0; i < maxJobs; i++) {
      const pbancSn = jobIds[i];
      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${pbancSn})`);
      
      try {
        const detailData = await crawlDetailPage(page, config, pbancSn);
        
        if (detailData.title) {
          jobs.push({
            title: detailData.title,
            date: detailData.date || '날짜 없음',
            link: `${config.detailEndpoint}?pbancSn=${pbancSn}`,
            detailContent: detailData.content,
            attachmentUrl: detailData.attachmentUrl,
            attachments: detailData.attachments,
            screenshotBase64: detailData.screenshot,
          });
          
          console.log(`  ✅ 완료: ${detailData.title}`);
        }
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
  
  console.log(`✅ ${config.name} 크롤링 완료: ${jobs.length}개 수집\n`);
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
          .replace(/다운로드|미리보기|첨부파일|참고파일/gi, '')
          .trim();
        return cleaned || fallback;
      };

      const addAttachment = (fileKey, name) => {
        if (!fileKey || seen.has(fileKey)) return;
        seen.add(fileKey);
        results.push({
          fileKey,
          url: buildUrl(fileKey),
          name: sanitize(name, `첨부파일_${fileKey}`)
        });
      };

      const buttonSelector = '[onclick*="fileDwld"], [data-file-dl]';
      document.querySelectorAll(buttonSelector).forEach((el) => {
        const onclick = el.getAttribute('onclick') || el.getAttribute('data-file-dl') || '';
        const match = onclick.match(/fileDwld\s*\(\s*['\"]?(\d+)['\"]?\s*\)/);
        if (match && match[1]) {
          const fileKey = match[1];
          const dataName = el.getAttribute('data-file-name');
          const siblingName = el.nextElementSibling?.textContent || el.previousElementSibling?.textContent;
          const parentText = el.parentElement?.textContent;
          addAttachment(fileKey, dataName || siblingName || parentText || el.textContent);
        }
      });

      document.querySelectorAll('a[href*="fileDownload.do"]').forEach((link) => {
        try {
          const url = new URL(link.href, window.location.origin);
          const fileKey = url.searchParams.get('fileKey');
          if (fileKey) {
            addAttachment(fileKey, link.textContent);
          }
        } catch (error) {
          // ignore invalid URLs
        }
      });

      return results;
    });

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

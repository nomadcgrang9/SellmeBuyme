import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 대전광역시교육청 학교인사 크롤러
 * 패턴: goView() 함수 기반
 * URL: https://www.dje.go.kr/boardCnts/list.do?boardID=54&m=030202&s=dje
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - 크롤러 설정 객체
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlDaejeon(page, config) {
  console.log(`\n📍 ${config.name || '대전광역시교육청'} 크롤링 시작`);

  const jobs = [];
  const listUrl = config.baseUrl;

  try {
    // 1. 목록 페이지 로드
    console.log(`🌐 목록 페이지 접속: ${listUrl}`);
    const loadResult = await loadPageWithRetry(page, listUrl, { maxRetries: 3 });

    if (!loadResult.success) {
      console.error(`❌ 페이지 로드 실패: ${loadResult.error}`);
      return [];
    }

    await page.waitForTimeout(2000);

    // 2. 게시글 목록 추출
    console.log('📋 게시글 목록 추출 중...');
    const jobListData = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row, idx) => {
        try {
          // 공지사항 제외
          if (row.classList.contains('notice')) return;

          // 제목 링크 찾기
          const titleLink = row.querySelector('a');
          if (!titleLink) return;

          const title = titleLink.textContent.trim();
          if (!title) return;

          // onclick에서 boardSeq 추출: goView('54','3339894', ...)
          const onclick = titleLink.getAttribute('onclick') || '';
          const match = onclick.match(/goView\('54',\s*'(\d+)'/);
          if (!match) return;

          const boardSeq = match[1];

          // 날짜 및 접수기간 추출
          const cells = row.querySelectorAll('td');
          const dateText = cells[3]?.textContent.trim() || '';
          const periodText = cells[5]?.textContent.trim() || '';

          results.push({
            boardSeq,
            title,
            dateText,
            periodText,
            rowIndex: idx
          });
        } catch (e) {
          console.error(`행 ${idx} 처리 오류:`, e.message);
        }
      });

      return results;
    });

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);

    if (jobListData.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');
      return [];
    }

    // 3. 각 공고 상세 페이지 크롤링
    const batchSize = config.crawlBatchSize || 10;
    const maxJobs = Math.min(jobListData.length, batchSize);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      const boardSeq = listInfo.boardSeq;

      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (BoardSeq: ${boardSeq})`);
      console.log(`     제목: ${listInfo.title}`);

      try {
        // 상세 페이지 URL 구성 ({SEQ} 치환)
        const detailUrl = config.detailUrlTemplate.replace('{SEQ}', boardSeq);
        console.log(`     URL: ${detailUrl}`);

        const detailResult = await loadPageWithRetry(page, detailUrl, { maxRetries: 2 });
        if (!detailResult.success) {
          console.warn(`     ⚠️ 상세 페이지 로드 실패: ${detailResult.error}`);
          continue;
        }

        await page.waitForTimeout(1500);

        // 상세 페이지 데이터 추출
        const detailData = await page.evaluate(() => {
          let content = '';

          // 본문 선택자 시도
          const contentSelectors = [
            '.board_view',
            '.view_content',
            '.bbs_content',
            'td.content',
            '.content',
            'article'
          ];

          for (const selector of contentSelectors) {
            const elem = document.querySelector(selector);
            if (elem) {
              content = elem.innerText.trim();
              if (content.length > 50) break;
            }
          }

          // 전체 body 사용 (최후 수단)
          if (content.length < 50) {
            content = document.body.innerText.substring(0, 5000).trim();
          }

          // 첨부파일 추출
          let attachmentUrl = null;
          let attachmentFilename = null;

          const fileLinks = document.querySelectorAll('a[href*="download"], a[href*="file"], .file_download a, .file a');
          for (const link of fileLinks) {
            const href = link.getAttribute('href') || '';
            const text = link.textContent || '';
            if (href && !href.startsWith('javascript:') && href !== '#') {
              attachmentUrl = href.startsWith('http') ? href : 'https://www.dje.go.kr' + href;
              attachmentFilename = text.trim();
              break;
            }
          }

          return { content, attachmentUrl, attachmentFilename };
        });

        // 스크린샷 캡처
        console.log(`     📸 스크린샷 캡처 중...`);
        const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
        const screenshotBase64 = screenshot.toString('base64');

        // 데이터 병합
        const jobData = {
          title: listInfo.title,
          date: listInfo.dateText || new Date().toISOString().split('T')[0],
          link: detailUrl,
          location: config.region || '대전광역시',
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          screenshotBase64: screenshotBase64,
          hasContentImages: false,
        };

        jobs.push(jobData);
        console.log(`     ✅ 크롤링 완료 (본문 ${detailData.content.length}자)`);

        // 다음 공고 전 잠시 대기
        await page.waitForTimeout(1000);

      } catch (error) {
        console.error(`     ❌ 상세 페이지 크롤링 실패: ${error.message}`);
        continue;
      }
    }

    console.log(`\n✅ [대전] ${config.name} 크롤링 완료: ${jobs.length}개 수집`);
    return jobs;

  } catch (error) {
    console.error(`❌ 크롤링 오류: ${error.message}`);
    throw error;
  }
}

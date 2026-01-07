import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 울산광역시교육청 인력풀 크롤러
 * URL: https://use.go.kr/job/user/bbs/BD_selectBbsList.do?q_bbsSn=2249
 */
export async function crawlUlsan(page, config) {
  console.log(`\n📍 [울산] ${config.name} 크롤링 시작`);

  const jobs = [];

  try {
    // 1. 목록 페이지 로드
    console.log(`🌐 목록 페이지 접속: ${config.baseUrl}`);
    const loadResult = await loadPageWithRetry(page, config.baseUrl, { maxRetries: 3 });

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

      rows.forEach((row, index) => {
        try {
          // 공지사항 제외
          if (row.classList.contains('notice')) return;

          // 제목 링크 찾기
          const titleLink = row.querySelector('td.bbs_title a');
          if (!titleLink) return;

          const title = titleLink.textContent.trim();
          if (!title) return;

          // onclick에서 문서 번호 추출
          const onclick = titleLink.getAttribute('onclick') || '';
          const match = onclick.match(/opView\('([^']+)'\)/);
          if (!match) return;

          const docNo = match[1];

          // 날짜 추출 (여러 컬럼 시도)
          let dateText = '';
          const dateCandidates = ['td:nth-child(6)', 'td:nth-child(5)', 'td:nth-child(7)'];
          for (const sel of dateCandidates) {
            const dateEl = row.querySelector(sel);
            if (dateEl) {
              const text = dateEl.textContent.trim();
              if (/\d{4}[-.]\d{2}[-.]\d{2}/.test(text)) {
                dateText = text;
                break;
              }
            }
          }

          results.push({
            docNo,
            title,
            registeredDate: dateText,
            rowIndex: index
          });
        } catch (e) {
          console.error(`행 ${index} 처리 오류:`, e.message);
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
      const docNo = listInfo.docNo;

      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (DocNo: ${docNo})`);
      console.log(`     제목: ${listInfo.title}`);

      try {
        // 상세 페이지 URL 구성
        const detailUrl = `${config.detailUrlTemplate}${docNo}`;
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
            '.bbs_content',
            '.view_content',
            '.board_view',
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

          const fileLinks = document.querySelectorAll('a[href*="download"], a[href*="file"], .file_download a');
          for (const link of fileLinks) {
            const href = link.getAttribute('href') || '';
            const text = link.textContent || '';
            if (href && !href.startsWith('javascript:') && href !== '#') {
              attachmentUrl = href.startsWith('http') ? href : window.location.origin + href;
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

        // 데이터 병합 (Supabase 형식)
        const jobData = {
          organization: '울산광역시교육청',
          title: listInfo.title,
          tags: ['교육청', '인력풀'],
          location: config.region || '울산광역시',
          compensation: null,
          deadline: listInfo.registeredDate,
          isUrgent: true,
          schoolLevel: 'mixed',
          subject: null,
          requiredLicense: null,
          sourceUrl: detailUrl,
          crawledAt: new Date().toISOString(),
          structuredContent: {
            docNo: docNo,
            content: detailData.content,
            attachmentUrl: detailData.attachmentUrl,
            attachmentFilename: detailData.attachmentFilename
          },
          screenshotBase64
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

    console.log(`\n✅ [울산] ${config.name} 크롤링 완료: ${jobs.length}개 수집`);
    return jobs;

  } catch (error) {
    console.error(`❌ 크롤링 오류: ${error.message}`);
    throw error;
  }
}

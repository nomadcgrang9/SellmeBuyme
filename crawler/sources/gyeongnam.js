import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 경상남도교육청 구인구직포털 크롤러
 * 패턴: onclick 이벤트 기반
 * URL: https://www.gne.go.kr/works/user/recruitment/BD_recruitmentList.do?q_searchStatus=1004
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - 크롤러 설정 객체
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlGyeongnam(page, config) {
  console.log(`\n📍 ${config.name || '경상남도교육청'} 크롤링 시작`);

  const jobs = [];
  const baseUrl = 'https://www.gne.go.kr';
  const listUrl = config.baseUrl || `${baseUrl}/works/user/recruitment/BD_recruitmentList.do?q_searchStatus=1004`;

  try {
    // 1. 목록 페이지 로드
    console.log(`🌐 목록 페이지 접속: ${listUrl}`);
    const loadResult = await loadPageWithRetry(page, listUrl, { maxRetries: 3 });

    if (!loadResult.success) {
      console.error(`❌ 페이지 로드 실패: ${loadResult.error}`);
      return [];
    }

    await page.waitForTimeout(3000); // 동적 로딩 대기

    // 2. 게시글 목록 추출
    console.log('📋 게시글 목록 추출 중...');
    const jobListData = await page.evaluate(() => {
      const results = [];

      // 테이블 행에서 onclick 이벤트로 ID 추출
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row, idx) => {
        try {
          // onclick="openDetail('1798048')" 패턴에서 ID 추출
          const titleLink = row.querySelector('a[onclick*="openDetail"]');
          if (!titleLink) return;

          const onclick = titleLink.getAttribute('onclick') || '';
          const idMatch = onclick.match(/openDetail\('(\d+)'\)/);
          if (!idMatch) return;

          const regSn = idMatch[1];
          const title = titleLink.textContent.trim();

          // 지역 정보 추출 (cate span)
          const cate = row.querySelector('.cate');
          let region = '';
          if (cate) {
            const cateText = cate.textContent.trim();
            region = cateText.split('｜')[0].trim();
          }

          // 날짜 정보 추출
          const dateCells = row.querySelectorAll('td');
          let dateText = '';
          if (dateCells.length > 2) {
            dateText = dateCells[dateCells.length - 2].textContent.trim();
          }

          results.push({
            regSn,
            title,
            region,
            dateText
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
      const regSn = listInfo.regSn;

      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${regSn})`);
      console.log(`     제목: ${listInfo.title}`);
      console.log(`     지역: ${listInfo.region || '미지정'}`);

      try {
        // 상세 페이지 URL 구성
        const detailUrl = `${baseUrl}/works/user/recruitment/BD_recruitmentDetail.do?regSn=${regSn}`;
        console.log(`     URL: ${detailUrl}`);

        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // 상세 페이지 데이터 추출
        const detailData = await page.evaluate(() => {
          // 본문 내용 추출
          let content = '';
          const contentSelectors = [
            '.detail-content',
            '.recruitment-detail',
            '.content',
            '.view_con',
            'article',
            'main',
            '.board_view'
          ];

          for (const selector of contentSelectors) {
            const elem = document.querySelector(selector);
            if (elem) {
              const text = elem.textContent.trim();
              if (text.length > 50) {
                content = text;
                break;
              }
            }
          }

          // 본문을 못 찾으면 body 전체에서 추출
          if (!content || content.length < 50) {
            const body = document.body.cloneNode(true);
            // 불필요한 요소 제거
            body.querySelectorAll('header, footer, nav, script, style').forEach(el => el.remove());
            content = body.textContent.trim().substring(0, 5000);
          }

          // 첨부파일 추출
          const attachments = [];
          const attachLinks = document.querySelectorAll('a[href*="download"], a[href*="fileDown"], a[onclick*="file"]');

          attachLinks.forEach(link => {
            let fileName = link.textContent.trim();
            const href = link.getAttribute('href') || '';
            const onclick = link.getAttribute('onclick') || '';

            if (!fileName) {
              fileName = link.getAttribute('title') || '첨부파일';
            }

            if (fileName && (href || onclick) && fileName.length > 2) {
              attachments.push({
                fileName,
                url: href || onclick
              });
            }
          });

          return {
            content,
            attachments
          };
        });

        // 스크린샷 캡처
        let screenshotBase64 = null;
        try {
          const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
          screenshotBase64 = screenshot.toString('base64');
        } catch (e) {
          console.log('     ⚠️ 스크린샷 캡처 실패');
        }

        // 지역 정보 결정
        const location = listInfo.region ? `경상남도 ${listInfo.region}` : '경상남도';

        // 데이터 병합 (index.js가 기대하는 형식으로)
        const jobData = {
          organization: '경상남도교육청',
          title: listInfo.title,
          tags: ['교육청', '구인구직포털'],
          location: location,
          compensation: null,
          deadline: listInfo.dateText,
          isUrgent: true,
          schoolLevel: 'mixed',
          subject: null,
          requiredLicense: null,
          link: detailUrl,  // index.js가 rawJob.link로 접근
          detailContent: detailData.content,  // index.js가 rawJob.detailContent로 접근
          crawledAt: new Date().toISOString(),
          structuredContent: {
            regSn: regSn,
            region: listInfo.region,
            content: detailData.content,
            attachments: detailData.attachments
          },
          screenshotBase64
        };

        jobs.push(jobData);
        console.log(`     ✅ 크롤링 완료`);

        // 목록 페이지로 돌아가기
        if (i < maxJobs - 1) {
          console.log(`     목록으로 돌아가는 중...`);
          const navResult = await loadPageWithRetry(page, listUrl, { maxRetries: 3 });
          if (!navResult.success) {
            console.warn(`     ⚠️ 목록 페이지 복귀 실패: ${navResult.error}`);
          }
          await page.waitForTimeout(1500);
        }

      } catch (error) {
        console.error(`     ❌ 상세 페이지 크롤링 실패: ${error.message}`);
        continue;
      }
    }

    console.log(`\n✅ 크롤링 완료: 총 ${jobs.length}개 수집`);
    return jobs;

  } catch (error) {
    console.error(`❌ 크롤링 오류: ${error.message}`);
    throw error;
  }
}

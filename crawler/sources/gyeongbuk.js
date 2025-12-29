import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 경상북도교육청 구인 게시판 크롤러
 * 패턴: B (data-id 기반) - 남양주/성남과 동일한 구조
 * URL: https://www.gbe.kr/main/na/ntt/selectNttList.do?mi=3626&bbsId=1887
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - 크롤러 설정 객체
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlGyeongbuk(page, config) {
  console.log(`\n📍 ${config.name || '경상북도교육청'} 크롤링 시작`);

  const jobs = [];
  const baseUrl = 'https://www.gbe.kr';
  const listUrl = `${baseUrl}/main/na/ntt/selectNttList.do?mi=3626&bbsId=1887`;

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

      // 테이블 행 선택 (여러 선택자 시도)
      const rowSelectors = [
        'table tbody tr',
        '.board-list tbody tr',
        '.tbl_list tbody tr'
      ];

      let rows = [];
      for (const selector of rowSelectors) {
        rows = document.querySelectorAll(selector);
        if (rows.length > 0) {
          console.log(`✅ 행 선택자 발견: ${selector} (${rows.length}개)`);
          break;
        }
      }

      rows.forEach((row, idx) => {
        try {
          // 헤더 행 스킵
          if (row.querySelector('th')) return;

          // 제목 링크 찾기 (data-id 속성 포함)
          const titleLink = row.querySelector('a.nttInfoBtn') ||
                           row.querySelector('a[data-id]') ||
                           row.querySelector('td.tit a') ||
                           row.querySelector('td a');

          if (!titleLink) return;

          const dataId = titleLink.getAttribute('data-id');
          const title = titleLink.textContent.trim();

          if (!dataId || !title) return;

          // 셀(td) 가져오기
          const tds = row.querySelectorAll('td');

          // 지역 추출 (보통 3번째 td)
          let region = '';
          if (tds.length >= 3) {
            region = tds[2]?.textContent?.trim() || '';
          }

          // 등록일 추출 (보통 6번째 td)
          let registeredDate = '';
          if (tds.length >= 6) {
            registeredDate = tds[5]?.textContent?.trim() || '';
          }

          // 마감일 추출 (보통 7번째 td)
          let deadline = '';
          if (tds.length >= 7) {
            deadline = tds[6]?.textContent?.trim() || '';
          }

          // 첨부파일 확인
          const attachmentLink = row.querySelector('a.listFileDown') ||
                                row.querySelector('img[src*="down"]') ||
                                row.querySelector('td:last-child a');
          const hasAttachment = !!attachmentLink;

          results.push({
            nttId: dataId,
            title,
            region,
            registeredDate,
            deadline,
            hasAttachment
          });
        } catch (e) {
          console.error('행 처리 중 오류:', e.message);
        }
      });

      return results;
    });

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);

    if (jobListData.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');

      // 디버깅: 페이지 구조 확인
      const debugInfo = await page.evaluate(() => {
        return {
          title: document.title,
          tables: document.querySelectorAll('table').length,
          tbodies: document.querySelectorAll('tbody').length,
          trs: document.querySelectorAll('tr').length,
          links: document.querySelectorAll('a').length
        };
      });
      console.log('🔍 디버그 정보:', debugInfo);
      return [];
    }

    // 3. 각 공고 상세 페이지 크롤링
    const batchSize = config.crawlBatchSize || 10;
    const maxJobs = Math.min(jobListData.length, batchSize);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      const nttId = listInfo.nttId;

      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${nttId})`);
      console.log(`     제목: ${listInfo.title}`);
      console.log(`     지역: ${listInfo.region || '미지정'}`);

      try {
        // 상세 페이지 URL 구성
        const detailUrl = `${baseUrl}/main/na/ntt/selectNttInfo.do?mi=3626&bbsId=1887&nttSn=${nttId}`;
        console.log(`     URL: ${detailUrl}`);

        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        // 상세 페이지 데이터 추출
        const detailData = await page.evaluate(() => {
          // 본문 내용 추출 (여러 선택자 시도)
          let content = '';
          const contentSelectors = [
            'td.nttCn',           // 주로 사용되는 선택자
            'div.nttCn',
            '.view_con',
            '.board_view',
            '.view-content',
            'div.cont',
            '.detail-content'
          ];

          for (const selector of contentSelectors) {
            const elem = document.querySelector(selector);
            if (elem) {
              const text = elem.textContent.trim();
              if (text.length > 30) {
                content = text;
                break;
              }
            }
          }

          // 첨부파일 추출
          const attachments = [];
          const attachSelectors = [
            'a[href*="download"]',
            'a[onclick*="file"]',
            'a.file',
            '.file-list a',
            '.attach a'
          ];

          for (const selector of attachSelectors) {
            const attachLinks = document.querySelectorAll(selector);
            attachLinks.forEach(link => {
              let fileName = link.textContent.trim();
              const href = link.getAttribute('href') || '';
              const onclick = link.getAttribute('onclick') || '';

              if (!fileName) {
                fileName = link.getAttribute('title') || '첨부파일';
              }

              // 실제 파일 링크인지 확인
              if (fileName && (href || onclick) &&
                  !fileName.includes('목록') &&
                  !fileName.includes('이전') &&
                  !fileName.includes('다음')) {
                attachments.push({
                  fileName,
                  url: href || onclick
                });
              }
            });
          }

          return {
            content,
            attachments
          };
        });

        // 스크린샷 캡처 (선택적)
        let screenshotBase64 = null;
        try {
          const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
          screenshotBase64 = screenshot.toString('base64');
        } catch (e) {
          console.log('     ⚠️ 스크린샷 캡처 실패');
        }

        // 지역 정보 결정 (목록에서 추출한 것 또는 '경상북도')
        const location = listInfo.region || '경상북도';

        // 데이터 병합
        const jobData = {
          organization: '경상북도교육청',
          title: listInfo.title,
          tags: ['교육청', '구인'],
          location: location,
          compensation: null,
          deadline: listInfo.deadline || null,
          isUrgent: false,
          schoolLevel: 'mixed',
          subject: null,
          requiredLicense: null,
          sourceUrl: detailUrl,
          crawledAt: new Date().toISOString(),
          structuredContent: {
            registeredDate: listInfo.registeredDate,
            deadline: listInfo.deadline,
            region: listInfo.region,
            content: detailData.content,
            attachments: detailData.attachments,
            nttId: nttId
          },
          screenshotBase64
        };

        jobs.push(jobData);
        console.log(`     ✅ 크롤링 완료`);

        // 목록 페이지로 돌아가기 (재시도 로직 포함)
        if (i < maxJobs - 1) {
          console.log(`     목록으로 돌아가는 중...`);
          const navResult = await loadPageWithRetry(page, listUrl, { maxRetries: 3 });
          if (!navResult.success) {
            console.warn(`     ⚠️ 목록 페이지 복귀 실패: ${navResult.error}`);
          }
          await page.waitForTimeout(1000);
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

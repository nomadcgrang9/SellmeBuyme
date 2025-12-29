import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 경상남도교육청 구인구직포털 크롤러
 * 패턴: E (div 카드 기반) - 새로운 패턴
 * URL: https://www.gne.go.kr/works/index.do
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - 크롤러 설정 객체
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlGyeongnam(page, config) {
  console.log(`\n📍 ${config.name || '경상남도교육청'} 크롤링 시작`);

  const jobs = [];
  const baseUrl = 'https://www.gne.go.kr';
  const listUrl = `${baseUrl}/works/index.do`;

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
    const jobListData = await page.evaluate((baseUrl) => {
      const results = [];

      // 경상남도교육청 구인구직포털은 <a> 링크 블록으로 구성
      // href 패턴: /works/user/recruitment/BD_recruitmentDetail.do?regSn=번호
      const jobLinks = document.querySelectorAll('a[href*="BD_recruitmentDetail.do"]');

      jobLinks.forEach((link, idx) => {
        try {
          const href = link.getAttribute('href');
          if (!href) return;

          // regSn 파라미터 추출
          const regSnMatch = href.match(/regSn=(\d+)/);
          if (!regSnMatch) return;

          const regSn = regSnMatch[1];

          // 링크 내부 텍스트에서 정보 추출
          const fullText = link.textContent.trim();

          // 제목 추출 (보통 가장 긴 텍스트)
          const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

          // 첫 번째 줄은 보통 상태/지역/직종 배지
          // 두 번째 줄이 제목
          // 마지막 줄이 기간
          let title = '';
          let region = '';
          let dateRange = '';

          if (lines.length >= 2) {
            // 배지 줄에서 지역 추출 (진주, 김해, 창원 등)
            const badgeLine = lines[0];
            const regionPatterns = [
              '진주', '김해', '창원', '양산', '밀양', '거제', '사천',
              '통영', '거창', '함안', '창녕', '고성', '남해', '하동',
              '산청', '함양', '합천', '의령'
            ];
            for (const r of regionPatterns) {
              if (badgeLine.includes(r)) {
                region = r;
                break;
              }
            }

            // 제목 찾기 (배지가 아닌 가장 긴 라인)
            for (const line of lines) {
              if (line.length > title.length && !line.includes('~') && !regionPatterns.some(r => line === r)) {
                title = line;
              }
            }

            // 날짜 범위 찾기 (YYYY.MM.DD ~ YYYY.MM.DD 형식)
            for (const line of lines) {
              if (line.includes('~')) {
                dateRange = line;
                break;
              }
            }
          }

          if (!title || title.length < 5) {
            title = fullText.substring(0, 100); // 폴백
          }

          // 배지/상태 정보 추출
          let status = '';
          if (fullText.includes('접수중')) status = '접수중';
          else if (fullText.includes('접수예정')) status = '접수예정';
          else if (fullText.includes('마감')) status = '마감';

          results.push({
            regSn,
            title: title.replace(/\s+/g, ' ').trim(),
            region,
            dateRange,
            status,
            fullUrl: href.startsWith('http') ? href : baseUrl + href
          });
        } catch (e) {
          console.error('항목 처리 중 오류:', e.message);
        }
      });

      return results;
    }, baseUrl);

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);

    if (jobListData.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');

      // 디버깅: 페이지 구조 확인
      const debugInfo = await page.evaluate(() => {
        return {
          title: document.title,
          allLinks: document.querySelectorAll('a').length,
          worksLinks: document.querySelectorAll('a[href*="works"]').length,
          recruitLinks: document.querySelectorAll('a[href*="recruitment"]').length,
          bodyText: document.body.textContent.substring(0, 500)
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
      const regSn = listInfo.regSn;

      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${regSn})`);
      console.log(`     제목: ${listInfo.title}`);
      console.log(`     지역: ${listInfo.region || '미지정'}`);
      console.log(`     상태: ${listInfo.status || '미지정'}`);

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

          // 상세 정보 테이블에서 추가 정보 추출
          const infoTable = {};
          const tableRows = document.querySelectorAll('table tr, dl dt, dl dd');
          let currentKey = '';

          tableRows.forEach(row => {
            if (row.tagName === 'TR') {
              const th = row.querySelector('th');
              const td = row.querySelector('td');
              if (th && td) {
                infoTable[th.textContent.trim()] = td.textContent.trim();
              }
            } else if (row.tagName === 'DT') {
              currentKey = row.textContent.trim();
            } else if (row.tagName === 'DD' && currentKey) {
              infoTable[currentKey] = row.textContent.trim();
              currentKey = '';
            }
          });

          // 첨부파일 추출
          const attachments = [];
          const attachSelectors = [
            'a[href*="download"]',
            'a[href*="fileDown"]',
            'a[onclick*="file"]',
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

              if (fileName && (href || onclick) &&
                  !fileName.includes('목록') &&
                  fileName.length > 2) {
                attachments.push({
                  fileName,
                  url: href || onclick
                });
              }
            });
          }

          return {
            content,
            infoTable,
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

        // 마감일 파싱 (dateRange에서 추출)
        let deadline = null;
        if (listInfo.dateRange) {
          const dateMatch = listInfo.dateRange.match(/~\s*(\d{4}[.\-\/]\d{2}[.\-\/]\d{2})/);
          if (dateMatch) {
            deadline = dateMatch[1].replace(/\./g, '-');
          }
        }

        // 데이터 병합
        const jobData = {
          organization: '경상남도교육청',
          title: listInfo.title,
          tags: ['교육청', '구인구직포털'],
          location: location,
          compensation: null,
          deadline: deadline,
          isUrgent: listInfo.status === '마감' ? false : true,
          schoolLevel: 'mixed',
          subject: null,
          requiredLicense: null,
          sourceUrl: detailUrl,
          crawledAt: new Date().toISOString(),
          structuredContent: {
            regSn: regSn,
            dateRange: listInfo.dateRange,
            status: listInfo.status,
            region: listInfo.region,
            content: detailData.content,
            infoTable: detailData.infoTable,
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

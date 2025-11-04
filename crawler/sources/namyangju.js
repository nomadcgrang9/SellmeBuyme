import { resolveUrl } from '../lib/playwright.js';

/**
 * 구리남양주교육지원청 인력풀 크롤러
 * 패턴: B (data-id 기반)
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - 크롤러 설정 객체
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlNamyangju(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  const jobs = [];

  try {
    // 1. 목록 페이지 로드
    const listUrl = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=13515&bbsId=8356';
    console.log(`🌐 목록 페이지 접속: ${listUrl}`);
    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 2. 게시글 목록 추출
    console.log('📋 게시글 목록 추출 중...');
    const jobListData = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach(row => {
        try {
          // 제목 링크 찾기 (data-id 속성 포함)
          const titleLink = row.querySelector('td.ta_l a.nttInfoBtn');
          if (!titleLink) return;

          const dataId = titleLink.getAttribute('data-id');
          const title = titleLink.textContent.trim();

          // 날짜 추출 (4번째 td)
          const dateTd = row.querySelectorAll('td')[4];
          const dateText = dateTd ? dateTd.textContent.trim() : '';
          const registeredDate = dateText.replace(/등록일\s*/g, '').trim();

          // 첨부파일 확인
          const attachmentLink = row.querySelector('a.listFileDown');
          const hasAttachment = !!attachmentLink;

          if (!dataId || !title) return;

          results.push({
            nttId: dataId,
            title,
            registeredDate,
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

      try {
        // 상세 페이지 URL 구성
        const detailUrl = `https://www.goegn.kr/goegn/na/ntt/selectNttInfo.do?mi=13515&bbsId=8356&nttSn=${nttId}`;
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
            'div.board_view',
            'table.tbl_view tbody tr td:nth-child(2)', // 테이블 2번째 컬럼
            '.tbl_board .cont'
          ];

          for (const selector of contentSelectors) {
            const elem = document.querySelector(selector);
            if (elem) {
              const text = elem.textContent.trim();
              if (text.length > 50) { // 최소 50자 이상
                content = text;
                console.log(`✅ 본문 선택자: ${selector} (${text.length}자)`);
                break;
              }
            }
          }

          // 첨부파일 추출
          const attachments = [];
          const attachLinks = document.querySelectorAll('a[href*="download"], a[onclick*="file"], a.file');
          attachLinks.forEach(link => {
            let fileName = link.textContent.trim();
            const href = link.getAttribute('href') || link.getAttribute('onclick') || '';

            // 파일명이 비어있으면 title 속성 시도
            if (!fileName) {
              fileName = link.getAttribute('title') || '첨부파일';
            }

            if (fileName && href) {
              attachments.push({ fileName, url: href });
            }
          });

          console.log(`📎 첨부파일: ${attachments.length}개`);

          return {
            content,
            attachments
          };
        });

        // 데이터 병합
        const jobData = {
          organization: '구리남양주교육지원청',
          title: listInfo.title,
          tags: ['교육공무직', '인력풀'],
          location: '구리남양주',  // 기초자치단체 (통합 표기)
          compensation: null,
          deadline: null,
          isUrgent: false,
          schoolLevel: 'mixed',
          subject: null,
          requiredLicense: null,
          sourceUrl: detailUrl,
          crawledAt: new Date().toISOString(),
          structuredContent: {
            registeredDate: listInfo.registeredDate,
            content: detailData.content,
            attachments: detailData.attachments,
            nttId: nttId
          }
        };

        jobs.push(jobData);
        console.log(`     ✅ 크롤링 완료`);

        // 목록 페이지로 돌아가기
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

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

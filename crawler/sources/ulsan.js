import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 울산광역시교육청 인력풀 크롤러
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 중복된 것만 제외 (source_url 기준)
 *
 * URL: https://www.use.go.kr/job/user/bbs/BD_selectBbsList.do?q_bbsSn=2249
 */
export async function crawlUlsan(page, config) {
  console.log(`\n📍 [울산] ${config.name} 크롤링 시작`);

  const jobs = [];
  let skippedCount = 0;

  try {
    // 1. 목록 페이지 로드
    console.log(`🌐 목록 페이지 접속: ${config.baseUrl}`);
    await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
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

    // 3. 각 공고 상세 페이지 크롤링 (중복만 제외)
    // SAFETY 설정 (150/15/0.8/10 통일)
    const SAFETY = {
      maxItems: 150,                // 절대 최대 수집 개수
      consecutiveDuplicateLimit: 10, // 연속 중복 시 즉시 중단
    };

    let processedCount = 0;
    let consecutiveDuplicates = 0;
    const maxJobs = Math.min(jobListData.length, SAFETY.maxItems);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      const docNo = listInfo.docNo;

      // 상세 페이지 URL 구성
      const detailUrl = `${config.detailUrlTemplate}${docNo}`;

      // 중복 체크 (source_url 기준) - 상세 페이지 크롤링 전에!
      const existing = await getExistingJobBySource(detailUrl);
      if (existing) {
        skippedCount++;
        consecutiveDuplicates++;
        // 연속 중복 한계 도달 시 중단
        if (consecutiveDuplicates >= SAFETY.consecutiveDuplicateLimit) {
          console.log(`\n  ⚠️ 연속 중복 ${SAFETY.consecutiveDuplicateLimit}개 도달 - 크롤링 종료`);
          break;
        }
        continue;
      }

      // 신규 항목 발견 시 연속 중복 카운터 리셋
      consecutiveDuplicates = 0;
      processedCount++;

      console.log(`\n  🔍 신규 공고 ${processedCount} (DocNo: ${docNo})`);
      console.log(`     제목: ${listInfo.title}`);

      try {
        console.log(`     URL: ${detailUrl}`);

        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
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

        // 데이터 병합 (index.js가 기대하는 형식)
        const jobData = {
          title: listInfo.title,
          date: listInfo.registeredDate || new Date().toISOString().split('T')[0],
          link: detailUrl,  // index.js가 rawJob.link로 접근
          location: config.region || '울산광역시',
          organization: '울산광역시교육청',
          deadline: listInfo.registeredDate,
          detailContent: detailData.content,  // index.js가 rawJob.detailContent로 접근
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          hasContentImages: false,
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

  } catch (error) {
    console.error(`❌ 크롤링 오류: ${error.message}`);
    throw error;
  }

  console.log(`\n✅ [울산] ${config.name} 크롤링 완료`);
  console.log(`   - 신규: ${jobs.length}개`);
  console.log(`   - 중복 스킵: ${skippedCount}개\n`);

  return jobs;
}

import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 대전광역시교육청 학교인사 크롤러
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 중복된 것만 제외 (source_url 기준)
 *
 * 패턴: goView() 함수 기반
 * URL: https://www.dje.go.kr/boardCnts/list.do?boardID=54&m=030202&s=dje
 */
export async function crawlDaejeon(page, config) {
  console.log(`\n📍 ${config.name || '대전광역시교육청'} 크롤링 시작`);

  const jobs = [];
  let skippedCount = 0;
  const listUrl = config.baseUrl;

  try {
    // 1. 목록 페이지 로드
    console.log(`🌐 목록 페이지 접속: ${listUrl}`);
    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
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

          // onclick에서 boardSeq 추출: goView(49849, 0, 0, 'N', 'Y', ...) 형식
          const onclick = titleLink.getAttribute('onclick') || '';

          // 패턴: goView(49849, ...) - 첫번째 파라미터가 게시글 번호
          const match = onclick.match(/goView\s*\(\s*(\d+)/);
          if (!match) {
            return;
          }

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
      const boardSeq = listInfo.boardSeq;

      // 상세 페이지 URL 구성 ({SEQ} 치환)
      const detailUrl = config.detailUrlTemplate.replace('{SEQ}', boardSeq);

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

      console.log(`\n  🔍 신규 공고 ${processedCount} (BoardSeq: ${boardSeq})`);
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

        // 데이터 병합 (index.js가 기대하는 형식)
        const jobData = {
          title: listInfo.title,
          date: listInfo.dateText || new Date().toISOString().split('T')[0],
          link: detailUrl,  // index.js가 rawJob.link로 접근
          location: config.region || '대전광역시',
          organization: '대전광역시교육청',
          deadline: listInfo.periodText || listInfo.dateText,
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

  console.log(`\n✅ ${config.name || '대전광역시교육청'} 크롤링 완료`);
  console.log(`   - 신규: ${jobs.length}개`);
  console.log(`   - 중복 스킵: ${skippedCount}개\n`);

  return jobs;
}

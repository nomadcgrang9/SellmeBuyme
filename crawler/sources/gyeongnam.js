import { loadPageWithRetry } from '../lib/playwright.js';
import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 경상남도교육청 구인구직포털 크롤러
 * 패턴: onclick 이벤트 기반 - URL 미리 추출 후 순회 (Page crash 방지)
 * URL: https://www.gne.go.kr/works/user/recruitment/BD_recruitmentList.do?q_searchStatus=1004
 */
export async function crawlGyeongnam(page, config) {
  console.log(`\n📍 ${config.name || '경상남도교육청'} 크롤링 시작`);

  const jobs = [];
  let skippedCount = 0;
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

    await page.waitForTimeout(2000);

    // 2. 게시글 목록에서 URL 정보만 추출 (목록으로 돌아가지 않음)
    console.log('📋 게시글 목록 추출 중...');
    const jobListData = await page.evaluate((baseUrl) => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row, idx) => {
        try {
          const titleLink = row.querySelector('a[onclick*="openDetail"]');
          if (!titleLink) return;

          const onclick = titleLink.getAttribute('onclick') || '';
          const idMatch = onclick.match(/openDetail\('(\d+)'\)/);
          if (!idMatch) return;

          const regSn = idMatch[1];
          const title = titleLink.textContent.trim();

          // 지역 정보 추출
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

          // 상세 페이지 URL 미리 구성
          const detailUrl = `${baseUrl}/works/user/recruitment/BD_recruitmentDetail.do?regSn=${regSn}`;

          results.push({
            regSn,
            title,
            region,
            dateText,
            detailUrl
          });
        } catch (e) {
          // 무시
        }
      });

      return results;
    }, baseUrl);

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);

    if (jobListData.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');
      return [];
    }

    // 3. 각 공고 상세 페이지 크롤링 (목록으로 돌아가지 않음!)
    // SAFETY 설정 (150/15/0.8/10 통일)
    const SAFETY = {
      maxItems: 150,                // 절대 최대 수집 개수
      consecutiveDuplicateLimit: 10, // 연속 중복 시 즉시 중단
    };

    const batchSize = config.crawlBatchSize || SAFETY.maxItems;
    const maxJobs = Math.min(jobListData.length, batchSize);

    let processedCount = 0;
    let consecutiveDuplicates = 0;

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      const detailUrl = listInfo.detailUrl;

      // 중복 체크 먼저!
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

      console.log(`\n  🔍 신규 공고 ${processedCount} (ID: ${listInfo.regSn})`);
      console.log(`     제목: ${listInfo.title}`);

      try {
        console.log(`     URL: ${detailUrl}`);
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        // 상세 페이지 데이터 추출
        const detailData = await page.evaluate(() => {
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

          if (!content || content.length < 50) {
            const body = document.body.cloneNode(true);
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
            if (!fileName) fileName = link.getAttribute('title') || '첨부파일';
            if (fileName && (href || onclick) && fileName.length > 2) {
              attachments.push({ fileName, url: href || onclick });
            }
          });

          return { content, attachments };
        });

        // 스크린샷 캡처
        console.log(`     📸 스크린샷 캡처 중...`);
        let screenshotBase64 = null;
        try {
          const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
          screenshotBase64 = screenshot.toString('base64');
        } catch (e) {
          console.log('     ⚠️ 스크린샷 캡처 실패');
        }

        const location = listInfo.region ? `경상남도 ${listInfo.region}` : '경상남도';

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
          link: detailUrl,
          detailContent: detailData.content,
          crawledAt: new Date().toISOString(),
          structuredContent: {
            regSn: listInfo.regSn,
            region: listInfo.region,
            content: detailData.content,
            attachments: detailData.attachments
          },
          screenshotBase64
        };

        jobs.push(jobData);
        console.log(`     ✅ 크롤링 완료 (본문 ${detailData.content.length}자)`);

        // 다음 공고 전 잠시 대기 (Page crash 방지)
        await page.waitForTimeout(1000);

      } catch (error) {
        console.error(`     ❌ 상세 페이지 크롤링 실패: ${error.message}`);
        continue;
      }
    }

    console.log(`\n✅ 경상남도교육청 크롤링 완료`);
    console.log(`   - 신규: ${jobs.length}개`);
    console.log(`   - 중복 스킵: ${skippedCount}개`);
    return jobs;

  } catch (error) {
    console.error(`❌ 크롤링 오류: ${error.message}`);
    throw error;
  }
}

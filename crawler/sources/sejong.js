import { loadPageWithRetry, resolveUrl } from '../lib/playwright.js';
import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 세종특별자치시교육청 구인게시판 크롤러
 *
 * URL: https://www.sje.go.kr/sje/na/ntt/selectNttList.do?mi=52132&bbsId=108
 * 패턴: NTT 패턴 (selectNttList.do + selectNttInfo.do)
 *
 * 특징:
 * - a.nttInfoBtn[data-id] 패턴으로 상세 페이지 ID 추출
 * - goFileDown('fileKey') 패턴으로 첨부파일 다운로드
 * - 중복 체크 기반 조기 종료 (연속 3개 중복 시 중단)
 */

// 안전장치 설정
const SAFETY = {
  maxItems: 100,                // 절대 최대 수집 개수
  maxBatches: 10,               // 최대 배치 반복 횟수
  batchDuplicateThreshold: 0.5, // 배치 내 중복률 50% 이상이면 종료
  consecutiveDuplicateLimit: 3, // 연속 중복 시 즉시 중단
  maxPages: 10,                 // 최대 페이지 수
};

export async function crawlSejong(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);
  console.log(`   URL: ${config.baseUrl}`);

  const jobs = [];
  let totalSkippedCount = 0;
  let consecutiveDuplicates = 0;
  let totalProcessedCount = 0;
  let stopCrawling = false;

  // 배치 반복 방식 변수
  const batchSize = config.crawlBatchSize || 10;
  let batchNumber = 0;
  let batchNewCount = 0;
  let batchDuplicateCount = 0;

  console.log(`\n🔄 배치 반복 모드: 배치당 ${batchSize}개, 최대 ${SAFETY.maxBatches}회`);
  console.log(`   중복률 ${SAFETY.batchDuplicateThreshold * 100}% 이상이면 종료`);

  try {
    // 첫 페이지 로드
    console.log(`\n📄 목록 페이지 1 로딩 중...`);
    const loadResult = await loadPageWithRetry(page, config.baseUrl, { maxRetries: 3 });

    if (!loadResult.success) {
      console.error(`❌ 첫 페이지 로드 실패: ${loadResult.error}`);
      throw new Error('첫 페이지 로드 실패');
    }

    await page.waitForTimeout(2000);

    // 페이지네이션 처리
    for (let pageNum = 1; pageNum <= SAFETY.maxPages && !stopCrawling; pageNum++) {
      // 2페이지부터는 목록 페이지를 다시 로드한 후 goPaging() 호출
      if (pageNum > 1) {
        console.log(`\n📄 목록 페이지 ${pageNum} 로딩 중...`);

        try {
          // 목록 페이지로 다시 이동 (네비게이션 대기)
          await page.goto(config.baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
          await page.waitForTimeout(2000);

          // goPaging 함수가 로드될 때까지 대기
          await page.waitForFunction(() => typeof goPaging === 'function', { timeout: 10000 }).catch(() => {
            console.log(`     ⚠️ goPaging 함수 대기 타임아웃`);
          });

          // goPaging() 함수로 페이지 이동
          await page.evaluate((pn) => {
            if (typeof goPaging === 'function') {
              goPaging(pn);
            } else {
              throw new Error('goPaging 함수 없음');
            }
          }, pageNum);

          // 페이지 로딩 대기 (AJAX 응답)
          await page.waitForTimeout(2000);
          await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        } catch (error) {
          console.error(`❌ 페이지 ${pageNum} 이동 실패: ${error.message}`);
          break;
        }
      }

      // 게시글 목록 추출
      const listItems = await page.evaluate(() => {
        const results = [];
        const rows = document.querySelectorAll('table tbody tr');

        rows.forEach((row, index) => {
          try {
            // 공지사항 행 스킵
            if (row.classList.contains('notice') || row.classList.contains('noti')) {
              return;
            }

            const cells = row.querySelectorAll('td');
            if (cells.length < 8) return;

            // 번호 (첫 번째 열)
            const numText = cells[0]?.textContent?.trim() || '';
            const isNotice = numText === '공지' || isNaN(parseInt(numText));

            // 학교명 (두 번째 열)
            const schoolName = cells[1]?.textContent?.trim() || '';

            // 과목 (세 번째 열)
            const subject = cells[2]?.textContent?.trim() || '';

            // 제목 및 링크 (네 번째 열)
            const titleCell = cells[3];
            const titleLink = titleCell?.querySelector('a.nttInfoBtn, a[data-id]');
            const title = titleLink?.textContent?.trim() || titleCell?.textContent?.trim() || '';
            const dataId = titleLink?.getAttribute('data-id') || null;

            if (!title || !dataId) return;

            // 모집상태 (다섯 번째 열)
            const recruitStatus = cells[4]?.textContent?.trim() || '';

            // 접수마감일 (여섯 번째 열)
            const deadline = cells[5]?.textContent?.trim() || '';

            // 작성자 (일곱 번째 열)
            const author = cells[6]?.textContent?.trim() || '';

            // 등록일 (여덟 번째 열)
            const registeredDate = cells[7]?.textContent?.trim() || '';

            results.push({
              numText,
              isNotice,
              schoolName,
              subject,
              title,
              dataId,
              recruitStatus,
              deadline,
              author,
              registeredDate,
              rowIndex: index
            });
          } catch (e) {
            console.error(`행 ${index} 처리 오류:`, e.message);
          }
        });

        return results;
      });

      console.log(`   발견된 공고: ${listItems.length}개`);

      if (listItems.length === 0) {
        console.log(`   ⚠️ 공고 없음, 페이지네이션 종료`);
        break;
      }

      // 각 공고 처리
      for (const item of listItems) {
        // 안전장치: 절대 최대 수집 개수
        if (totalProcessedCount >= SAFETY.maxItems) {
          console.log(`\n⚠️ 절대 최대 수집 개수(${SAFETY.maxItems}) 도달`);
          stopCrawling = true;
          break;
        }

        // 안전장치: 연속 중복 즉시 중단
        if (consecutiveDuplicates >= SAFETY.consecutiveDuplicateLimit) {
          console.log(`\n🛑 연속 ${SAFETY.consecutiveDuplicateLimit}개 중복 - 기존 영역 도달, 즉시 종료`);
          stopCrawling = true;
          break;
        }

        // 배치 완료 체크 (배치당 batchSize개)
        if (batchNewCount + batchDuplicateCount >= batchSize) {
          batchNumber++;
          const batchTotal = batchNewCount + batchDuplicateCount;
          const duplicateRate = batchTotal > 0 ? batchDuplicateCount / batchTotal : 0;

          console.log(`\n━━━ 배치 ${batchNumber} 결과 ━━━`);
          console.log(`   신규: ${batchNewCount}개, 중복: ${batchDuplicateCount}개`);
          console.log(`   중복률: ${(duplicateRate * 100).toFixed(0)}% (임계값: ${SAFETY.batchDuplicateThreshold * 100}%)`);

          if (duplicateRate >= SAFETY.batchDuplicateThreshold) {
            console.log(`   → ✅ 기존 데이터 영역 진입 → 크롤링 완료`);
            stopCrawling = true;
            break;
          }

          if (batchNumber >= SAFETY.maxBatches) {
            console.log(`   → ⚠️ 최대 배치 횟수 도달`);
            stopCrawling = true;
            break;
          }

          console.log(`   → 🔄 중복률 낮음, 다음 배치 계속...`);
          batchNewCount = 0;
          batchDuplicateCount = 0;
        }

        // 모집종료 상태 스킵
        if (item.recruitStatus === '모집종료') {
          console.log(`  ⏭️ 모집종료: ${item.title.substring(0, 40)}...`);
          continue;
        }

        // 마감일 지난 공고 스킵
        if (item.deadline) {
          const deadlineStr = item.deadline.replace(/\./g, '-');
          const deadlineDate = new Date(deadlineStr);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          if (deadlineDate < today) {
            console.log(`  ⏭️ 마감일 지남 (${item.deadline}): ${item.title.substring(0, 40)}...`);
            continue;
          }
        }

        // 상세 페이지 URL 구성
        const detailUrl = `${config.detailUrlTemplate}${item.dataId}`;

        // 중복 체크 (DB 조회)
        const existing = await getExistingJobBySource(detailUrl);

        if (existing) {
          consecutiveDuplicates++;
          batchDuplicateCount++;
          totalSkippedCount++;
          console.log(`  ⏭️ 중복: ${item.title.substring(0, 40)}...`);
          continue;
        }

        // 신규 공고 발견 - 중복 카운터 리셋
        consecutiveDuplicates = 0;
        batchNewCount++;
        totalProcessedCount++;

        console.log(`\n  📄 신규 ${totalProcessedCount}. ${item.title.substring(0, 50)}...`);
        console.log(`     학교: ${item.schoolName}, 과목: ${item.subject}`);

        try {
          // 상세 페이지 크롤링
          const detailData = await crawlDetailPage(page, detailUrl, config);

          // 규칙1: 광역자치단체(세종) + 기초자치단체(세종) 둘 다 저장
          // 세종은 특별자치시로 기초자치단체가 없는 단일 행정구역
          // 규칙2: 접미사 제거 (세종특별자치시 → 세종)
          const metropolitanLocation = '세종';
          const basicLocation = '세종';  // 단일 행정구역

          jobs.push({
            title: item.title,
            date: item.registeredDate.replace(/\./g, '-'),
            link: detailUrl,
            organization: item.schoolName || detailData.organization,
            schoolName: item.schoolName,
            subject: item.subject,
            jobField: item.subject,
            location: basicLocation,                    // 기초자치단체
            metropolitanLocation: metropolitanLocation, // 광역자치단체
            recruitStatus: item.recruitStatus,
            deadline: item.deadline,
            detailContent: detailData.content,
            attachmentUrl: detailData.attachmentUrl,
            attachmentFilename: detailData.attachmentFilename,
            hasContentImages: detailData.hasContentImages,
            screenshotBase64: detailData.screenshot,
          });

          console.log(`     ✅ 완료 (지역: ${metropolitanLocation} > ${basicLocation}, 본문 ${detailData.content?.length || 0}자)`);

          // 다음 공고 전 대기
          await page.waitForTimeout(1000);

        } catch (error) {
          console.error(`     ❌ 상세 크롤링 실패: ${error.message}`);
        }
      }

      // 다음 페이지로
      if (!stopCrawling && listItems.length > 0) {
        await page.waitForTimeout(1000);
      }
    }

  } catch (error) {
    console.error(`❌ 크롤링 치명적 오류: ${error.message}`);
    throw error;
  }

  // 마지막 배치 결과 출력 (미완료 배치가 있는 경우)
  if (batchNewCount + batchDuplicateCount > 0) {
    batchNumber++;
    const batchTotal = batchNewCount + batchDuplicateCount;
    const duplicateRate = batchTotal > 0 ? batchDuplicateCount / batchTotal : 0;
    console.log(`\n━━━ 배치 ${batchNumber} (최종) 결과 ━━━`);
    console.log(`   신규: ${batchNewCount}개, 중복: ${batchDuplicateCount}개`);
    console.log(`   중복률: ${(duplicateRate * 100).toFixed(0)}%`);
  }

  console.log(`\n✅ ${config.name} 크롤링 완료`);
  console.log(`   📊 총 수집: ${jobs.length}개, 중복 스킵: ${totalSkippedCount}개, 배치 횟수: ${batchNumber}회\n`);

  return jobs;
}

/**
 * 상세 페이지 크롤링
 */
async function crawlDetailPage(page, detailUrl, config) {
  const result = {
    content: '',
    attachmentUrl: null,
    attachmentFilename: null,
    hasContentImages: false,
    screenshot: null,
    organization: null,
  };

  try {
    // 상세 페이지 로드
    const loadResult = await loadPageWithRetry(page, detailUrl, { maxRetries: 2 });

    if (!loadResult.success) {
      console.warn(`     ⚠️ 상세 페이지 로드 실패: ${loadResult.error}`);
      return result;
    }

    await page.waitForTimeout(1500);

    // 본문 내용 추출
    result.content = await page.evaluate(() => {
      // 본문 선택자 우선순위
      const contentSelectors = [
        'td.nttCn',           // NTT 패턴 표준
        'div.nttCn',
        '.view_con',
        '.board_view',
        '.view-content',
        '.content',
        '#content',
        'article',
      ];

      for (const selector of contentSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          let text = elem.innerText.trim();
          // 불필요한 텍스트 제거
          text = text
            .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵/g, '')
            .replace(/만족도 조사[\s\S]*?평가하기/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (text.length > 50) {
            return text.substring(0, 5000);
          }
        }
      }

      // 전체 body 사용 (최후 수단)
      return document.body.innerText.substring(0, 5000).trim();
    });

    // 첨부파일 추출 (goFileDown 패턴)
    const attachmentData = await page.evaluate(() => {
      // goFileDown 패턴 찾기
      const fileLinks = document.querySelectorAll('a[href*="goFileDown"], a[onclick*="goFileDown"]');

      for (const link of fileLinks) {
        const href = link.getAttribute('href') || '';
        const onclick = link.getAttribute('onclick') || '';
        const filename = link.textContent?.trim() || null;

        // href에서 fileKey 추출
        let fileKey = null;
        const hrefMatch = href.match(/goFileDown\(['"]?([^'")\s]+)['"]?\)/);
        if (hrefMatch) {
          fileKey = hrefMatch[1];
        }

        // onclick에서 fileKey 추출
        if (!fileKey) {
          const onclickMatch = onclick.match(/goFileDown\(['"]?([^'")\s]+)['"]?\)/);
          if (onclickMatch) {
            fileKey = onclickMatch[1];
          }
        }

        if (fileKey) {
          return {
            fileKey,
            filename
          };
        }
      }

      // 일반 다운로드 링크 찾기
      const downloadLinks = document.querySelectorAll('a[href*="download"], a[href*="fileDown"]');
      for (const link of downloadLinks) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('javascript:')) {
          return {
            url: href,
            filename: link.textContent?.trim() || null
          };
        }
      }

      return null;
    });

    if (attachmentData) {
      if (attachmentData.fileKey) {
        // goFileDown 패턴: 실제 다운로드 URL 구성
        result.attachmentUrl = `https://www.sje.go.kr/comm/nttFileDownload.do?fileKey=${attachmentData.fileKey}`;
        result.attachmentFilename = attachmentData.filename;
        console.log(`     📎 첨부파일: ${attachmentData.filename || 'unknown'}`);
      } else if (attachmentData.url) {
        result.attachmentUrl = resolveUrl(detailUrl, attachmentData.url);
        result.attachmentFilename = attachmentData.filename;
        console.log(`     📎 첨부파일: ${attachmentData.filename || 'unknown'}`);
      }
    }

    // 본문 내 이미지 확인
    result.hasContentImages = await page.evaluate(() => {
      const contentSelectors = ['.board_view', '.nttCn', '.content', '.view_con', 'article'];
      let contentArea = null;

      for (const selector of contentSelectors) {
        contentArea = document.querySelector(selector);
        if (contentArea) break;
      }

      if (!contentArea) contentArea = document.body;

      const images = contentArea.querySelectorAll('img');
      const realImages = Array.from(images).filter(img => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        const src = img.src || '';
        const isIcon = src.includes('icon') || src.includes('logo') || src.includes('btn');
        return width > 100 && height > 100 && !isIcon;
      });

      return realImages.length > 0;
    });

    // 스크린샷 캡처
    console.log(`     📸 스크린샷 캡처 중...`);
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
    result.screenshot = screenshot.toString('base64');

  } catch (error) {
    console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
  }

  return result;
}

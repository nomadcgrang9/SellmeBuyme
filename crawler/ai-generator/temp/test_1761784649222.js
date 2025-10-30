import { resolveUrl } from '../../lib/playwright.js';

/**
 * 구리남양주교육지원청 인력풀 크롤러 (패턴 A - POST 기반)
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - 크롤러 설정 객체
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlCrawlNewBoard(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  const jobs = [];

  try {
    // 1. 목록 페이지로 이동 (POST 요청을 보내기 위한 초기 페이지 설정)
    // config.url은 게시판 목록의 기본 URL입니다.
    console.log(`🌐 목록 페이지로 이동 중: ${config.url}`);
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });

    // POST 요청을 통해 실제 목록 데이터(HTML)를 가져옵니다.
    // config.listEndpoint는 POST 요청을 보낼 URL입니다.
    // config.formData는 POST 요청에 필요한 데이터입니다.
    console.log(`📤 목록 데이터 POST 요청 중... Endpoint: ${config.listEndpoint}`);
    const formData = new URLSearchParams(config.formData).toString();

    const listResponse = await page.evaluate(async ({ endpoint, data }) => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            // 일부 AJAX 기반 사이트는 이 헤더가 필요할 수 있습니다.
            'X-Requested-With': 'XMLHttpRequest',
          },
          body: data,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
      } catch (e) {
        console.error('Fetch error:', e);
        return null; // 오류 발생 시 null 반환
      }
    }, { endpoint: config.listEndpoint, data: formData });

    if (!listResponse) {
      console.error('❌ 목록 페이지 응답을 받지 못했습니다. 네트워크나 설정을 확인하세요.');
      return [];
    }

    // 가져온 HTML을 현재 페이지 컨텐츠로 설정하여 DOM처럼 파싱합니다.
    await page.setContent(listResponse);

    // 2. 게시판 목록에서 구조화된 정보 추출
    console.log('📋 게시글 목록 파싱 중...');
    const jobListData = await page.evaluate((analysis) => {
      const results = [];
      const seen = new Set(); // 중복 ID 방지를 위한 Set

      // 분석 결과에 기반한 컨테이너 선택자 사용
      const container = document.querySelector(analysis.listPage.containerSelector);
      if (!container) {
        console.warn(`[evaluate] 목록 컨테이너(${analysis.listPage.containerSelector})를 찾을 수 없습니다.`);
        return [];
      }

      const rows = container.querySelectorAll(analysis.listPage.rowSelector);

      rows.forEach(row => {
        try {
          // 제목, 날짜 요소 선택
          const titleEl = row.querySelector(analysis.listPage.titleSelector);
          const dateEl = row.querySelector(analysis.listPage.dateSelector);

          // 제목 요소는 필수입니다.
          if (!titleEl) return;

          const title = titleEl.textContent.trim();
          // 날짜가 없으면 오늘 날짜로 대체
          const date = dateEl ? dateEl.textContent.trim().replace(/\./g, '-') : new Date().toISOString().split('T')[0];

          // 링크 추출 (onclick 속성에서 게시물 ID 추출)
          const onclickAttr = titleEl.getAttribute(analysis.listPage.linkExtraction.attribute);
          if (!onclickAttr) return;

          const regex = new RegExp(analysis.listPage.linkExtraction.regex);
          const idMatch = onclickAttr.match(regex);

          // ID를 찾지 못하면 해당 행은 건너뜁니다.
          if (!idMatch || !idMatch[1]) return;

          const nttId = idMatch[1];

          // 중복 게시물 건너뛰기
          if (seen.has(nttId)) return;
          seen.add(nttId);

          results.push({
            nttId,
            title,
            date,
          });
        } catch (e) {
          console.warn(`[evaluate] 목록의 행 처리 중 오류 발생: ${e.message}`);
        }
      });

      return results;
    }, config.analysis); // config 객체에서 분석 정보를 받아옵니다.

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);

    if (jobListData.length === 0) {
      console.warn('⚠️ 공고 목록을 찾을 수 없습니다. 페이지 구조 또는 선택자를 확인하세요.');
      return [];
    }

    // 3. 각 공고 상세 페이지 크롤링 (config.crawlBatchSize 또는 기본값 5개)
    const batchSize = config.crawlBatchSize || 5;
    const maxJobs = Math.min(jobListData.length, batchSize);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      const { nttId } = listInfo;

      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${nttId}) 크롤링 중...`);
      console.log(`     게시글 제목: ${listInfo.title}`);

      try {
        // 상세 페이지 크롤링 헬퍼 함수 호출
        const detailData = await crawlDetailPage(page, config, nttId);

        // 데이터 검증: 제목이 없으면 유효하지 않은 공고로 판단하고 건너뜁니다.
        if (!listInfo.title && !detailData.title) {
          console.warn(`  ⚠️  공고 ${nttId}의 제목이 없어 스킵합니다.`);
          continue;
        }

        // 상세 페이지로 직접 이동할 수 있는 최종 링크 생성
        const detailUrl = new URL(config.detailEndpoint);
        const baseParams = new URL(config.url).searchParams;
        detailUrl.searchParams.set('mi', baseParams.get('mi'));
        detailUrl.searchParams.set('bbsId', baseParams.get('bbsId'));
        detailUrl.searchParams.set('nttId', nttId);
        const link = detailUrl.toString();

        // 목록 정보와 상세 정보를 병합하여 최종 결과 객체 생성
        const mergedJob = {
          title: detailData.title || listInfo.title,
          date: listInfo.date,
          link: link,
          detailContent: detailData.content,
          attachments: detailData.attachments,
          screenshotBase64: detailData.screenshot,
          // 하위 호환성을 위한 필드
          attachmentUrl: detailData.attachments.length > 0 ? detailData.attachments[0].url : null,
          attachmentFilename: detailData.attachments.length > 0 ? detailData.attachments[0].name : null,
        };

        jobs.push(mergedJob);
        console.log(`  ✅ 완료: ${mergedJob.title}`);

      } catch (error) {
        console.error(`  ❌ 공고 ${nttId} 처리 중 심각한 오류 발생: ${error.message}`);
        // 개별 공고 실패가 전체 크롤링을 중단시키지 않도록 continue 처리
        continue;
      }

      // 서버 부하 방지를 위한 대기 시간
      await page.waitForTimeout(1000);
    }

  } catch (error) {
    console.error(`❌ 크롤링 프로세스 전체에서 오류 발생: ${error.message}`);
    // 디버깅을 위해 오류 발생 시 스크린샷 저장
    await page.screenshot({ path: `error_${config.name}.png`, fullPage: true });
    throw error;
  }

  console.log(`\n🎉 ${config.name} 크롤링 완료: 총 ${jobs.length}개 수집`);
  return jobs;
}

/**
 * 상세 페이지 크롤링 헬퍼 함수
 * @param {import('playwright
import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 대전광역시교육청 크롤러
 * 참고: 대전은 edurecruit.go.kr로 이전됨, 메인사이트 공지사항 크롤링
 * URL: https://www.dje.go.kr/main.do
 */
export async function crawlDaejeon(page, config) {
  console.log(`\n📍 ${config.name || '대전광역시교육청'} 크롤링 시작`);

  const jobs = [];
  const baseUrl = 'https://www.dje.go.kr';
  // 대전은 채용정보가 별도 시스템으로 분리되어 있어 공지사항 기반
  const listUrl = `${baseUrl}/dje/na/ntt/selectNttList.do?mi=1098&bbsId=1075`;

  try {
    console.log(`🌐 목록 페이지 접속: ${listUrl}`);
    const loadResult = await loadPageWithRetry(page, listUrl, { maxRetries: 3 });
    if (!loadResult.success) return [];
    await page.waitForTimeout(2000);

    console.log('📋 게시글 목록 추출 중...');
    const jobListData = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach(row => {
        if (row.querySelector('th')) return;
        const titleLink = row.querySelector('a.nttInfoBtn, a[data-id], td a');
        if (!titleLink) return;

        const dataId = titleLink.getAttribute('data-id');
        const title = titleLink.textContent.trim();

        // 채용 관련 키워드 필터
        if (dataId && title && (title.includes('채용') || title.includes('모집') || title.includes('임용'))) {
          results.push({ nttId: dataId, title });
        }
      });
      return results;
    });

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);
    if (jobListData.length === 0) {
      console.log('⚠️ 채용 관련 공고 없음');
      return [];
    }

    const batchSize = config.crawlBatchSize || 10;
    const maxJobs = Math.min(jobListData.length, batchSize);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${listInfo.nttId})`);

      try {
        const detailUrl = `${baseUrl}/dje/na/ntt/selectNttInfo.do?mi=1098&bbsId=1075&nttSn=${listInfo.nttId}`;
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const detailData = await page.evaluate(() => {
          let content = '';
          const selectors = ['td.nttCn', 'div.nttCn', '.view_con', '.content'];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent.length > 30) {
              content = el.textContent.trim();
              break;
            }
          }
          return { content: content.substring(0, 5000) };
        });

        jobs.push({
          organization: '대전광역시교육청',
          title: listInfo.title,
          tags: ['채용공고'],
          location: '대전광역시',
          sourceUrl: detailUrl,
          crawledAt: new Date().toISOString(),
          structuredContent: { nttId: listInfo.nttId, content: detailData.content }
        });
        console.log(`     ✅ 완료`);

        if (i < maxJobs - 1) {
          await loadPageWithRetry(page, listUrl, { maxRetries: 2 });
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.error(`     ❌ 실패: ${error.message}`);
      }
    }

    console.log(`\n✅ 크롤링 완료: 총 ${jobs.length}개 수집`);
    return jobs;
  } catch (error) {
    console.error(`❌ 크롤링 오류: ${error.message}`);
    throw error;
  }
}

import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 인천광역시교육청 채용공고 크롤러
 * URL: https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981
 */
export async function crawlIncheon(page, config) {
  console.log(`\n📍 ${config.name || '인천광역시교육청'} 크롤링 시작`);

  const jobs = [];
  const baseUrl = 'https://www.ice.go.kr';
  const listUrl = `${baseUrl}/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981`;

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

        if (dataId && title) {
          results.push({ nttId: dataId, title });
        }
      });
      return results;
    });

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);
    if (jobListData.length === 0) return [];

    const batchSize = config.crawlBatchSize || 10;
    const maxJobs = Math.min(jobListData.length, batchSize);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs} (ID: ${listInfo.nttId})`);

      try {
        const detailUrl = `${baseUrl}/ice/na/ntt/selectNttInfo.do?mi=10997&bbsId=1981&nttSn=${listInfo.nttId}`;
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
          organization: '인천광역시교육청',
          title: listInfo.title,
          tags: ['채용공고'],
          location: '인천광역시',
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

import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 서울특별시교육청 (서울교육일자리포털) 크롤러
 * URL: https://work.sen.go.kr/work/search/recInfo/BD_selectSrchRecInfo.do
 * @param {import('playwright').Page} page
 * @param {object} config
 */
export async function crawlSeoul(page, config) {
  console.log(`\n📍 ${config.name || '서울특별시교육청'} 크롤링 시작`);

  const jobs = [];
  const baseUrl = 'https://work.sen.go.kr';
  const listUrl = `${baseUrl}/work/search/recInfo/BD_selectSrchRecInfo.do`;

  try {
    console.log(`🌐 목록 페이지 접속: ${listUrl}`);
    const loadResult = await loadPageWithRetry(page, listUrl, { maxRetries: 3 });
    if (!loadResult.success) {
      console.error(`❌ 페이지 로드 실패: ${loadResult.error}`);
      return [];
    }
    await page.waitForTimeout(3000);

    console.log('📋 게시글 목록 추출 중...');
    const jobListData = await page.evaluate(() => {
      const results = [];
      // 채용공고 카드/리스트 아이템 찾기
      const items = document.querySelectorAll('.recruit-list li, .list-item, table tbody tr');

      items.forEach(item => {
        try {
          const link = item.querySelector('a[href*="recInfo"], a[href*="view"]');
          if (!link) return;

          const href = link.getAttribute('href');
          const title = link.textContent.trim() || item.querySelector('.title, .subject')?.textContent.trim();

          // ID 추출
          let id = '';
          const idMatch = href?.match(/recSn=(\d+)|sn=(\d+)|id=(\d+)/);
          if (idMatch) id = idMatch[1] || idMatch[2] || idMatch[3];

          if (title && title.length > 5) {
            results.push({
              id,
              title: title.substring(0, 200),
              href
            });
          }
        } catch (e) {}
      });
      return results;
    });

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);
    if (jobListData.length === 0) return [];

    const batchSize = config.crawlBatchSize || 10;
    const maxJobs = Math.min(jobListData.length, batchSize);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs}: ${listInfo.title.substring(0, 50)}...`);

      try {
        const detailUrl = listInfo.href.startsWith('http') ? listInfo.href : baseUrl + listInfo.href;
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const detailData = await page.evaluate(() => {
          let content = '';
          const selectors = ['.view-content', '.content', '.detail', 'article', '.board-view'];
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && el.textContent.length > 50) {
              content = el.textContent.trim();
              break;
            }
          }
          return { content: content.substring(0, 5000) };
        });

        jobs.push({
          organization: '서울특별시교육청',
          title: listInfo.title,
          tags: ['서울교육일자리포털'],
          location: '서울특별시',
          sourceUrl: detailUrl,
          crawledAt: new Date().toISOString(),
          structuredContent: { id: listInfo.id, content: detailData.content }
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

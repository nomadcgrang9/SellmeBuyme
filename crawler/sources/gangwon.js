import { loadPageWithRetry } from '../lib/playwright.js';

/**
 * 강원특별자치도교육청 구인 게시판 크롤러
 * URL: https://www.gwe.go.kr/main/sub.do?key=bTIzMDcyMTA1ODUxNTU%3D
 */
export async function crawlGangwon(page, config) {
  console.log(`\n📍 ${config.name || '강원특별자치도교육청'} 크롤링 시작`);

  const jobs = [];
  const baseUrl = 'https://www.gwe.go.kr';
  const listUrl = `${baseUrl}/main/sub.do?key=bTIzMDcyMTA1ODUxNTU%3D`;

  try {
    console.log(`🌐 목록 페이지 접속: ${listUrl}`);
    const loadResult = await loadPageWithRetry(page, listUrl, { maxRetries: 3 });
    if (!loadResult.success) return [];
    await page.waitForTimeout(2000);

    console.log('📋 게시글 목록 추출 중...');
    const jobListData = await page.evaluate((baseUrl) => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr, .board-list tr');

      rows.forEach(row => {
        if (row.querySelector('th')) return;
        const titleLink = row.querySelector('td a');
        if (!titleLink) return;

        const href = titleLink.getAttribute('href');
        const title = titleLink.textContent.trim();
        const onclick = titleLink.getAttribute('onclick');

        // bbsDocSn 추출
        let id = '';
        const snMatch = href?.match(/bbsDocSn=(\d+)/) || onclick?.match(/['"](\d+)['"]/);
        if (snMatch) id = snMatch[1];

        if (title && title.length > 5) {
          results.push({
            id,
            title,
            href: href?.startsWith('http') ? href : (href?.startsWith('/') ? baseUrl + href : href)
          });
        }
      });
      return results;
    }, baseUrl);

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);
    if (jobListData.length === 0) return [];

    const batchSize = config.crawlBatchSize || 10;
    const maxJobs = Math.min(jobListData.length, batchSize);

    for (let i = 0; i < maxJobs; i++) {
      const listInfo = jobListData[i];
      console.log(`\n  🔍 공고 ${i + 1}/${maxJobs}: ${listInfo.title.substring(0, 50)}...`);

      try {
        if (listInfo.href) {
          await page.goto(listInfo.href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        } else {
          // onclick 기반인 경우 클릭으로 이동
          continue;
        }
        await page.waitForTimeout(1500);

        const detailData = await page.evaluate(() => {
          let content = '';
          const selectors = ['.view-content', '.content', '.board-view', '.bbs_view'];
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
          organization: '강원특별자치도교육청',
          title: listInfo.title,
          tags: ['구인'],
          location: '강원특별자치도',
          sourceUrl: listInfo.href || listUrl,
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

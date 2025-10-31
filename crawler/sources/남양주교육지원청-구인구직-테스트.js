import { loadPage, getTextBySelectors, getAttributeBySelectors, resolveUrl } from '../lib/playwright.js';

/**
 * 남양주교육지원청 구인구직 테스트 크롤러 (AI 생성)
 * Generated at 2025-10-31T09:48:06.617Z
 */
export async function crawl남양주교육지원청구인구직테스트(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  // AI가 추출한 셀렉터
  const aiSelectors = {
  "listContainer": "table",
  "rows": "tbody tr",
  "title": "td.ta_l a",
  "date": "td:nth-child(5)",
  "link": "td.ta_l a"
};

  // Fallback 셀렉터 (AI 셀렉터 우선, 실패 시 범용 셀렉터 시도)
  const fallbackSelectors = {
    listContainer: [
      aiSelectors.listContainer,
      'table.board-list',
      '.board_list',
      '.tbl_list',
      'table',
      'ul'
    ].filter(Boolean),
    rows: [
      aiSelectors.rows,
      'tbody tr',
      'table tr',
      'ul li',
      '.list-item'
    ].filter(Boolean),
    title: [
      aiSelectors.title,
      '.subject a',
      '.title a',
      'a.subject',
      'td a'
    ].filter(Boolean),
    date: [
      aiSelectors.date,
      '.date',
      'td:nth-child(3)',
      '.reg-date'
    ].filter(Boolean),
    link: [
      aiSelectors.link,
      'a[href]'
    ].filter(Boolean)
  };

  const waitSelectors = fallbackSelectors.listContainer.join(', ');

  // 1. 목록 페이지 로딩
  await loadPage(page, config.baseUrl, waitSelectors);

  const jobs = [];

  try {
    // 2. 공고 목록 추출
    const rows = await page.$$(fallbackSelectors.rows[0]);

    if (rows.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');
      return [];
    }

    console.log(`📋 발견된 공고 수: ${rows.length}개`);

    // 3. 각 행에서 데이터 추출
    const batchSize = config.crawlBatchSize || 10;
    const maxRows = Math.min(rows.length, batchSize);

    for (let i = 0; i < maxRows; i++) {
      try {
        const currentRows = await page.$$(fallbackSelectors.rows[0]);
        if (i >= currentRows.length) {
          console.warn(`  ⚠️  행 ${i + 1} 찾을 수 없음`);
          continue;
        }

        const row = currentRows[i];

        console.log(`\n  🔍 행 ${i + 1} 처리 중:`);

        // 제목 추출
        const title = await getTextBySelectors(row, fallbackSelectors.title.join(','));
        console.log(`     제목: "${title}"`);

        // 날짜 추출
        const date = await getTextBySelectors(row, fallbackSelectors.date.join(','));
        console.log(`     날짜: "${date}"`);

        // 링크 추출
        const href = await getAttributeBySelectors(row, fallbackSelectors.link.join(','), 'href');
        if (!href) {
          console.warn(`     링크 없음, 건너뜀`);
          continue;
        }

        const absoluteLink = resolveUrl(config.baseUrl, href);
        console.log(`     링크: ${absoluteLink}`);

        // 상세 페이지 크롤링
        console.log(`     상세 페이지 접속 중...`);
        await page.goto(absoluteLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // 본문 추출
        const content = await page.evaluate(() => {
          const contentEl = document.querySelector('.view-content, .content, .detail, .board-view, .board_view');
          return contentEl ? contentEl.textContent?.trim() : '';
        });

        // 첨부파일 추출
        const attachmentUrl = await page.evaluate(() => {
          const link = document.querySelector('a[href*="download"], a[href*="attach"], a[href*="file"]');
          return link ? link.getAttribute('href') : null;
        });

        // 스크린샷 캡처
        const screenshot = await page.screenshot({
          fullPage: true,
          type: 'png'
        });
        const screenshotBase64 = screenshot.toString('base64');

        jobs.push({
          title: title || '제목 없음',
          date: date || '날짜 없음',
          link: absoluteLink,
          detailContent: content || '',
          attachmentUrl: attachmentUrl ? resolveUrl(absoluteLink, attachmentUrl) : null,
          screenshotBase64: screenshotBase64
        });

        console.log(`  ✅ ${i + 1}. 완료`);

        // 목록 페이지로 돌아가기
        if (i < maxRows - 1) {
          console.log(`     목록으로 돌아가는 중...`);
          await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1000);
        }

      } catch (error) {
        console.warn(`  ⚠️  행 ${i + 1} 파싱 실패: ${error.message}`);
      }
    }

  } catch (error) {
    console.error(`❌ 크롤링 실패: ${error.message}`);
    throw error;
  }

  console.log(`\n✅ 크롤링 완료: ${jobs.length}개 수집`);
  return jobs;
}

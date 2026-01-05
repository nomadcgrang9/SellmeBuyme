
/**
 * 광주광역시교육청 크롤러
 */
export async function crawlGwangju(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);

    // 헤더 설정 (봇 탐지 방지)
    await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    let jobs = [];

    try {
        const cutoffDate = getCutoffDate();
        console.log(`📅 수집 기준: ${cutoffDate.toISOString().split('T')[0]} 이후 데이터`);

        // Phase 1: 목록 수집
        const collectedItems = [];
        let stopCrawling = false;
        let pageNum = 1;
        const maxPages = 10;

        while (!stopCrawling && pageNum <= maxPages) {
            console.log(`📄 목록 페이지 ${pageNum} 접근 중...`);
            const listUrl = `${config.baseUrl}&page=${pageNum}`;
            await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

            const rows = await page.$$('table tbody tr');
            if (rows.length === 0) break;

            let validItemsInPage = 0;

            for (const row of rows) {
                const columns = await row.$$('td');
                if (columns.length < 5) continue;

                const numText = await columns[0].textContent().then(t => t.trim());
                const titleText = await columns[2].innerText().then(t => t.trim());
                const dateText = await columns[4].textContent().then(t => t.trim()); // 2025.01.02
                const linkEl = await columns[2].$('a');

                if (!titleText || !linkEl) continue;
                const linkHref = await linkEl.getAttribute('href');

                // 날짜 파싱
                let postDate = null;
                const dateParts = dateText.split('.');
                if (dateParts.length === 3) {
                    postDate = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
                    postDate.setHours(0, 0, 0, 0);
                }

                const isNotice = numText === '공지';

                // 날짜 필터링
                if (postDate) {
                    if (postDate < cutoffDate) {
                        if (isNotice) continue;
                        stopCrawling = true;
                        console.log(`  🛑 날짜 제한 도달 (${dateText})`);
                        continue;
                    }
                }

                // 링크 절대경로 변환
                let fullLink = linkHref;
                if (linkHref && !linkHref.startsWith('http')) {
                    fullLink = new URL(linkHref, config.baseUrl).href;
                }

                collectedItems.push({
                    title: titleText,
                    date: dateText.replace(/\./g, '-'),
                    link: fullLink,
                    schoolName: "광주광역시교육청",
                });
                validItemsInPage++;
            }

            if (validItemsInPage === 0 && stopCrawling) break;
            pageNum++;
        }

        console.log(`✅ Phase 1 완료: 총 ${collectedItems.length}개 링크 식별`);

        // Phase 2: 상세 수집
        const batchSize = config.crawlBatchSize || 10;
        // 최대 batchSize만큼만 처리하도록 제한 (또는 전체 처리)
        // 여기서는 전체 처리를 하되, 필요시 slice
        for (const item of collectedItems) {
            console.log(`  🔍 상세 크롤링: ${item.title}`);
            try {
                const detailData = await crawlDetailPage(page, item.link);
                jobs.push({
                    ...item,
                    ...detailData,
                    location: config.region
                });
                await page.waitForTimeout(500);
            } catch (e) {
                console.error(`  ⚠️ 상세 수집 실패 (${item.title}): ${e.message}`);
            }
        }

    } catch (error) {
        console.error(`❌ 크롤링 치명적 오류: ${error.message}`);
        throw error;
    }

    return jobs;
}

function getCutoffDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mode = process.env.CRAWL_MODE || 'initial';

    // test 모드: 날짜 필터 없음
    if (mode === 'test') {
        return new Date('2020-01-01');
    }

    // daily 모드: 오늘만, initial 모드: 2일 전부터
    const daysToSubtract = (mode === 'daily') ? 0 : 2;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - daysToSubtract);
    return cutoffDate;
}

async function crawlDetailPage(page, url) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

    const content = await page.evaluate(() => {
        const el = document.querySelector('.view_con') || document.querySelector('#xb_view') || document.querySelector('#board_view') || document.querySelector('.board_view');
        return el ? el.innerText.trim() : '';
    });

    const attachments = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('.file_down a, a[href*="download"]'));
        return links.map(a => ({
            name: a.innerText.trim(),
            url: a.href
        })).filter(f => f.url && f.name);
    });

    return {
        detailContent: content,
        attachments: attachments,
        attachmentUrl: attachments.length > 0 ? attachments[0].url : null,
        attachmentFilename: attachments.length > 0 ? attachments[0].name : null,
    };
}


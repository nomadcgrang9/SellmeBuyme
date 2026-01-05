
/**
 * 전북특별자치도교육청 크롤러
 */
export async function crawlJeonbuk(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
    let jobs = [];

    try {
        const cutoffDate = getCutoffDate();
        console.log(`📅 수집 기준: ${cutoffDate.toISOString().split('T')[0]}`);

        // Phase 1: 목록에서 링크만 먼저 수집
        const collectedItems = [];
        let stopCrawling = false;
        let pageNum = 1;

        while (!stopCrawling && pageNum <= 10) {
            console.log(`📄 목록 페이지 ${pageNum}...`);
            const listUrl = `${config.baseUrl}&startPage=${pageNum}`;
            await page.goto(listUrl, { waitUntil: 'domcontentloaded' });

            const rows = await page.$$('table.bbs_list_t tbody tr');
            if (rows.length === 0) break;

            for (const row of rows) {
                const columns = await row.$$('td');
                if (columns.length < 5) continue;

                const numText = await columns[0].innerText().then(t => t.trim());
                const schoolText = await columns[2].innerText().then(t => t.trim());
                const titleText = await columns[3].innerText().then(t => t.trim());
                const linkEl = await columns[2].$('a');

                if (!linkEl) continue;
                const href = await linkEl.getAttribute('href');
                const fullLink = new URL(href, config.baseUrl).href;

                collectedItems.push({
                    numText,
                    title: titleText,
                    schoolName: schoolText,
                    link: fullLink,
                    location: config.region,
                });
            }

            pageNum++;
        }

        console.log(`✅ Phase 1: ${collectedItems.length}개 링크 수집`);

        // Phase 2: 상세 페이지 수집 (날짜 필터링 포함)
        for (const item of collectedItems) {
            console.log(`  🔍 상세 확인: ${item.title}`);
            try {
                const detailData = await crawlDetailPage(page, item.link);

                if (detailData.postDate) {
                    const pd = new Date(detailData.postDate);
                    const isNotice = isNaN(parseInt(item.numText));

                    if (pd < cutoffDate) {
                        if (isNotice) continue;
                        console.log(`  🛑 날짜 초과 (${detailData.postDate}) -> 종료`);
                        break;
                    }
                }

                jobs.push({
                    ...item,
                    date: detailData.postDate,
                    ...detailData
                });

                await page.waitForTimeout(300);
            } catch (e) {
                console.warn(`  ⚠️ 상세 수집 실패 (${item.title}): ${e.message}`);
            }
        }

    } catch (e) {
        console.error(e);
        throw e;
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
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const postDate = await page.evaluate(() => {
            // 먼저 기존 방식 시도
            const dds = Array.from(document.querySelectorAll('.board_view_info dd'));
            for (const dd of dds) {
                if (dd.innerText.includes('작성일')) {
                    const match = dd.innerText.match(/\d{4}-\d{2}-\d{2}/);
                    if (match) return match[0];
                }
            }
            // .bbs_view 본문에서 작성일 패턴 찾기
            const view = document.querySelector('.bbs_view');
            if (view) {
                const text = view.innerText;
                const regDateMatch = text.match(/작성일\s*:?\s*(\d{4}-\d{2}-\d{2})/);
                if (regDateMatch) return regDateMatch[1];
            }
            return null;
        });

        const content = await page.evaluate(() => {
            const el = document.querySelector('.bbs_view') || document.querySelector('.board_view_con');
            return el ? el.innerText.trim() : '';
        });

        const attachments = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.file_down a, .view_file a, a[href*="download"]')).map(a => ({
                name: a.innerText.trim(),
                url: a.href
            })).filter(a => a.name && a.url);
        });

        return {
            postDate,
            detailContent: content,
            attachments,
            attachmentUrl: attachments[0]?.url,
            attachmentFilename: attachments[0]?.name || null
        };
    } catch { return {}; }
}



/**
 * 전라남도교육청 크롤러
 */
export async function crawlJeonnam(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
    let jobs = [];

    try {
        const cutoffDate = getCutoffDate();
        console.log(`📅 수집 기준: ${cutoffDate.toISOString().split('T')[0]}`);

        // Phase 1: 목록
        const collectedItems = [];
        let stopCrawling = false;
        let pageIndex = 1;

        while (!stopCrawling && pageIndex <= 10) {
            console.log(`📄 페이지 ${pageIndex}...`);
            const listUrl = `${config.baseUrl}&pageIndex=${pageIndex}`;
            await page.goto(listUrl, { waitUntil: 'domcontentloaded' });

            const rows = await page.$$('.bbs_ListA table tbody tr');
            if (rows.length === 0) break;

            for (const row of rows) {
                const tds = await row.$$('td');
                let dateText = '';
                let titleText = '';
                let linkHref = '';

                for (const td of tds) {
                    const text = await td.innerText().then(t => t.trim());
                    if (/^\d{4}\.\d{2}\.\d{2}$/.test(text)) {
                        dateText = text;
                    }
                    const a = await td.$('a.nttInfoBtn');
                    if (a) {
                        titleText = await a.innerText().then(t => t.trim());
                        linkHref = await a.getAttribute('href');

                        const dataId = await a.getAttribute('data-id');
                        if (dataId) {
                            linkHref = new URL(config.baseUrl).pathname.replace('selectNttList', 'selectNttInfo') + `?mi=265&bbsId=117&nttSn=${dataId}`;
                        } else {
                            const onclick = await a.getAttribute('onclick');
                            const match = onclick?.match(/fn_egov_select_noticeView\('(\d+)'\)/) || onclick?.match(/\d+/);
                            if (match) {
                                const nttSn = match[1] || match[0];
                                linkHref = `https://www.jne.go.kr/main/na/ntt/selectNttInfo.do?mi=265&bbsId=117&nttSn=${nttSn}`;
                            }
                        }
                    }
                }

                if (!dateText || !linkHref) continue;

                const pd = new Date(dateText.replace(/\./g, '-'));
                pd.setHours(0, 0, 0, 0);

                const numText = await tds[0].innerText().then(t => t.trim());
                const isNotice = isNaN(parseInt(numText));

                if (pd < cutoffDate) {
                    if (isNotice) continue;
                    stopCrawling = true;
                    console.log(`  🛑 날짜 초과 (${dateText})`);
                    break;
                }

                collectedItems.push({
                    title: titleText,
                    date: dateText.replace(/\./g, '-'),
                    link: linkHref.startsWith('http') ? linkHref : new URL(linkHref, config.baseUrl).href,
                    schoolName: "전라남도교육청"
                });
            }

            if (stopCrawling) break;
            pageIndex++;
        }

        console.log(`✅ Phase 1: ${collectedItems.length}개 발견`);

        // Phase 2
        for (const item of collectedItems) {
            console.log(`  🔍 ${item.title}`);
            const detailData = await crawlDetailPage(page, item.link);
            jobs.push({
                ...item,
                ...detailData,
                location: config.region
            });
            await page.waitForTimeout(500);
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
    const daysToSubtract = (mode === 'daily') ? 1 : 2;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - daysToSubtract);
    return cutoffDate;
}

async function crawlDetailPage(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const content = await page.evaluate(() => {
            const el = document.querySelector('.view_con');
            return el ? el.innerText.trim() : '';
        });
        const attachments = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.file_list a')).map(a => ({
                name: a.innerText.trim(),
                url: a.href
            }));
        });
        return {
            detailContent: content,
            attachments,
            attachmentUrl: attachments[0]?.url,
            attachmentFilename: attachments[0]?.name || null
        };
    } catch { return {}; }
}


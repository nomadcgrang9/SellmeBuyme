import { chromium } from 'playwright';
import { supabase } from '../lib/supabase.js';
import { fileURLToPath } from 'url';

const config = {
    name: "전북특별자치도교육청",
    baseUrl: "https://www.jbe.go.kr/index.jbe?menuCd=DOM_000000103004006000",
    detailBaseUrl: "https://www.jbe.go.kr/board/view.jbe?boardId=BBS_0000130&menuCd=DOM_000000103004006000",
    region: "전북",
};

function getCutoffDate() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mode = process.env.CRAWL_MODE || 'initial';
    const daysToSubtract = (mode === 'daily') ? 1 : 2;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - daysToSubtract);
    return cutoffDate;
}

export async function crawl() {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    let jobs = [];

    try {
        const cutoffDate = getCutoffDate();
        console.log(`📅 수집 기준: ${cutoffDate.toISOString().split('T')[0]}`);

        let stopCrawling = false;
        let pageNum = 1;

        while (!stopCrawling && pageNum <= 10) {
            console.log(`📄 목록 페이지 ${pageNum}...`);
            const listUrl = `${config.baseUrl}&startPage=${pageNum}`;
            await page.goto(listUrl, { waitUntil: 'domcontentloaded' });

            const rows = await page.$$('table.board_list tbody tr');
            if (rows.length === 0) break;

            let validInPage = 0;

            for (const row of rows) {
                const columns = await row.$$('td');
                if (columns.length < 5) continue;

                const numText = await columns[0].innerText().then(t => t.trim());
                const titleText = await columns[1].innerText().then(t => t.trim());
                const schoolText = await columns[2].innerText().then(t => t.trim());
                const linkEl = await columns[1].$('a');

                if (!linkEl) continue;
                const href = await linkEl.getAttribute('href');

                const fullLink = new URL(href, config.baseUrl).href;

                console.log(`  🔍 상세 확인: ${titleText}`);
                const detailData = await crawlDetailPage(page, fullLink);

                if (detailData.postDate) {
                    const pd = new Date(detailData.postDate);
                    const isNotice = isNaN(parseInt(numText));

                    if (pd < cutoffDate) {
                        if (isNotice) continue;
                        console.log(`  🛑 날짜 초과 (${detailData.postDate}) -> 종료`);
                        stopCrawling = true;
                        break;
                    }
                }

                jobs.push({
                    title: titleText,
                    schoolName: schoolText,
                    link: fullLink,
                    location: config.region,
                    date: detailData.postDate,
                    ...detailData
                });
                validInPage++;

                await page.waitForTimeout(300);
            }

            if (stopCrawling) break;
            pageNum++;
        }

    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
    return jobs;
}

async function crawlDetailPage(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        const postDate = await page.evaluate(() => {
            const dds = Array.from(document.querySelectorAll('.board_view_info dd'));
            for (const dd of dds) {
                if (dd.innerText.includes('작성일')) {
                    const match = dd.innerText.match(/\d{4}-\d{2}-\d{2}/);
                    return match ? match[0] : null;
                }
            }
            return null;
        });

        const content = await page.evaluate(() => {
            const el = document.querySelector('.board_view_con');
            return el ? el.innerText.trim() : '';
        });

        const attachments = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.file_down a, .view_file a')).map(a => ({
                name: a.innerText.trim(),
                url: a.href
            }));
        });

        return {
            postDate,
            detailContent: content,
            attachments,
            attachmentUrl: attachments[0]?.url
        };
    } catch { return {}; }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    (async () => {
        const results = await crawl();
        if (results.length > 0) {
            const { error } = await supabase.from('job_postings').upsert(results, { onConflict: 'link' });
            if (error) console.error('DB Save Failed:', error);
            else console.log(`Saved ${results.length} items`);
        }
    })();
}

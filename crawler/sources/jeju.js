import { chromium } from 'playwright';
import { supabase } from '../lib/supabase.js';
import { fileURLToPath } from 'url';

const config = {
    name: "제주특별자치도교육청",
    baseUrl: "https://www.jje.go.kr/board/list.jje?boardId=BBS_0000002&menuCd=DOM_000000103003002003",
    region: "제주",
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
        console.log(`📅 수집 기준: ${cutoffDate.toISOString().split('T')[0]} 이후`);

        // Phase 1: 목록 수집
        const collectedItems = [];
        let stopCrawling = false;
        let pageNum = 1;
        const maxPages = 10;

        while (!stopCrawling && pageNum <= maxPages) {
            console.log(`📄 목록 페이지 ${pageNum} 접근...`);
            const listUrl = pageNum === 1 ? config.baseUrl : `${config.baseUrl}&startPage=${pageNum}`;
            await page.goto(listUrl, { waitUntil: 'domcontentloaded' });

            const rows = await page.$$('table tbody tr');
            if (rows.length === 0) break;

            for (const row of rows) {
                const columns = await row.$$('td');
                if (columns.length < 5) continue;

                const numText = await columns[0].innerText().then(t => t.trim());
                const titleText = await columns[1].innerText().then(t => t.trim());
                const dateText = await columns[4].innerText().then(t => t.trim()); // 2025-01-02
                const linkEl = await columns[1].$('a');

                if (!linkEl) continue;
                const linkHref = await linkEl.getAttribute('href');

                // 날짜
                let postDate = new Date(dateText);
                postDate.setHours(0, 0, 0, 0);

                const isNotice = numText === '공지';

                if (postDate) {
                    if (postDate < cutoffDate) {
                        if (isNotice) continue;
                        stopCrawling = true;
                        console.log(`  🛑 날짜 제한 (${dateText})`);
                        continue;
                    }
                }

                // 링크 복원
                let fullLink = linkHref;
                if (fullLink && !fullLink.startsWith('http')) {
                    if (fullLink.startsWith('javascript')) {
                        // javascript:view('1234') 형태라면 어렵지만, 보통 dataSid가 URL에 있거나 함.
                        // 제주교육청은 href에 javascript: 처리를 많이 함.
                        // 만약 href="javascript:void(0);" 이고 onclick="..."
                        // 여기선 일단 href가 유효한 경우만 처리하거나,
                        // dataSid 추출을 시도해야 함.
                        // 제주교육청 소스 확인결과: <a href="/board/view.jje?..." ...> 형태가 많음.
                    } else {
                        fullLink = new URL(linkHref, "https://www.jje.go.kr/board/list.jje").href;
                    }
                }

                collectedItems.push({
                    title: titleText,
                    date: dateText,
                    link: fullLink,
                    schoolName: "제주특별자치도교육청",
                });
            }

            if (stopCrawling) break;
            pageNum++;
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
    } finally {
        await browser.close();
    }
    return jobs;
}

async function crawlDetailPage(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        const content = await page.evaluate(() => {
            const el = document.querySelector('.board_view_con') || document.querySelector('.view_content');
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

import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 전북특별자치도교육청 크롤러
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 중복된 것만 제외 (source_url 기준)
 */
export async function crawlJeonbuk(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
    let jobs = [];
    let skippedCount = 0;

    try {
        // Phase 1: 목록 1페이지에서 링크 수집
        const collectedItems = [];

        console.log(`📄 목록 페이지 1 크롤링...`);
        const listUrl = `${config.baseUrl}&startPage=1`;
        await page.goto(listUrl, { waitUntil: 'domcontentloaded' });

        const rows = await page.$$('table.bbs_list_t tbody tr');

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

        console.log(`✅ Phase 1: ${collectedItems.length}개 링크 수집 (1페이지)`);

        // Phase 2: 상세 페이지 수집 (중복만 제외)
        for (const item of collectedItems) {
            // 중복 체크 (source_url 기준)
            const existing = await getExistingJobBySource(item.link);
            if (existing) {
                skippedCount++;
                continue;
            }

            console.log(`  🔍 상세 확인: ${item.title}`);
            try {
                const detailData = await crawlDetailPage(page, item.link);

                jobs.push({
                    ...item,
                    date: detailData.postDate || new Date().toISOString().split('T')[0],
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

    console.log(`\n✅ ${config.name} 크롤링 완료`);
    console.log(`   - 신규: ${jobs.length}개`);
    console.log(`   - 중복 스킵: ${skippedCount}개\n`);

    return jobs;
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


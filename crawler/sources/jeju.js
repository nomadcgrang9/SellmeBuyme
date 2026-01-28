import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 제주특별자치도교육청 크롤러
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 중복된 것만 제외 (source_url 기준)
 */
export async function crawlJeju(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
    let jobs = [];
    let skippedCount = 0;

    try {
        // Phase 1: 목록 1페이지 수집
        const collectedItems = [];

        console.log(`📄 목록 페이지 1 크롤링...`);
        const listUrl = config.baseUrl;
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const rows = await page.$$('table tbody tr');

        for (const row of rows) {
            const columns = await row.$$('td');
            if (columns.length < 5) continue;

            const numText = await columns[0].innerText().then(t => t.trim());
            const titleText = await columns[1].innerText().then(t => t.trim());
            const schoolName = await columns[2].innerText().then(t => t.trim());
            const dateText = await columns[3].innerText().then(t => t.trim());
            const linkEl = await columns[1].$('a');

            if (!linkEl) continue;
            const linkHref = await linkEl.getAttribute('href');

            // 링크 복원
            let fullLink = linkHref;
            if (fullLink && !fullLink.startsWith('http')) {
                if (fullLink.startsWith('javascript')) {
                    const detailUrlTemplate = config.detailUrlTemplate || "https://www.jje.go.kr/board/view.jje?boardId=BBS_0000002&menuCd=DOM_000000103003002003&dataSid=";
                    const regex = /dataSid=([0-9]+)/;
                    const match = fullLink.match(regex);
                    if (match) {
                        fullLink = detailUrlTemplate + match[1];
                    } else {
                        const onclick = await linkEl.getAttribute('onclick');
                        const matchClick = onclick?.match(/dataSid=([0-9]+)/);
                        if (matchClick) {
                            fullLink = detailUrlTemplate + matchClick[1];
                        }
                    }
                } else {
                    fullLink = new URL(linkHref, "https://www.jje.go.kr/board/list.jje").href;
                }
            }

            if (fullLink && fullLink.startsWith('javascript')) {
                console.warn(`  ⚠️ 링크 파싱 실패: ${titleText}`);
                continue;
            }

            collectedItems.push({
                title: titleText,
                date: dateText,
                link: fullLink,
                schoolName: schoolName || "제주특별자치도교육청",
            });
        }

        console.log(`✅ Phase 1: ${collectedItems.length}개 발견 (1페이지)`);

        // SAFETY 설정 (150/15/0.8/10 통일)
        const SAFETY = {
            maxItems: 150,                // 절대 최대 수집 개수
            consecutiveDuplicateLimit: 10, // 연속 중복 시 즉시 중단
        };

        let processedCount = 0;
        let consecutiveDuplicates = 0;

        // Phase 2: 상세 페이지 수집 (중복만 제외)
        for (const item of collectedItems) {
            // 안전장치: 최대 개수
            if (processedCount >= SAFETY.maxItems) {
                console.log(`  ⚠️ 최대 수집 개수(${SAFETY.maxItems}) 도달`);
                break;
            }
            // 중복 체크 (source_url 기준)
            const existing = await getExistingJobBySource(item.link);
            if (existing) {
                skippedCount++;
                consecutiveDuplicates++;
                // 연속 중복 한계 도달 시 중단
                if (consecutiveDuplicates >= SAFETY.consecutiveDuplicateLimit) {
                    console.log(`  ⚠️ 연속 중복 ${SAFETY.consecutiveDuplicateLimit}개 도달 - 크롤링 종료`);
                    break;
                }
                continue;
            }

            // 신규 항목 발견 시 연속 중복 카운터 리셋
            consecutiveDuplicates = 0;
            processedCount++;

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

    console.log(`\n✅ ${config.name} 크롤링 완료`);
    console.log(`   - 신규: ${jobs.length}개`);
    console.log(`   - 중복 스킵: ${skippedCount}개\n`);

    return jobs;
}

async function crawlDetailPage(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        const content = await page.evaluate(() => {
            const el = document.querySelector('.boardViewWrap') || document.querySelector('.board_view_con') || document.querySelector('.view_content');
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


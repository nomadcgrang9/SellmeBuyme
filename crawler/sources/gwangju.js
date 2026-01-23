import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 광주광역시교육청 크롤러
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 중복된 것만 제외 (source_url 기준)
 */
export async function crawlGwangju(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);

    // 헤더 설정 (봇 탐지 방지)
    await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    let jobs = [];
    let skippedCount = 0;

    try {
        // Phase 1: 목록 1페이지 수집
        const collectedItems = [];

        console.log(`📄 목록 페이지 1 크롤링...`);
        const listUrl = `${config.baseUrl}&page=1`;
        await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const rows = await page.$$('table tbody tr');

        for (const row of rows) {
            const columns = await row.$$('td');
            if (columns.length < 5) continue;

            const numText = await columns[0].textContent().then(t => t.trim());
            const titleText = await columns[2].innerText().then(t => t.trim());
            const dateText = await columns[4].textContent().then(t => t.trim());
            const linkEl = await columns[2].$('a');

            if (!titleText || !linkEl) continue;
            const linkHref = await linkEl.getAttribute('href');

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
        }

        console.log(`✅ Phase 1 완료: ${collectedItems.length}개 링크 식별 (1페이지)`);

        // SAFETY 설정 (150/15/0.8/10 통일)
        const SAFETY = {
            maxItems: 150,                // 절대 최대 수집 개수
            consecutiveDuplicateLimit: 10, // 연속 중복 시 즉시 중단
        };

        let processedCount = 0;
        let consecutiveDuplicates = 0;

        // Phase 2: 상세 수집 (중복만 제외)
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

    console.log(`\n✅ ${config.name} 크롤링 완료`);
    console.log(`   - 신규: ${jobs.length}개`);
    console.log(`   - 중복 스킵: ${skippedCount}개\n`);

    return jobs;
}

async function crawlDetailPage(page, url) {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

    // 상세 정보 추출 (마감일 포함)
    const detailInfo = await page.evaluate(() => {
        const result = {
            deadline: null,
            organization: null,
        };

        // dt/dd 또는 th/td 패턴에서 마감일 추출
        const terms = document.querySelectorAll('dt, th, .info_tit');
        terms.forEach(term => {
            const label = term.textContent?.trim() || '';
            const next = term.nextElementSibling;
            const value = next?.textContent?.trim() || '';

            if (label.includes('마감') || label.includes('접수기간') || label.includes('모집기간')) {
                result.deadline = value;
            }
            if (label.includes('기관') || label.includes('학교') || label.includes('작성자')) {
                result.organization = value;
            }
        });

        // 테이블 형태에서도 시도
        const rows = document.querySelectorAll('table tr');
        rows.forEach(row => {
            const th = row.querySelector('th');
            const td = row.querySelector('td');
            if (!th || !td) return;

            const label = th.textContent?.trim() || '';
            const value = td.textContent?.trim() || '';

            if (label.includes('마감') || label.includes('접수기간') || label.includes('모집기간')) {
                result.deadline = value;
            }
        });

        return result;
    });

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
        deadline: detailInfo.deadline,
        organization: detailInfo.organization,
    };
}


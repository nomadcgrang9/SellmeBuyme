
/**
 * 제주특별자치도교육청 크롤러
 */
export async function crawlJeju(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
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
                const schoolName = await columns[2].innerText().then(t => t.trim()); // 학교명 (Column index 2)
                const dateText = await columns[3].innerText().then(t => t.trim()); // 날짜 (Column index 3)
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
                        const detailUrlTemplate = config.detailUrlTemplate || "https://www.jje.go.kr/board/view.jje?boardId=BBS_0000002&menuCd=DOM_000000103003002003&dataSid=";
                        // 정규식으로 dataSid 등 추출 시도 (Sources.json에 regex가 있을 수도 있으나 여기서는 hardcoded logic 사용 가능)
                        // 제주 js 파일에서 regex를 가져오거나, href에서 추출 시도
                        // 간단히 onclick이나 href에서 숫자 추출
                        const regex = /dataSid=([0-9]+)/;
                        const match = fullLink.match(regex);
                        if (match) {
                            fullLink = detailUrlTemplate + match[1];
                        } else {
                            // href가 javascript면 onclick 확인 필요
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

                // 만약 여전히 javascript라면 스킵 (실패)
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


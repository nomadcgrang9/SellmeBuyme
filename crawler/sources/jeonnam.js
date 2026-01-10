
/**
 * 전라남도교육청 크롤러
 */
export async function crawlJeonnam(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
    let jobs = [];

    const mode = process.env.CRAWL_MODE || 'initial';

    try {
        const cutoffDate = getCutoffDate();
        console.log(`📅 수집 기준: ${cutoffDate.toISOString().split('T')[0]} (mode: ${mode})`);

        // Phase 1: 목록 수집
        const collectedItems = [];
        let stopCrawling = false;
        let pageIndex = 1;

        while (!stopCrawling && pageIndex <= 10) {
            console.log(`📄 페이지 ${pageIndex}...`);
            const listUrl = `${config.baseUrl}&currPage=${pageIndex}`;
            await page.goto(listUrl, { waitUntil: 'domcontentloaded' });

            // 목록 데이터 추출
            const items = await page.$$eval('table tbody tr', (rows) => {
                return rows.map(row => {
                    const cells = row.querySelectorAll('td');
                    const link = row.querySelector('a.nttInfoBtn');
                    return {
                        num: cells[0]?.innerText.trim(),
                        title: link?.innerText.trim().replace(/^N\s*/, ''),
                        org: cells[3]?.innerText.trim(),
                        regDate: cells[4]?.innerText.trim(),
                        dataId: link?.getAttribute('data-id')
                    };
                });
            });

            if (items.length === 0) break;

            for (const item of items) {
                if (!item.dataId || !item.regDate) continue;

                // 날짜 파싱
                const dateText = item.regDate.replace(/\./g, '-');
                const pd = new Date(dateText);
                pd.setHours(0, 0, 0, 0);

                const isNotice = isNaN(parseInt(item.num));

                // 날짜 필터링
                if (pd < cutoffDate) {
                    if (isNotice) continue;
                    stopCrawling = true;
                    console.log(`  🛑 날짜 초과 (${item.regDate})`);
                    break;
                }

                // test 모드에서는 날짜 제한 없이 수집
                if (mode === 'test' && collectedItems.length >= 3) {
                    stopCrawling = true;
                    break;
                }

                const detailUrl = `https://www.jne.go.kr/main/na/ntt/selectNttInfo.do?mi=265&bbsId=117&nttSn=${item.dataId}`;

                collectedItems.push({
                    title: item.title,
                    date: dateText,
                    link: detailUrl,
                    schoolName: item.org || "전라남도교육청"
                });
            }

            if (stopCrawling) break;
            pageIndex++;
        }

        console.log(`✅ Phase 1: ${collectedItems.length}개 발견`);

        // Phase 2: 상세 페이지 수집
        for (const item of collectedItems) {
            console.log(`  🔍 ${item.title.substring(0, 40)}...`);
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

    // test 모드: 날짜 제한 없이
    if (mode === 'test') {
        const farPast = new Date('2000-01-01');
        return farPast;
    }

    // daily 모드: 당일만, initial 모드: 2일 전부터
    const daysToSubtract = (mode === 'daily') ? 0 : 2;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - daysToSubtract);
    return cutoffDate;
}

async function crawlDetailPage(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        // 본문 내용 추출 (.bbs_ViewA 내의 본문 영역)
        const content = await page.evaluate(() => {
            // 본문 영역 찾기 - 여러 셀렉터 시도
            const viewArea = document.querySelector('.bbs_ViewA');
            if (!viewArea) return '';

            // 본문 텍스트 추출 (헤더 정보 제외)
            const textContent = viewArea.innerText || '';
            return textContent.trim();
        });

        // 첨부파일 추출 - xFreeUploader 방식
        const attachments = await page.evaluate(() => {
            const files = [];

            // dd 태그에서 첨부파일 정보 찾기
            const ddElements = document.querySelectorAll('dd');
            for (const dd of ddElements) {
                const text = dd.innerText || '';
                // .hwp, .pdf, .xlsx 등 파일 확장자 패턴 확인
                if (/\.(hwp|pdf|xlsx?|docx?|pptx?|zip|hwpx)/i.test(text)) {
                    const previewLink = dd.querySelector('a');
                    if (previewLink) {
                        const onclick = previewLink.getAttribute('onclick') || '';
                        const fileIdMatch = onclick.match(/fileView\('([^']+)'\)/);
                        const fileId = fileIdMatch ? fileIdMatch[1] : null;

                        // 파일명 추출 (( 0회 ) 같은 다운로드 횟수 제거)
                        const fileName = text.replace(/\s*\(\s*\d+회\s*\)\s*미리보기/g, '').trim();

                        if (fileName && fileId) {
                            files.push({
                                name: fileName,
                                fileId: fileId,
                                url: `https://www.jne.go.kr/main/na/ntt/commonFileDown.do?fileId=${fileId}`
                            });
                        }
                    }
                }
            }

            return files;
        });

        return {
            detailContent: content,
            attachments,
            attachmentUrl: attachments[0]?.url || null,
            attachmentFilename: attachments[0]?.name || null
        };
    } catch (e) {
        console.error(`상세 페이지 에러: ${e.message}`);
        return {};
    }
}

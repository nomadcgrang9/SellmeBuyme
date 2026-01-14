import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 전라남도교육청 크롤러
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 중복된 것만 제외 (source_url 기준)
 */
export async function crawlJeonnam(page, config) {
    console.log(`\n📍 ${config.name} 크롤링 시작`);
    let jobs = [];
    let skippedCount = 0;

    try {
        // Phase 1: 목록 1페이지 수집
        const collectedItems = [];

        console.log(`📄 페이지 1 크롤링...`);
        const listUrl = `${config.baseUrl}&currPage=1`;
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

        for (const item of items) {
            if (!item.dataId) continue;

            const dateText = item.regDate ? item.regDate.replace(/\./g, '-') : '';
            const detailUrl = `https://www.jne.go.kr/main/na/ntt/selectNttInfo.do?mi=265&bbsId=117&nttSn=${item.dataId}`;

            collectedItems.push({
                title: item.title,
                date: dateText,
                link: detailUrl,
                schoolName: item.org || "전라남도교육청"
            });
        }

        console.log(`✅ Phase 1: ${collectedItems.length}개 발견 (1페이지)`);

        // Phase 2: 상세 페이지 수집 (중복만 제외)
        for (const item of collectedItems) {
            // 중복 체크 (source_url 기준)
            const existing = await getExistingJobBySource(item.link);
            if (existing) {
                skippedCount++;
                continue;
            }

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

    console.log(`\n✅ ${config.name} 크롤링 완료`);
    console.log(`   - 신규: ${jobs.length}개`);
    console.log(`   - 중복 스킵: ${skippedCount}개\n`);

    return jobs;
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

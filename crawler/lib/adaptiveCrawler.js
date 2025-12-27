
import { normalizeJobData } from './gemini.js';
import { logInfo, logError, logDebug } from './logger.js';

/**
 * 범용 적응형 크롤러 (Adaptive Crawler)
 * 설정 파일(sources.json)의 규칙에 따라 자동으로 데이터를 파싱합니다.
 */
export async function crawlAdaptive(page, config) {
    logInfo('crawler', `[${config.region}] 적응형 크롤링 시작`, { url: config.baseUrl });

    await page.goto(config.baseUrl);
    await page.waitForLoadState('networkidle');

    const harvestedItems = [];
    const selectors = config.selectors;

    // 날짜 제한: 오늘부터 14일 전까지만 수집
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 14);
    cutoffDate.setHours(0, 0, 0, 0);

    let pageNum = 1;
    let stopCrawling = false;
    const maxPages = 20; // 안전장치

    // Phase 1: 목록 순회 및 링크 수집
    logInfo('crawler', 'Phase 1: 목록 링크 수집 시작', { cutoffDate: cutoffDate.toISOString().split('T')[0] });

    while (!stopCrawling && pageNum <= maxPages) {
        logDebug('crawler', `페이지 ${pageNum} 처리 중...`);

        // 1. 리스트 컨테이너 확인
        const container = await page.$(selectors.listContainer);
        if (!container) {
            logError('crawler', `리스트 컨테이너를 찾을 수 없습니다: ${selectors.listContainer}`);
            break;
        }

        const rows = await container.$$(selectors.row);
        logDebug('crawler', `페이지 ${pageNum} 발견된 행: ${rows.length}개`);

        if (rows.length === 0) break;

        let currentPageOldestDate = null;
        let validRowsInPage = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const titleData = await extractField(row, selectors.title);
            const dateStr = await extractField(row, selectors.date);
            let linkData = await extractField(row, selectors.link);

            if (!titleData || !linkData) continue;

            // 날짜 파싱 및 검사
            let rowDate = null;
            if (dateStr) {
                // Remove whitespaces
                let cleanDate = dateStr.trim().replace(/[.\-/]+$/, '');

                // Handle "YY.MM.DD" format (2-digit year) -> Prefix 20
                if (/^\d{2}[.-]\d{2}[.-]\d{2}$/.test(cleanDate)) {
                    cleanDate = '20' + cleanDate;
                }

                // Handle standard separators
                cleanDate = cleanDate.replace(/\./g, '-').replace(/\//g, '-');

                const parsed = new Date(cleanDate);
                if (!isNaN(parsed.getTime())) {
                    // Year sanity check (ignore years like 0133 or 1999 if clearly wrong context, but here we trust source mostly)
                    // If year < 2000, it might be an issue, but let's accept for now unless it's very old.

                    // Specific fix for "0133" issue: likely MM-DD parsed as YYYY without year? 
                    // If the parsed year is suspiciously old (e.g. < 2020), assume current year if only MM-DD was provided?
                    // But usually dateStr has year. 

                    rowDate = parsed;

                    // Update oldest date logic
                    if (!currentPageOldestDate || rowDate < currentPageOldestDate) {
                        currentPageOldestDate = rowDate;
                    }
                }
            } else {
                // If date is missing, assume it's new (pass the filter)
                // But don't update currentPageOldestDate to avoid stopping early
            }

            // 날짜 필터링 (날짜가 없으면 최신으로 간주)
            if (rowDate && rowDate < cutoffDate) {
                // 날짜가 확인되었는데 너무 오래된 경우만 스킵
                // logDebug('crawler', `오래된 공고 스킵: ${titleData} (${dateStr})`);
                continue;
            }

            validRowsInPage++;

            // 링크 정규화
            let finalLink = linkData.trim();
            if (config.detailUrlTemplate && selectors.link.regex) {
                const match = linkData.match(new RegExp(selectors.link.regex));
                if (match && match[1]) {
                    finalLink = config.detailUrlTemplate + match[1];
                }
            } else if (config.detailUrlTemplate && !finalLink.startsWith('http') && !finalLink.startsWith('javascript')) {
                // ID만 추출된 경우
                finalLink = config.detailUrlTemplate + finalLink;
            }

            // URL 절대 경로 변환
            if (finalLink && !finalLink.startsWith('http') && !finalLink.startsWith('javascript')) {
                const urlObj = new URL(finalLink, config.baseUrl);
                finalLink = urlObj.href;
            }

            harvestedItems.push({
                title: titleData.trim(),
                date: dateStr ? dateStr.trim() : null,
                link: finalLink,
                region: config.region,
                isLocalGovernment: config.isLocalGovernment
            });
        }

        // 페이지 중단 조건: 현재 페이지에 유효한 글이 없고, 가장 최신 글조차 cutoff보다 오래된 경우
        if (validRowsInPage === 0 && currentPageOldestDate && currentPageOldestDate < cutoffDate) {
            logInfo('crawler', '날짜 제한 도달, 수집 중단', { lastDate: currentPageOldestDate.toISOString() });
            stopCrawling = true;
            break;
        }

        // 다음 페이지 이동 로직
        if (config.pagination && config.pagination.type === 'script') {
            try {
                const nextPageNum = pageNum + 1;
                logDebug('crawler', `다음 페이지(${nextPageNum}) 이동 시도: ${config.pagination.functionName}(${nextPageNum})`);

                await Promise.all([
                    page.waitForLoadState('networkidle'),
                    page.evaluate(`${config.pagination.functionName}(${nextPageNum})`)
                ]);

                pageNum++;
                await page.waitForTimeout(1000);
            } catch (err) {
                logError('crawler', `페이지 이동 실패: ${err.message}`);
                stopCrawling = true;
            }
        } else {
            // 페이지네이션 설정 없으면 종료
            stopCrawling = true;
        }
    }

    logInfo('crawler', `Phase 1 완료: 총 ${harvestedItems.length}개 링크 수집됨`);

    // Phase 2: 상세 페이지 크롤링
    const jobs = [];
    logInfo('crawler', 'Phase 2: 상세 페이지 크롤링 시작');

    for (let i = 0; i < harvestedItems.length; i++) {
        const item = harvestedItems[i];
        console.log(`  📄 [${i + 1}/${harvestedItems.length}] ${item.title} (${item.date || '날짜없음'})`);

        let detailData = {};
        if (item.link && !item.link.startsWith('javascript')) {
            try {
                detailData = await crawlDetailPage(page, item.link, config);
            } catch (err) {
                console.warn(`  ⚠️ 상세 페이지 로드 실패: ${item.link}`, err);
            }
        }

        jobs.push({
            ...item,
            detailContent: detailData.content || null,
            attachmentUrl: detailData.attachmentUrl || null,
            attachmentFilename: detailData.attachmentFilename || null,
            hasContentImages: detailData.hasContentImages || false,
            screenshotBase64: detailData.screenshot || null
        });
    }

    return jobs;
}


/**
 * 상세 페이지 크롤링 (본문 + 첨부파일 + 스크린샷)
 */
async function crawlDetailPage(page, detailUrl, config) {
    try {
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        // 1. 본문 내용 추출
        const content = await page.evaluate(() => {
            // 제거할 노이즈 선택자들
            const noiseSelectors = ['.skip-nav', '.header', '.footer', '.sidebar', 'nav', 'header', 'footer', '.btn-area'];
            noiseSelectors.forEach(s => document.querySelectorAll(s).forEach(el => el.remove()));

            // 본문 후보군
            const candidates = ['.board-view-content', '.view-content', '.content', '#content', 'article', '.board_view'];
            for (const selector of candidates) {
                const el = document.querySelector(selector);
                if (el) return el.innerText.trim();
            }
            return document.body.innerText.substring(0, 3000); // Fallback
        });

        // 2. 첨부파일 탐색
        let attachmentUrl = null;
        let attachmentFilename = null;

        // Config에 정의된 선택자 우선 시도
        if (config.selectors.attachment) {
            attachmentUrl = await page.evaluate((selector) => {
                const el = document.querySelector(selector);
                return el ? (el.getAttribute('href') || el.src) : null;
            }, config.selectors.attachment);
        }

        // 없으면 일반적인 패턴으로 탐색 (.hwp, .pdf 등)
        if (!attachmentUrl) {
            const fileInfo = await page.evaluate(() => {
                const extensions = ['.hwp', '.hwpx', '.pdf', '.doc', '.xlsx'];
                const links = Array.from(document.querySelectorAll('a'));

                for (const link of links) {
                    const href = link.getAttribute('href') || '';
                    if (extensions.some(ext => href.toLowerCase().includes(ext))) {
                        return { url: href, name: link.innerText.trim() };
                    }
                }
                return null;
            });
            if (fileInfo) {
                attachmentUrl = fileInfo.url;
                attachmentFilename = fileInfo.name;
            }
        }

        // 절대 경로 변환
        if (attachmentUrl && !attachmentUrl.startsWith('http')) {
            attachmentUrl = new URL(attachmentUrl, detailUrl).href;
        }

        // 3. 본문 이미지 존재 여부
        const hasContentImages = await page.evaluate(() => {
            const imgs = document.querySelectorAll('.board_view img, .content img, article img');
            return Array.from(imgs).some(img => img.width > 100 && img.height > 100);
        });

        // 4. 스크린샷
        const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
        const screenshotBase64 = screenshot.toString('base64');

        return {
            content,
            attachmentUrl,
            attachmentFilename,
            hasContentImages,
            screenshot: screenshotBase64
        };

    } catch (error) {
        console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
        return { content: '', attachmentUrl: null, screenshot: null };
    }
}

/**
 * 설정된 Selector 규칙에 따라 필드 데이터를 추출합니다.
 */
async function extractField(element, rule) {
    if (!rule) return null;

    // 문자열인 경우 단순 텍스트 추출로 간주
    if (typeof rule === 'string') {
        const target = await element.$(rule);
        return target ? await target.innerText() : null;
    }

    // 객체인 경우 상세 규칙 적용
    const targetSelector = rule.selector;
    const target = await element.$(targetSelector);
    if (!target) return null;

    if (rule.extract === 'text') {
        return await target.innerText();
    } else if (rule.extract === 'href') {
        return await target.getAttribute('href');
    } else if (rule.extract === 'onclick') {
        return await target.getAttribute('onclick');
    } else if (rule.extract === 'attribute') {
        return await target.getAttribute(rule.attributeName);
    }

    return await target.innerText();
}

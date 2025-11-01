/**
 * AI-powered crawler generator using Gemini Vision API
 * Deno version for Supabase Edge Functions
 */

import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";

interface CrawlerSelectors {
  listContainer: string;
  rows: string;
  title: string;
  date: string;
  link: string;
}

interface CrawlerConfig {
  name: string;
  url: string;
  selectors: CrawlerSelectors;
}

/**
 * Gemini Vision API로 CSS 셀렉터 추출
 */
async function extractSelectorsWithGemini(
  screenshot: Uint8Array,
  html: string,
  geminiApiKey: string
): Promise<CrawlerSelectors> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

  const prompt = `
당신은 웹 크롤링 전문가입니다. 첨부된 스크린샷과 HTML 코드를 분석하여,
게시판 목록에서 각 게시글을 추출하기 위한 CSS 셀렉터를 찾아주세요.

찾아야 할 정보:
1. listContainer: 게시글 목록을 감싸는 컨테이너 (table, ul 등)
2. rows: 각 게시글 행 (tbody tr, li 등)
3. title: 게시글 제목 텍스트
4. date: 등록 날짜
5. link: 상세 페이지로 가는 링크

**중요**:
- 응답은 반드시 유효한 JSON 형식이어야 합니다
- 마크다운 코드 블록 없이 순수 JSON만 반환
- 각 셀렉터는 가능한 구체적으로 (예: "td.ta_l a")

HTML 구조:
${html.substring(0, 10000)}

응답 형식:
{
  "listContainer": "table",
  "rows": "tbody tr",
  "title": "td.ta_l a",
  "date": "td:nth-child(5)",
  "link": "td.ta_l a"
}
`;

  const imagePart = {
    inlineData: {
      data: btoa(String.fromCharCode(...screenshot)),
      mimeType: "image/png"
    }
  };

  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text();

  // JSON 추출 (마크다운 코드 블록 제거)
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini 응답에서 JSON을 찾을 수 없습니다");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * AI가 추출한 셀렉터로 크롤러 코드 생성
 */
function generateCrawlerCodeWithAI(config: CrawlerConfig): string {
  const functionName = config.name
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z가-힣0-9]/g, '');

  const code = `import { loadPage, getTextBySelectors, getAttributeBySelectors, resolveUrl } from './lib/playwright.js';

/**
 * ${config.name} 크롤러 (AI 생성)
 * Generated at ${new Date().toISOString()}
 */
export async function crawl${functionName}(page, config) {
  console.log(\`\\n📍 \${config.name} 크롤링 시작\`);

  // AI가 추출한 셀렉터
  const aiSelectors = ${JSON.stringify(config.selectors, null, 2)};

  // Fallback 셀렉터 (AI 셀렉터 우선, 실패 시 범용 셀렉터 시도)
  const fallbackSelectors = {
    listContainer: [
      aiSelectors.listContainer,
      'table.board-list',
      '.board_list',
      '.tbl_list',
      'table',
      'ul'
    ].filter(Boolean),
    rows: [
      aiSelectors.rows,
      'tbody tr',
      'table tr',
      'ul li',
      '.list-item'
    ].filter(Boolean),
    title: [
      aiSelectors.title,
      '.subject a',
      '.title a',
      'a.subject',
      'td a'
    ].filter(Boolean),
    date: [
      aiSelectors.date,
      '.date',
      'td:nth-child(3)',
      '.reg-date'
    ].filter(Boolean),
    link: [
      aiSelectors.link,
      'a[href]'
    ].filter(Boolean)
  };

  const waitSelectors = fallbackSelectors.listContainer.join(', ');

  // 1. 목록 페이지 로딩
  const baseUrl = config.url || config.baseUrl;
  await loadPage(page, baseUrl, waitSelectors);

  const jobs = [];

  try {
    // 2. 공고 목록 추출
    const rows = await page.$$(fallbackSelectors.rows[0]);

    if (rows.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다.');
      return [];
    }

    console.log(\`📋 발견된 공고 수: \${rows.length}개\`);

    // 3. 각 행에서 데이터 추출
    const batchSize = config.crawlBatchSize || 10;
    const maxRows = Math.min(rows.length, batchSize);

    for (let i = 0; i < maxRows; i++) {
      try {
        const currentRows = await page.$$(fallbackSelectors.rows[0]);
        if (i >= currentRows.length) {
          console.warn(\`  ⚠️  행 \${i + 1} 찾을 수 없음\`);
          continue;
        }

        const row = currentRows[i];

        console.log(\`\\n  🔍 행 \${i + 1} 처리 중:\`);

        // 제목 추출
        const title = await getTextBySelectors(row, fallbackSelectors.title.join(','));
        console.log(\`     제목: "\${title}"\`);

        // 날짜 추출
        const date = await getTextBySelectors(row, fallbackSelectors.date.join(','));
        console.log(\`     날짜: "\${date}"\`);

        // 링크 추출 (data-id 속성 우선 - 한국 정부 사이트용)
        let absoluteLink;
        const nttId = await getAttributeBySelectors(row, fallbackSelectors.link.join(','), 'data-id');

        // data-id가 없으면 href로 시도
        if (!nttId) {
          const href = await getAttributeBySelectors(row, fallbackSelectors.link.join(','), 'href');
          if (!href || href.startsWith('javascript')) {
            console.warn(\`     링크 없음 (data-id와 href 모두 없음), 건너뜀\`);
            continue;
          }
          absoluteLink = resolveUrl(baseUrl, href);
        } else {
          // data-id로 상세 페이지 URL 구성
          const match = baseUrl.match(/selectNttList\\.do\\?(.+?)&bbsId=([^&]+)/);
          if (!match) {
            console.warn(\`     기본 URL 패턴을 파싱할 수 없음, 건너뜀\`);
            continue;
          }
          const params = match[1];
          const bbsId = match[2];
          absoluteLink = \`\${baseUrl.split('selectNttList.do')[0]}selectNttInfo.do?\${params}&bbsId=\${bbsId}&nttSn=\${nttId}\`;
        }
        console.log(\`     링크: \${absoluteLink}\`);

        // 상세 페이지 크롤링
        console.log(\`     상세 페이지 접속 중...\`);
        await page.goto(absoluteLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // 본문 추출 (한국 정부 사이트 셀렉터 우선, fallback 포함)
        const content = await page.evaluate(() => {
          // 우선순위 1: 일반적인 본문 셀렉터
          let contentEl = document.querySelector('.nttCn, #nttCn, .cn, .txt_area, .view_content, .view-content, .content, .detail, .board-view, .board_view');

          // 우선순위 2: 한국 교육청 사이트 컨테이너
          if (!contentEl || (contentEl.textContent?.trim().length || 0) < 50) {
            contentEl = document.querySelector('#subContent, .subContent_body, #content, .board_content');
          }

          // 우선순위 3: 전체 body (최후의 수단)
          if (!contentEl || (contentEl.textContent?.trim().length || 0) < 50) {
            contentEl = document.body;
          }

          return contentEl ? contentEl.textContent?.trim() : '';
        });

        // 첨부파일 추출
        const attachmentUrl = await page.evaluate(() => {
          const link = document.querySelector('a[href*="download"], a[href*="attach"], a[href*="file"]');
          return link ? link.getAttribute('href') : null;
        });

        // 스크린샷 캡처
        const screenshot = await page.screenshot({
          fullPage: true,
          type: 'png'
        });
        const screenshotBase64 = screenshot.toString('base64');

        jobs.push({
          organization: config.name,
          title: title || '제목 없음',
          date: date || '날짜 없음',
          link: absoluteLink,
          detailContent: content || '',
          attachmentUrl: attachmentUrl ? resolveUrl(absoluteLink, attachmentUrl) : null,
          screenshotBase64: screenshotBase64
        });

        console.log(\`  ✅ \${i + 1}. 완료\`);

        // 목록 페이지로 돌아가기
        if (i < maxRows - 1) {
          console.log(\`     목록으로 돌아가는 중...\`);
          await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1000);
        }

      } catch (error) {
        console.warn(\`  ⚠️  행 \${i + 1} 파싱 실패: \${error.message}\`);
      }
    }

  } catch (error) {
    console.error(\`❌ 크롤링 실패: \${error.message}\`);
    throw error;
  }

  console.log(\`\\n✅ 크롤링 완료: \${jobs.length}개 수집\`);
  return jobs;
}
`;

  return code;
}

/**
 * 메인 함수: Gemini Vision API를 사용한 AI 크롤러 생성
 * 최대 3번 재시도
 */
export async function generateCrawlerCodeWithAI(
  boardName: string,
  boardUrl: string,
  geminiApiKey: string,
  maxRetries = 3
): Promise<{ code: string; selectors: CrawlerSelectors }> {

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AI Crawler] 시도 ${attempt}/${maxRetries}: ${boardName}`);

      // 1. Playwright로 페이지 분석 (여기서는 단순화 - 실제로는 Playwright 필요)
      // Edge Function에서는 puppeteer-core나 playwright를 사용할 수 있음
      // 지금은 HTML만 받아서 처리하는 것으로 가정

      const response = await fetch(boardUrl);
      const html = await response.text();

      // 스크린샷은 실제로는 Playwright나 Puppeteer로 캡처해야 함
      // 여기서는 임시로 빈 배열 사용
      const screenshot = new Uint8Array(0);

      // 2. Gemini로 셀렉터 추출
      const selectors = await extractSelectorsWithGemini(screenshot, html, geminiApiKey);

      console.log(`[AI Crawler] 셀렉터 추출 성공:`, selectors);

      // 3. 크롤러 코드 생성
      const config: CrawlerConfig = {
        name: boardName,
        url: boardUrl,
        selectors
      };

      const code = generateCrawlerCodeWithAI(config);

      console.log(`[AI Crawler] 코드 생성 완료 (${code.length}자)`);

      return { code, selectors };

    } catch (error) {
      console.error(`[AI Crawler] 시도 ${attempt} 실패:`, error.message);

      if (attempt === maxRetries) {
        throw new Error(`AI 크롤러 생성 실패 (${maxRetries}번 시도): ${error.message}`);
      }

      // 재시도 전 잠시 대기
      await new Delay(2000 * attempt);
    }
  }

  throw new Error("AI 크롤러 생성 실패");
}

function Delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

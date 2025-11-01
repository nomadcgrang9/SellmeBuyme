import { chromium } from 'playwright';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface ExtractedSelectors {
  listContainer: string;
  rows: string;
  title: string;
  date: string;
  link: string;
  location?: string;
  detailContent?: string;
  attachment?: string;
}

interface CrawlerConfig {
  name: string;
  baseUrl: string;
  selectors: ExtractedSelectors;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Playwright로 페이지 열고 스크린샷 + HTML 추출
 */
async function analyzePage(url: string): Promise<{ screenshot: string; html: string }> {
  console.log(`\n📍 페이지 분석 시작: ${url}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // 페이지 로딩 대기

    console.log('  📸 스크린샷 캡처 중...');
    const screenshot = await page.screenshot({
      fullPage: false, // 목록만 보이게
      type: 'png'
    });
    const screenshotBase64 = screenshot.toString('base64');

    console.log('  📄 HTML 추출 중...');
    // body 내용만 추출, script/style 제거
    const html = await page.evaluate(() => {
      const body = document.body.cloneNode(true) as HTMLElement;

      // script, style, noscript 제거
      body.querySelectorAll('script, style, noscript').forEach(el => el.remove());

      // table 또는 ul 찾기
      const table = body.querySelector('table');
      const ul = body.querySelector('ul');

      if (table) {
        return table.outerHTML;
      } else if (ul) {
        return ul.outerHTML;
      }

      // 없으면 body 전체 (최대 10000자)
      return body.innerHTML.substring(0, 10000);
    });

    console.log(`  ✅ 분석 완료 (스크린샷: ${(screenshotBase64.length / 1024).toFixed(0)}KB, HTML: ${html.length}자)`);

    await browser.close();
    return { screenshot: screenshotBase64, html };

  } catch (error) {
    await browser.close();
    throw error;
  }
}

/**
 * Gemini API로 셀렉터 추출
 */
async function extractSelectorsWithGemini(
  screenshot: string,
  html: string,
  maxRetries = 3
): Promise<ExtractedSelectors> {
  console.log('\n🤖 Gemini API로 셀렉터 추출 중...');

  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

  const prompt = `당신은 웹 크롤링 전문가입니다. 첨부된 스크린샷과 HTML을 분석하여, 게시판 목록에서 데이터를 추출하는 CSS 셀렉터를 찾아주세요.

HTML 구조:
\`\`\`html
${html}
\`\`\`

찾아야 할 정보:
1. **listContainer**: 목록을 감싸는 컨테이너 (table, ul, div 등)
2. **rows**: 각 게시글 행 (tr, li, div 등)
3. **title**: 제목 텍스트가 있는 요소
4. **date**: 날짜 텍스트가 있는 요소
5. **link**: 상세 페이지로 가는 링크 (href 속성)
6. **location**: 이 게시판의 지역을 게시판 이름/페이지 제목/URL에서 추출 (예: "의정부", "남양주", "경기도", "서울" 등. 지역이 명확하지 않으면 null)

   **location 추출 규칙**:
   - 게시판 이름에 "구리남양주" 또는 "남양주구리" 또는 "구리 남양주" 또는 "남양주 구리"가 포함되면 → "구리남양주"
   - 게시판 이름에 "구리"와 "남양주"가 모두 포함되면 → "구리남양주"
   - URL에 "goegn" 또는 "구리남양주교육지원청"이 포함되면 → "구리남양주"
   - 그 외 단일 지역명(의정부, 파주 등)은 그대로 사용

**출력 형식** (JSON만 출력, 다른 텍스트 없이):
\`\`\`json
{
  "listContainer": "table.board-list",
  "rows": "tbody tr",
  "title": "td.title a",
  "date": "td.date",
  "link": "td.title a",
  "location": "구리남양주"
}
\`\`\`

예시 URL의 경우 "goegn"이 포함되어 있으므로 location은 "구리남양주"가 됩니다.

**주의사항**:
- CSS 셀렉터는 구체적으로 작성
- nth-child() 사용 가능 (예: "td:nth-child(3)")
- 한국 교육청 게시판 구조 고려
- location은 게시판 이름, 페이지 제목, URL에서 지역명을 추출 (필수 아님, null 가능)
- 반드시 JSON 형식으로만 응답`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`  시도 ${attempt}/${maxRetries}...`);

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: screenshot,
            mimeType: 'image/png'
          }
        }
      ]);

      const response = result.response.text();
      console.log('  Gemini 응답:', response.substring(0, 200) + '...');

      // JSON 추출 (코드 블록 내부 찾기)
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      // JSON 파싱
      const selectors = JSON.parse(jsonText.trim()) as ExtractedSelectors;

      // 필수 키 검증
      const requiredKeys = ['listContainer', 'rows', 'title', 'date', 'link'];
      for (const key of requiredKeys) {
        if (!selectors[key as keyof ExtractedSelectors]) {
          throw new Error(`필수 키 누락: ${key}`);
        }
      }

      console.log('  ✅ 셀렉터 추출 성공!');
      console.log('  ', JSON.stringify(selectors, null, 2));
      return selectors;

    } catch (error) {
      console.warn(`  ⚠️  시도 ${attempt} 실패:`, error instanceof Error ? error.message : error);
      if (attempt === maxRetries) {
        throw new Error(`Gemini API 셀렉터 추출 실패 (${maxRetries}회 시도)`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
    }
  }

  throw new Error('Unexpected: maxRetries exceeded');
}

/**
 * Playwright로 셀렉터 검증
 */
async function validateSelectors(
  url: string,
  selectors: ExtractedSelectors
): Promise<boolean> {
  console.log('\n🔍 셀렉터 검증 중...');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // rows 선택자로 요소 찾기
    const rowsCount = await page.locator(selectors.rows).count();

    console.log(`  발견된 행: ${rowsCount}개`);

    if (rowsCount < 3) {
      console.warn(`  ⚠️  행이 너무 적음 (최소 3개 필요, 현재 ${rowsCount}개)`);
      await browser.close();
      return false;
    }

    // 첫 번째 행에서 title, date, link 확인
    const firstRow = page.locator(selectors.rows).first();

    const titleCount = await firstRow.locator(selectors.title.replace(/^.*?\s+/, '')).count();
    const dateCount = await firstRow.locator(selectors.date.replace(/^.*?\s+/, '')).count();
    const linkCount = await firstRow.locator(selectors.link.replace(/^.*?\s+/, '')).count();

    console.log(`  첫 행 요소: title=${titleCount}, date=${dateCount}, link=${linkCount}`);

    if (titleCount === 0 || linkCount === 0) {
      console.warn('  ⚠️  필수 요소 누락');
      await browser.close();
      return false;
    }

    console.log('  ✅ 셀렉터 검증 성공!');
    await browser.close();
    return true;

  } catch (error) {
    console.error('  ❌ 검증 실패:', error instanceof Error ? error.message : error);
    await browser.close();
    return false;
  }
}

/**
 * 크롤러 코드 생성 (uijeongbu.js 기반 템플릿)
 */
function generateCrawlerCode(config: CrawlerConfig): string {
  const functionName = config.name
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z가-힣0-9]/g, '');

  const fileName = config.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '');

  const code = `import { loadPage, getTextBySelectors, getAttributeBySelectors, resolveUrl } from './lib/playwright.js';

/**
 * ${config.name} 크롤러 (AI 생성)
 * Generated at ${new Date().toISOString()}
 */
export async function crawl${functionName}(page, config) {
  console.log(\`\\n📍 \${config.name} 크롤링 시작\`);

  // AI가 추출한 셀렉터
  const aiSelectors = ${JSON.stringify(config.selectors, null, 2)};

  // AI가 추출한 지역 정보
  const aiLocation = aiSelectors.location || null;

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
          // href가 javascript:가 아니면 사용, 아니면 건너뜀
          if (!href || href.startsWith('javascript')) {
            console.warn(\`     링크 없음 (data-id와 href 모두 없음), 건너뜀\`);
            continue;
          }
          absoluteLink = resolveUrl(baseUrl, href);
        } else {
          // data-id로 상세 페이지 URL 구성
          // 기본 게시판 URL 패턴: selectNttInfo.do?mi=xxxxx&bbsId=xxxxx&nttSn=data-id
          const match = baseUrl.match(/selectNttList\.do\?(.+?)&bbsId=([^&]+)/);
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

        // 첨부파일 추출 (3단계 + 4단계 동적 파싱)
        let attachmentUrl = null;
        let extractedData = null;

        // 1단계: 기본 선택자로 시도
        attachmentUrl = await page.evaluate(() => {
          const link = document.querySelector('a[href*="download"], a[href*="attach"], a[href*="file"]');
          return link ? link.getAttribute('href') : null;
        });

        // 2단계: 파일 확장자 검색
        if (!attachmentUrl) {
          const fileExtensions = ['.hwp', '.hwpx', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
          for (const ext of fileExtensions) {
            attachmentUrl = await page.evaluate((extension) => {
              const lowerExtension = extension.toLowerCase();
              const links = Array.from(document.querySelectorAll('a'));
              const target = links.find((link) => {
                const hrefValue = link.getAttribute('href') || link.href || '';
                const textValue = link.textContent || '';
                return hrefValue.toLowerCase().includes(lowerExtension) || textValue.toLowerCase().includes(lowerExtension);
              });
              if (!target) return null;
              const href = target.getAttribute('href') || target.getAttribute('data-href') || target.getAttribute('data-file') || target.href;
              if (!href) return null;
              const trimmed = href.trim();
              if (!trimmed || trimmed.toLowerCase().startsWith('javascript:') || trimmed === '#') return null;
              return trimmed;
            }, ext);
            if (attachmentUrl) break;
          }
        }

        // 3단계: 키워드 검색
        if (!attachmentUrl) {
          const keywordCandidates = ['첨부', '다운로드', '내려받기', '파일'];
          attachmentUrl = await page.evaluate((keywords) => {
            const links = Array.from(document.querySelectorAll('a, button'));
            const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
            const target = links.find((element) => {
              const text = (element.textContent || '').toLowerCase();
              const aria = (element.getAttribute('aria-label') || '').toLowerCase();
              return lowerKeywords.some((keyword) => text.includes(keyword) || aria.includes(keyword));
            });
            if (!target) return null;
            const href = target.getAttribute('href') || target.getAttribute('data-href') || target.getAttribute('data-file') || target.href;
            if (!href) return null;
            const trimmed = href.trim();
            if (!trimmed || trimmed.toLowerCase().startsWith('javascript:') || trimmed === '#') return null;
            return trimmed;
          }, keywordCandidates);
        }

        let resolvedAttachmentUrl = attachmentUrl ? resolveUrl(absoluteLink, attachmentUrl) : null;

        // 4단계: onclick 동적 파싱
        if (!resolvedAttachmentUrl) {
          extractedData = await page.evaluate(() => {
            const prvwLinks = document.querySelectorAll('.prvw a, .prvw_btns a');
            for (const link of prvwLinks) {
              const onclick = link.getAttribute('onclick');
              if (!onclick) continue;

              // previewAjax('URL', 'filename') 패턴 추출
              const match = onclick.match(/previewAjax\\s*\\(\\s*['"]([^'"]+)['"]\\s*,\\s*['"]([^'"]+)['"]/);
              if (match && match[1]) {
                return { url: match[1], filename: match[2] || null };
              }

              // preListen('URL', 'filename') 패턴
              const match2 = onclick.match(/preListen\\s*\\(\\s*['"]([^'"]+)['"]\\s*,\\s*['"]([^'"]+)['"]/);
              if (match2 && match2[1]) {
                return { url: match2[1], filename: match[2] || null };
              }

              // URL만 있는 경우
              const matchUrlOnly = onclick.match(/previewAjax\\s*\\(\\s*['"]([^'"]+)['"]/);
              if (matchUrlOnly && matchUrlOnly[1]) {
                return { url: matchUrlOnly[1], filename: null };
              }
            }
            return null;
          });

          if (extractedData?.url) {
            resolvedAttachmentUrl = resolveUrl(absoluteLink, extractedData.url);
          }
        }

        // 4단계-B: DEXT5 스크립트 분석
        if (!resolvedAttachmentUrl && !extractedData) {
          const dextScriptData = await page.evaluate(() => {
            const scripts = Array.from(document.scripts || []);
            for (const script of scripts) {
              const text = script.textContent || '';
              // 작은따옴표(') 또는 백틱(\`) 지원
              const match = text.match(/DEXT5UPLOAD\\.AddUploadedFile\\([\`']([^\`']+)[\`']\\s*,\\s*[\`']([^\`']+)[\`']\\s*,\\s*[\`']([^\`']+)[\`']\\s*,\\s*[\`']([^\`']+)[\`']/);
              if (match) {
                return {
                  itemKey: match[1],
                  filename: match[2],
                  path: match[3],
                  size: match[4],
                };
              }
            }
            return null;
          });

          if (dextScriptData?.path) {
            extractedData = {
              url: dextScriptData.path,
              filename: dextScriptData.filename || null,
              size: dextScriptData.size || null,
            };
            resolvedAttachmentUrl = resolveUrl(absoluteLink, dextScriptData.path);
          }
        }

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
          location: aiLocation || null,
          detail_content: content || '',
          attachment_url: resolvedAttachmentUrl || null,
          screenshot_base64: screenshotBase64
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
 * sources.json에 설정 추가
 */
function updateSourcesConfig(config: CrawlerConfig): void {
  console.log('\n📝 sources.json 업데이트 중...');

  const configPath = join(process.cwd(), 'crawler', 'config', 'sources.json');
  const sourcesConfig = JSON.parse(readFileSync(configPath, 'utf-8'));

  const key = config.name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z가-힣0-9]/g, '');

  sourcesConfig[key] = {
    name: config.name,
    baseUrl: config.baseUrl,
    selectors: config.selectors
  };

  writeFileSync(configPath, JSON.stringify(sourcesConfig, null, 2), 'utf-8');
  console.log(`  ✅ 설정 추가됨: ${key}`);
}

/**
 * 메인 함수
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(`
사용법: npx tsx scripts/generate-crawler-ai.ts <URL> <게시판명>

예시:
  npx tsx scripts/generate-crawler-ai.ts "https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656" "남양주교육지원청 구인구직"
    `);
    process.exit(1);
  }

  const url = args[0];
  const boardName = args[1];

  console.log('🚀 AI 크롤러 생성 시작');
  console.log(`   URL: ${url}`);
  console.log(`   게시판명: ${boardName}`);

  try {
    // 1. 페이지 분석
    const { screenshot, html } = await analyzePage(url);

    // 2. Gemini로 셀렉터 추출
    const selectors = await extractSelectorsWithGemini(screenshot, html);

    // 3. 셀렉터 검증
    const isValid = await validateSelectors(url, selectors);

    if (!isValid) {
      console.warn('\n⚠️  셀렉터 검증 실패. 범용 템플릿 사용을 권장합니다.');
      console.log('수동으로 crawler/sources/uijeongbu.js를 복사하여 수정하세요.');
      process.exit(1);
    }

    // 4. 크롤러 코드 생성
    const config: CrawlerConfig = {
      name: boardName,
      baseUrl: url,
      selectors
    };

    const code = generateCrawlerCode(config);

    // 5. 파일 저장
    const fileName = boardName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣-]/g, '');

    const filePath = join(process.cwd(), 'crawler', 'sources', `${fileName}.js`);
    writeFileSync(filePath, code, 'utf-8');

    console.log(`\n✅ 크롤러 생성 완료!`);
    console.log(`   파일: crawler/sources/${fileName}.js`);

    // 6. sources.json 업데이트
    updateSourcesConfig(config);

    console.log(`\n📋 다음 단계:`);
    console.log(`1. 테스트: cd crawler && node test-${fileName}.js`);
    console.log(`2. DB 등록: 관리자 페이지에서 게시판 추가`);
    console.log(`3. GitHub Actions에 소스 추가 (자동 실행용)`);

  } catch (error) {
    console.error('\n❌ 에러 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Page } from 'playwright';
import type { BoardAnalysisResult, CapturedBoardData } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// crawler 루트의 .env 파일 로드
dotenv.config({ path: join(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Phase 5-1: 게시판 구조 분석 Agent
 *
 * 입력: 게시판 URL + 스크린샷 + HTML 샘플
 * 출력: 구조 분석 결과 (가장 유사한 패턴, 선택자, 페이지네이션 방식)
 */

/**
 * 게시판의 HTML 구조를 분석하여 크롤링 패턴 추론
 */
export async function analyzeBoardStructure({
  boardUrl,
  listPageScreenshot,
  detailPageScreenshot,
  listPageHtml,
  detailPageHtml
}: CapturedBoardData): Promise<BoardAnalysisResult> {
  console.log('\n🔍 [Phase 5-1] 게시판 구조 분석 시작');
  console.log(`   URL: ${boardUrl}`);

  try {
    // Gemini 2.5 Pro 모델 사용 (크롤러 코드 생성 - 최고 품질 필요)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.1, // 정확성 우선
        maxOutputTokens: 4000,
      }
    });

    const prompt = `
당신은 웹 크롤링 전문가입니다. 교육청 게시판의 HTML 구조를 분석하여 크롤링 패턴을 추론해주세요.

## 제공된 정보:
1. **목록 페이지 HTML 샘플** (최대 5000자):
\`\`\`html
${listPageHtml.substring(0, 5000)}
\`\`\`

2. **상세 페이지 HTML 샘플** (최대 3000자):
\`\`\`html
${detailPageHtml.substring(0, 3000)}
\`\`\`

## 기존 크롤러 패턴 3가지:

### 패턴 A (경기도교육청): POST 기반 동적 로딩
- **목록 페이지**: POST 요청으로 HTML 받아옴
- **링크 추출**: \`goView('숫자ID')\` 패턴을 정규식으로 추출
- **상세 페이지**: ID 기반 URL 생성 (\`/detail?id=123\`)
- **특징**: JavaScript onclick 함수 사용

### 패턴 B (성남교육지원청): data-id 속성 기반
- **목록 페이지**: 일반 GET 요청
- **링크 추출**: \`data-id\` 속성 읽기
- **상세 페이지**: data-id로 URL 템플릿 생성
- **특징**: 데이터 속성 활용

### 패턴 C (의정부교육지원청): data-id + fallback
- **목록 페이지**: 일반 GET 요청
- **링크 추출**: \`data-id\` 우선, 실패 시 href 사용
- **상세 페이지**: data-id 또는 href
- **특징**: 여러 fallback 선택자

## 분석 요구사항:

1. **가장 유사한 패턴**: A, B, C 중 선택
2. **목록 페이지 선택자**:
   - 게시판 컨테이너 (table, ul 등)
   - 각 행/아이템 선택자
   - 제목 선택자
   - 날짜 선택자
3. **링크 추출 방식**: data-id / href / onclick 정규식
4. **상세 페이지 선택자**:
   - 본문 내용 선택자
   - 첨부파일 링크 선택자
   - 제목 선택자
5. **페이지네이션 방식**: 쿼리 파라미터 / POST / 버튼 클릭

## 출력 형식 (JSON만 출력, 다른 텍스트 없이):

\`\`\`json
{
  "mostSimilarPattern": "A" | "B" | "C",
  "confidence": 0.85,
  "listPage": {
    "containerSelector": "table.board-list",
    "rowSelector": "tbody tr",
    "titleSelector": "td.title a",
    "dateSelector": "td.date",
    "linkExtraction": {
      "method": "data-id" | "href" | "onclick",
      "attribute": "data-id",
      "regex": null
    },
    "paginationType": "query" | "POST" | "button"
  },
  "detailPage": {
    "contentSelector": ".view-content",
    "attachmentSelector": "a[href*=download]",
    "titleSelector": ".view-title"
  },
  "reasoning": "이 게시판은 data-id 속성을 사용하므로 패턴 B와 가장 유사합니다. table.board-list 구조를 가지고 있어 일반적인 교육청 게시판 형식입니다."
}
\`\`\`

중요:
- JSON 외 다른 텍스트 출력 금지
- confidence는 0.0 ~ 1.0 사이
- reasoning은 한글로 2-3문장
`;

    const parts: any[] = [
      { text: prompt }
    ];

    // 스크린샷이 있으면 추가 (Vision API 활용)
    // base64 문자열이어야 함 (Buffer 객체가 아님)
    if (listPageScreenshot && typeof listPageScreenshot === 'string') {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: listPageScreenshot
        }
      });
    }

    if (detailPageScreenshot && typeof detailPageScreenshot === 'string') {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: detailPageScreenshot
        }
      });
    }

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    // JSON 추출
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
    }

    const analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    console.log('✅ 구조 분석 완료:');
    console.log(`   가장 유사한 패턴: ${analysisResult.mostSimilarPattern}`);
    console.log(`   신뢰도: ${(analysisResult.confidence * 100).toFixed(1)}%`);
    console.log(`   이유: ${analysisResult.reasoning}`);

    return {
      success: true,
      url: boardUrl,
      ...analysisResult,
      rawResponse: text
    };

  } catch (error: any) {
    console.error('❌ 게시판 구조 분석 실패:', error.message);
    return {
      success: false,
      error: error.message,
      url: boardUrl
    };
  }
}

/**
 * Playwright를 사용하여 게시판 HTML + 스크린샷 캡처
 */
export async function captureBoardData(page: Page, boardUrl: string): Promise<CapturedBoardData> {
  console.log(`\n📸 게시판 데이터 캡처 중: ${boardUrl}`);

  try {
    // 목록 페이지 로드
    await page.goto(boardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // JS 렌더링 대기

    // 목록 페이지 HTML
    const listPageHtml = await page.content();

    // 목록 페이지 스크린샷
    const listPageScreenshot = await page.screenshot({
      fullPage: false, // 첫 화면만
      encoding: 'base64'
    });

    // 첫 번째 게시글 링크 찾기 (여러 패턴 시도)
    let detailUrl: string | null = null;

    // 패턴 1: data-id 속성
    const dataIdElement = await page.$('[data-id]');
    if (dataIdElement) {
      const dataId = await dataIdElement.getAttribute('data-id');
      // URL 패턴 추론 (일반적으로 board/view 또는 detail)
      const baseUrlObj = new URL(boardUrl);
      detailUrl = `${baseUrlObj.origin}/board/view?id=${dataId}`;
    }

    // 패턴 2: 제목 링크 (a 태그)
    if (!detailUrl) {
      const linkElement = await page.$('td.title a, .title a, .cont_tit a');
      if (linkElement) {
        const href = await linkElement.getAttribute('href');
        if (href) {
          detailUrl = href.startsWith('http') ? href : new URL(href, boardUrl).href;
        }
      }
    }

    // 상세 페이지 데이터 (있으면)
    let detailPageHtml = '';
    let detailPageScreenshot: string | null = null;

    if (detailUrl) {
      try {
        await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(2000);

        detailPageHtml = await page.content();
        detailPageScreenshot = await page.screenshot({
          fullPage: false,
          encoding: 'base64'
        });
      } catch (detailError: any) {
        console.warn('⚠️  상세 페이지 캡처 실패 (목록만 분석)', detailError.message);
      }
    }

    console.log('✅ 캡처 완료');
    console.log(`   목록 HTML: ${listPageHtml.length} 글자`);
    console.log(`   상세 HTML: ${detailPageHtml.length} 글자`);

    return {
      boardUrl,
      listPageHtml,
      listPageScreenshot,
      detailPageHtml,
      detailPageScreenshot
    };

  } catch (error: any) {
    console.error('❌ 게시판 데이터 캡처 실패:', error.message);
    throw error;
  }
}

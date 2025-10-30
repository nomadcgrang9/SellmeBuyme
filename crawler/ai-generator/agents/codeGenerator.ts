import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import type { BoardAnalysisResult, CrawlerCodeResult } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// crawler 루트의 .env 파일 로드
dotenv.config({ path: join(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Phase 5-2: 크롤러 코드 생성 Agent
 *
 * 입력: 게시판 분석 결과 + 기존 크롤러 3개 (Few-shot learning)
 * 출력: 완전한 JavaScript 크롤러 코드
 */

interface CrawlerTemplate {
  name: string;
  pattern: 'A' | 'B' | 'C';
  code: string;
}

/**
 * 기존 크롤러 3개를 템플릿으로 로드
 */
async function loadCrawlerTemplates(): Promise<CrawlerTemplate[]> {
  const templatesDir = join(__dirname, '../../sources');

  const templates: CrawlerTemplate[] = [
    {
      name: 'gyeonggi',
      pattern: 'A',
      code: await readFile(join(templatesDir, 'gyeonggi.js'), 'utf-8')
    },
    {
      name: 'seongnam',
      pattern: 'B',
      code: await readFile(join(templatesDir, 'seongnam.js'), 'utf-8')
    },
    {
      name: 'uijeongbu',
      pattern: 'C',
      code: await readFile(join(templatesDir, 'uijeongbu.js'), 'utf-8')
    }
  ];

  return templates;
}

/**
 * 게시판 이름을 함수명으로 변환 (camelCase)
 */
function sanitizeBoardName(boardName: string): string {
  // 한글 제거, 공백을 camelCase로
  return boardName
    .replace(/[가-힣]/g, '') // 한글 제거
    .trim()
    .split(/\s+/)
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * AI를 사용하여 새로운 크롤러 코드 생성
 */
export async function generateCrawlerCode(
  analysis: BoardAnalysisResult,
  boardName: string,
  errorContext: string = '' // 이전 오류 정보 (Self-Correction용)
): Promise<CrawlerCodeResult> {
  console.log('\n🤖 [Phase 5-2] 크롤러 코드 생성 시작');
  console.log(`   게시판: ${boardName}`);
  console.log(`   패턴: ${analysis.mostSimilarPattern}`);

  if (errorContext) {
    console.log(`   ⚠️  이전 오류 포함: 재생성 모드`);
  }

  try {
    // 1. 기존 크롤러 템플릿 로드
    const templates = await loadCrawlerTemplates();
    const selectedTemplate = templates.find(t => t.pattern === analysis.mostSimilarPattern);

    if (!selectedTemplate) {
      throw new Error(`패턴 ${analysis.mostSimilarPattern}에 해당하는 템플릿을 찾을 수 없습니다`);
    }

    console.log(`   템플릿: ${selectedTemplate.name} (패턴 ${selectedTemplate.pattern})`);

    // 2. 함수명 생성
    const functionName = sanitizeBoardName(boardName);
    const safeFunctionName = functionName || 'crawlNewBoard';

    console.log(`   함수명: crawl${safeFunctionName.charAt(0).toUpperCase() + safeFunctionName.slice(1)}`);

    // 3. Gemini 2.5 Pro 모델 사용
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-pro',
      generationConfig: {
        temperature: 0.2, // 코드 생성은 약간의 창의성 허용
        maxOutputTokens: 8000,
      }
    });

    const prompt = `
당신은 Playwright 크롤러 개발 전문가입니다. 교육청 게시판 크롤러를 생성해주세요.

## 게시판 정보:
- **이름**: ${boardName}
- **URL**: ${analysis.url}
- **가장 유사한 패턴**: ${analysis.mostSimilarPattern}

## 분석 결과:
\`\`\`json
${JSON.stringify({
  listPage: analysis.listPage,
  detailPage: analysis.detailPage,
  reasoning: analysis.reasoning
}, null, 2)}
\`\`\`

## 템플릿 소스 코드 (${selectedTemplate.pattern} 패턴):
\`\`\`javascript
${selectedTemplate.code}
\`\`\`

## 생성 요구사항:

### 1. 함수명 및 구조
- 함수명: \`export async function crawl${safeFunctionName.charAt(0).toUpperCase() + safeFunctionName.slice(1)}(page, config)\`
- 기존 템플릿 구조 유지
- ESM import/export 사용
- **중요**: import 경로는 반드시 상대 경로 2단계 상위 사용 (\`../../lib/\` 형식)

### 2. 선택자 교체
분석 결과의 선택자를 정확히 적용:
- 목록 컨테이너: \`${analysis.listPage?.containerSelector}\`
- 행 선택자: \`${analysis.listPage?.rowSelector}\`
- 제목 선택자: \`${analysis.listPage?.titleSelector}\`
- 날짜 선택자: \`${analysis.listPage?.dateSelector}\`
- 링크 추출: \`${analysis.listPage?.linkExtraction.method}\` 방식
- 본문 선택자: \`${analysis.detailPage?.contentSelector}\`
- 첨부파일: \`${analysis.detailPage?.attachmentSelector}\`

### 3. 에러 처리 강화
- 각 선택자에 fallback 추가 (최소 2-3개)
- try-catch 블록으로 감싸기
- 디버깅 로그 추가 (console.log)
- stale element 방지 (매번 새로 쿼리)

### 4. 데이터 검증
- title 필수 (누락 시 스킵)
- detailContent 100자 이상 권장
- 첨부파일 선택사항
- link 필수

### 5. 템플릿 패턴 유지
- config.crawlBatchSize 사용
- 스크린샷 캡처 (screenshotBase64)
- 목록 페이지로 돌아가기
- 에러 발생 시 continue

## 출력 형식:
- 완전한 JavaScript 파일 코드만 출력
- 주석 포함 (한글)
- 즉시 실행 가능한 코드
- \`\`\`javascript 코드 블록 사용

## 중요 규칙:
1. 템플릿 코드의 구조와 패턴을 최대한 유지
2. 선택자만 분석 결과로 교체
3. import 문 포함
4. 함수 export 필수
5. 주석은 한글로 상세히
6. **반드시 완전한 JavaScript 코드만 출력하세요 (마크다운 코드 블록 마커는 출력하지 마세요)**
7. 모든 변수는 완전히 선언되어야 합니다 (const link = detailUrl.toString() 형식)
${errorContext}
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // 디버깅: AI 응답 일부 출력
    console.log('\n📝 AI 응답 미리보기 (처음 500자):');
    console.log(text.substring(0, 500));
    console.log('...\n');

    // JavaScript 코드 블록 추출 (개선된 추출 로직)
    let generatedCode: string;

    // 1. 먼저 코드 블록 마커 확인
    const codeMatch = text.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);

    if (codeMatch) {
      generatedCode = codeMatch[1].trim();
    } else {
      // 2. 코드 블록이 없으면 전체 응답 사용
      console.warn('⚠️  코드 블록 마커 없음, 전체 응답을 코드로 간주');
      generatedCode = text.trim();
    }

    // 3. 잘못 포함된 코드 블록 마커 제거 (```javascript 또는 ``` 로 시작하는 경우)
    if (generatedCode.startsWith('```')) {
      const lines = generatedCode.split('\n');
      // 첫 줄이 ```javascript 또는 ``` 이면 제거
      if (lines[0].trim().startsWith('```')) {
        lines.shift();
      }
      // 마지막 줄이 ``` 이면 제거
      if (lines[lines.length - 1].trim() === '```') {
        lines.pop();
      }
      generatedCode = lines.join('\n').trim();
    }

    // 4. 최소 길이 검증
    if (generatedCode.length < 100) {
      throw new Error(`AI 응답이 너무 짧습니다 (${generatedCode.length}자). 응답: ${text.substring(0, 200)}`);
    }

    // 기본 검증
    const warnings: string[] = [];

    if (!generatedCode.includes('export async function')) {
      warnings.push('export 문이 누락되었을 수 있습니다');
    }

    if (!generatedCode.includes('import')) {
      warnings.push('import 문이 누락되었을 수 있습니다');
    }

    if (generatedCode.length < 500) {
      warnings.push('생성된 코드가 너무 짧습니다 (500자 미만)');
    }

    console.log('✅ 코드 생성 완료');
    console.log(`   코드 길이: ${generatedCode.length} 글자`);
    if (warnings.length > 0) {
      console.log('⚠️  경고:');
      warnings.forEach(w => console.log(`   - ${w}`));
    }

    return {
      success: true,
      code: generatedCode,
      filename: `${safeFunctionName}.js`,
      warnings: warnings.length > 0 ? warnings : undefined
    };

  } catch (error: any) {
    console.error('❌ 크롤러 코드 생성 실패:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 생성된 크롤러 코드를 파일로 저장
 */
export async function saveCrawlerCode(
  code: string,
  filename: string,
  outputDir?: string
): Promise<string> {
  const { writeFile, mkdir } = await import('fs/promises');

  const targetDir = outputDir || join(__dirname, '../../sources');
  const filePath = join(targetDir, filename);

  // 디렉토리 생성 (없으면)
  await mkdir(targetDir, { recursive: true });

  // 파일 저장
  await writeFile(filePath, code, 'utf-8');

  console.log(`\n💾 크롤러 저장 완료: ${filePath}`);

  return filePath;
}

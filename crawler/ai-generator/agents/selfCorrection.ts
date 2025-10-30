/**
 * Phase 5-4: Self-Correction Loop
 *
 * LangGraph를 사용하여 크롤러 생성 → 테스트 → 오류 분석 → 재생성 순환 구조 구현
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { StateGraph } from '@langchain/langgraph';
import { generateCrawlerCode, CrawlerCodeResult } from './codeGenerator.js';
import { executeGeneratedCrawler, TestExecutionResult } from './sandbox.js';
import { BoardAnalysisResult } from '../types/index.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Self-Correction 상태 정의
 */
interface SelfCorrectionState {
  boardName: string;
  boardUrl: string;
  analysis: BoardAnalysisResult;
  currentCode: string | null;
  currentErrors: Array<{ step: string; error: string }>;
  attemptCount: number;
  maxAttempts: number;
  finalResult: CrawlerCodeResult | null;
  success: boolean;
}

/**
 * 오류 분석 및 개선 제안 생성
 */
async function analyzeErrorsAndSuggestFix(
  state: SelfCorrectionState
): Promise<Partial<SelfCorrectionState>> {
  console.log(`\n🔍 [Self-Correction] 오류 분석 중 (시도 ${state.attemptCount}/${state.maxAttempts})`);

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro',
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2000,
    },
  });

  const errorSummary = state.currentErrors
    .map((e, idx) => `${idx + 1}. [${e.step}] ${e.error}`)
    .join('\n');

  const prompt = `
당신은 Playwright 크롤러 디버깅 전문가입니다.

다음 크롤러 코드에서 오류가 발생했습니다. 오류를 분석하고 수정 방법을 제안하세요.

## 발생한 오류:
${errorSummary}

## 현재 코드:
\`\`\`javascript
${state.currentCode}
\`\`\`

## 분석 결과:
- 게시판: ${state.boardName}
- URL: ${state.boardUrl}
- 패턴: ${state.analysis.mostSimilarPattern}

## 요청사항:
1. 오류의 근본 원인을 찾으세요 (Parse error, Runtime error, Selector mismatch 등)
2. 구체적인 수정 방법을 제시하세요 (어느 라인을 어떻게 수정할지)
3. 수정 우선순위를 정하세요 (가장 중요한 것부터)

**응답 형식 (JSON):**
\`\`\`json
{
  "rootCause": "오류의 근본 원인 설명",
  "fixes": [
    {
      "priority": 1,
      "issue": "구체적인 문제",
      "solution": "구체적인 해결책",
      "lineNumber": 115
    }
  ],
  "regenerateNeeded": true
}
\`\`\`
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSON 추출
  const jsonMatch = text.match(/\`\`\`json\s*([\s\S]*?)\`\`\`/);
  let analysisResult;

  if (jsonMatch) {
    try {
      analysisResult = JSON.parse(jsonMatch[1]);
    } catch (e) {
      console.warn('⚠️  JSON 파싱 실패, 전체 응답을 사용합니다');
      analysisResult = { rootCause: text, fixes: [], regenerateNeeded: true };
    }
  } else {
    analysisResult = { rootCause: text, fixes: [], regenerateNeeded: true };
  }

  console.log(`   근본 원인: ${analysisResult.rootCause}`);
  console.log(`   수정 항목: ${analysisResult.fixes.length}개`);

  return {
    currentErrors: [], // 오류 분석 완료
  };
}

/**
 * 크롤러 재생성
 */
async function regenerateCrawler(
  state: SelfCorrectionState
): Promise<Partial<SelfCorrectionState>> {
  console.log(`\n🔄 [Self-Correction] 크롤러 재생성 중 (시도 ${state.attemptCount + 1}/${state.maxAttempts})`);

  // 오류 정보를 포함하여 재생성 요청
  const errorContext = state.currentErrors.length > 0
    ? `\n\n## 이전 시도에서 발생한 오류:\n${state.currentErrors.map(e => `- [${e.step}] ${e.error}`).join('\n')}`
    : '';

  const codeResult = await generateCrawlerCode(
    state.analysis,
    state.boardName,
    errorContext
  );

  return {
    currentCode: codeResult.code,
    attemptCount: state.attemptCount + 1,
    finalResult: codeResult,
  };
}

/**
 * 크롤러 테스트 실행
 */
async function testCrawler(
  state: SelfCorrectionState
): Promise<Partial<SelfCorrectionState>> {
  console.log(`\n🧪 [Self-Correction] 크롤러 테스트 실행 중`);

  if (!state.currentCode) {
    return {
      success: false,
      currentErrors: [{ step: 'test', error: '크롤러 코드가 없습니다' }],
    };
  }

  const testResult = await executeGeneratedCrawler(
    state.currentCode,
    state.boardUrl,
    state.boardName
  );

  if (testResult.success) {
    console.log(`   ✅ 테스트 성공! (${testResult.jobsCollected}개 수집)`);
    return {
      success: true,
      currentErrors: [],
    };
  } else {
    console.log(`   ❌ 테스트 실패 (오류 ${testResult.errors.length}개)`);
    return {
      success: false,
      currentErrors: testResult.errors,
    };
  }
}

/**
 * 재시도 여부 결정
 */
function shouldRetry(state: SelfCorrectionState): string {
  if (state.success) {
    return 'end'; // 성공하면 종료
  }

  if (state.attemptCount >= state.maxAttempts) {
    console.log(`\n⚠️  최대 시도 횟수(${state.maxAttempts})에 도달했습니다.`);
    return 'end'; // 최대 시도 횟수 초과
  }

  if (state.currentErrors.length === 0) {
    return 'end'; // 오류가 없으면 종료 (이상한 경우)
  }

  return 'retry'; // 재시도
}

/**
 * Self-Correction Loop 실행
 */
export async function runSelfCorrectionLoop(
  boardName: string,
  boardUrl: string,
  analysis: BoardAnalysisResult,
  initialCode: string,
  initialErrors: Array<{ step: string; error: string }>,
  maxAttempts: number = 3
): Promise<{
  success: boolean;
  finalCode: string | null;
  attemptCount: number;
  errors: Array<{ step: string; error: string }>;
}> {
  console.log('\n' + '='.repeat(80));
  console.log('Phase 5-4: Self-Correction Loop 시작');
  console.log('='.repeat(80));

  const initialState: SelfCorrectionState = {
    boardName,
    boardUrl,
    analysis,
    currentCode: initialCode,
    currentErrors: initialErrors,
    attemptCount: 0,
    maxAttempts,
    finalResult: null,
    success: false,
  };

  // LangGraph 상태 그래프 정의
  const workflow = new StateGraph<SelfCorrectionState>({
    channels: {
      boardName: null,
      boardUrl: null,
      analysis: null,
      currentCode: null,
      currentErrors: null,
      attemptCount: null,
      maxAttempts: null,
      finalResult: null,
      success: null,
    },
  });

  // 노드 추가
  workflow.addNode('analyzeErrors', analyzeErrorsAndSuggestFix);
  workflow.addNode('regenerate', regenerateCrawler);
  workflow.addNode('test', testCrawler);

  // 엣지 추가
  workflow.addEdge('analyzeErrors', 'regenerate');
  workflow.addEdge('regenerate', 'test');
  workflow.addConditionalEdges('test', shouldRetry, {
    retry: 'analyzeErrors',
    end: '__end__',
  });

  // 시작 노드 설정
  workflow.setEntryPoint('analyzeErrors');

  // 그래프 컴파일 및 실행
  const app = workflow.compile();
  const finalState = await app.invoke(initialState);

  console.log('\n' + '='.repeat(80));
  console.log('📊 Self-Correction Loop 결과');
  console.log('='.repeat(80));
  console.log(`   성공 여부: ${finalState.success ? '✅ 성공' : '❌ 실패'}`);
  console.log(`   총 시도 횟수: ${finalState.attemptCount}/${maxAttempts}`);
  console.log(`   최종 오류: ${finalState.currentErrors.length}개`);

  if (finalState.currentErrors.length > 0) {
    console.log('\n⚠️  남은 오류:');
    finalState.currentErrors.forEach((e, idx) => {
      console.log(`   ${idx + 1}. [${e.step}] ${e.error}`);
    });
  }

  return {
    success: finalState.success,
    finalCode: finalState.currentCode,
    attemptCount: finalState.attemptCount,
    errors: finalState.currentErrors,
  };
}

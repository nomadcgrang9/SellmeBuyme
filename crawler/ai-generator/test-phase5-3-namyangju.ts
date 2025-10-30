/**
 * Phase 5-3 테스트: 남양주교육지원청 게시판 전체 파이프라인
 *
 * 1. 게시판 구조 분석 (Phase 5-1)
 * 2. 크롤러 코드 생성 (Phase 5-2)
 * 3. Sandbox 테스트 실행 (Phase 5-3)
 */

import { chromium } from 'playwright';
import { captureBoardData, analyzeBoardStructure } from './agents/boardAnalyzer.js';
import { generateCrawlerCode, saveCrawlerCode } from './agents/codeGenerator.js';
import { executeGeneratedCrawler, analyzeTestResult } from './agents/sandbox.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function testNamyangjuBoard(): Promise<void> {
  console.log('🚀 Phase 5 전체 파이프라인 테스트: 남양주교육지원청\n');
  console.log('='.repeat(80));

  // 구리남양주교육지원청 인력풀 게시판 (채용공고 게시판) - HTTPS 사용
  const boardUrl = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=13515&bbsId=8356';
  const boardName = '구리남양주교육지원청 인력풀';

  let browser;

  try {
    console.log('\n📍 대상 게시판:');
    console.log(`   이름: ${boardName}`);
    console.log(`   URL: ${boardUrl}`);

    // ====================================================================
    // Phase 5-1: 게시판 구조 분석
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('Phase 5-1: 게시판 구조 분석');
    console.log('='.repeat(80));

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const capturedData = await captureBoardData(page, boardUrl);
    const analysisResult = await analyzeBoardStructure(capturedData);

    if (!analysisResult.success) {
      throw new Error(`구조 분석 실패: ${analysisResult.error}`);
    }

    console.log('\n✅ 구조 분석 완료');
    console.log(`   패턴: ${analysisResult.mostSimilarPattern}`);
    console.log(`   신뢰도: ${((analysisResult.confidence || 0) * 100).toFixed(1)}%`);
    console.log(`   이유: ${analysisResult.reasoning}`);

    // ====================================================================
    // Phase 5-2: 크롤러 코드 생성
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('Phase 5-2: 크롤러 코드 생성');
    console.log('='.repeat(80));

    const codeResult = await generateCrawlerCode(analysisResult, boardName);

    if (!codeResult.success) {
      throw new Error(`코드 생성 실패: ${codeResult.error}`);
    }

    console.log('\n✅ 코드 생성 완료');
    console.log(`   파일명: ${codeResult.filename}`);
    console.log(`   코드 길이: ${codeResult.code?.length} 글자`);

    // 임시 저장
    const tempDir = join(__dirname, 'temp');
    const savedPath = await saveCrawlerCode(
      codeResult.code!,
      codeResult.filename!,
      tempDir
    );

    // ====================================================================
    // Phase 5-3: Sandbox 테스트 실행
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('Phase 5-3: Sandbox 테스트 실행');
    console.log('='.repeat(80));

    const testResult = await executeGeneratedCrawler(
      codeResult.code!,
      boardUrl,
      boardName
    );

    // ====================================================================
    // 결과 분석 및 출력
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 최종 결과');
    console.log('='.repeat(80));

    console.log('\n✅ Phase 5-1: 구조 분석');
    console.log(`   패턴: ${analysisResult.mostSimilarPattern}`);
    console.log(`   신뢰도: ${((analysisResult.confidence || 0) * 100).toFixed(1)}%`);

    console.log('\n✅ Phase 5-2: 코드 생성');
    console.log(`   파일: ${codeResult.filename}`);
    console.log(`   저장: ${savedPath}`);

    console.log(`\n${testResult.success ? '✅' : '❌'} Phase 5-3: Sandbox 테스트`);
    console.log(`   성공 여부: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   수집 개수: ${testResult.jobsCollected}개`);
    console.log(`   오류 개수: ${testResult.errors.length}개`);
    console.log(`   실행 시간: ${(testResult.executionTime / 1000).toFixed(2)}초`);

    if (testResult.errors.length > 0) {
      console.log('\n⚠️  발견된 오류:');
      testResult.errors.forEach((err, idx) => {
        console.log(`   ${idx + 1}. [${err.step}] ${err.error}`);
      });
    }

    // 개선점 분석
    const analysis = analyzeTestResult(testResult);

    if (analysis.needsImprovement) {
      console.log('\n💡 개선 제안:');
      analysis.suggestions.forEach((suggestion, idx) => {
        console.log(`   ${idx + 1}. ${suggestion}`);
      });

      console.log('\n🔄 다음 단계: Phase 5-4 (Self-Correction Loop)');
      console.log('   AI가 오류를 분석하여 크롤러를 재생성합니다.');
    } else {
      console.log('\n🎉 성공! 크롤러가 정상 작동합니다!');
      console.log(`\n💾 최종 크롤러 저장 위치: ${savedPath}`);
      console.log('\n📝 다음 단계:');
      console.log(`   1. 크롤러를 sources/ 디렉토리로 이동`);
      console.log(`   2. config/sources.json에 설정 추가`);
      console.log(`   3. index.js에서 import하여 사용`);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 실행
testNamyangjuBoard();

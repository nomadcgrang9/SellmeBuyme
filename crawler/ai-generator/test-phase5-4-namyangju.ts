/**
 * Phase 5 전체 파이프라인 테스트 (Phase 5-4 Self-Correction Loop 포함)
 * 대상: 구리남양주교육지원청 인력풀 게시판
 */

import { chromium, Browser } from 'playwright';
import { analyzeBoardStructure } from './agents/boardAnalyzer.js';
import { generateCrawlerCode } from './agents/codeGenerator.js';
import { executeGeneratedCrawler } from './agents/sandbox.js';
import { runSelfCorrectionLoop } from './agents/selfCorrection.js';
import { BoardAnalysisResult } from './types/index.js';

async function testFullPipelineWithSelfCorrection(): Promise<void> {
  console.log('🚀 Phase 5 전체 파이프라인 테스트 (Self-Correction Loop 포함)\n');
  console.log('='.repeat(80));

  // 구리남양주교육지원청 인력풀 게시판 (채용공고 게시판) - HTTPS 사용
  const boardUrl = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=13515&bbsId=8356';
  const boardName = '구리남양주교육지원청 인력풀';

  console.log(`\n📍 대상 게시판:`);
  console.log(`   이름: ${boardName}`);
  console.log(`   URL: ${boardUrl}`);

  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({ headless: true });

    // ================================================================
    // Phase 5-1: 게시판 구조 분석
    // ================================================================
    console.log('\n' + '='.repeat(80));
    console.log('Phase 5-1: 게시판 구조 분석');
    console.log('='.repeat(80));

    // 게시판 데이터 캡처
    console.log(`\n📸 게시판 데이터 캡처 중: ${boardUrl}`);
    const page = await browser.newPage();

    await page.goto(boardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const listPageHtml = await page.content();
    const listPageScreenshot = await page.screenshot({ fullPage: false, encoding: 'base64' });

    console.log(`✅ 캡처 완료`);
    console.log(`   목록 HTML: ${listPageHtml.length} 글자`);

    const analysis: BoardAnalysisResult = await analyzeBoardStructure({
      boardUrl,
      listPageHtml,
      listPageScreenshot: listPageScreenshot as string,
      detailPageHtml: '',
      detailPageScreenshot: '',
    });

    await page.close();

    if (!analysis.success) {
      throw new Error('게시판 분석 실패');
    }

    console.log(`\n✅ 구조 분석 완료`);
    console.log(`   패턴: ${analysis.mostSimilarPattern}`);
    console.log(`   신뢰도: ${analysis.confidence}%`);
    console.log(`   이유: ${analysis.reason}`);

    // ================================================================
    // Phase 5-2: 크롤러 코드 생성
    // ================================================================
    console.log('\n' + '='.repeat(80));
    console.log('Phase 5-2: 크롤러 코드 생성');
    console.log('='.repeat(80));

    const codeResult = await generateCrawlerCode(analysis, boardName);

    if (!codeResult.success) {
      throw new Error('코드 생성 실패');
    }

    console.log(`\n✅ 코드 생성 완료`);
    console.log(`   파일명: ${codeResult.fileName}`);
    console.log(`   코드 길이: ${codeResult.code.length} 글자`);

    // ================================================================
    // Phase 5-3: Sandbox 초기 테스트
    // ================================================================
    console.log('\n' + '='.repeat(80));
    console.log('Phase 5-3: Sandbox 초기 테스트');
    console.log('='.repeat(80));

    const initialTestResult = await executeGeneratedCrawler(
      codeResult.code,
      boardUrl,
      boardName
    );

    if (initialTestResult.success) {
      // 첫 시도에서 성공!
      console.log('\n✅ 초기 테스트 성공!');
      console.log(`   수집 개수: ${initialTestResult.jobsCollected}개`);
      console.log(`   실행 시간: ${initialTestResult.executionTime.toFixed(2)}초`);

      console.log('\n' + '='.repeat(80));
      console.log('📊 최종 결과');
      console.log('='.repeat(80));
      console.log(`\n✅ Phase 5-1: 구조 분석`);
      console.log(`   패턴: ${analysis.mostSimilarPattern}`);
      console.log(`   신뢰도: ${analysis.confidence}%`);
      console.log(`\n✅ Phase 5-2: 코드 생성`);
      console.log(`   파일: ${codeResult.fileName}`);
      console.log(`\n✅ Phase 5-3: Sandbox 테스트`);
      console.log(`   성공 여부: 성공`);
      console.log(`   수집 개수: ${initialTestResult.jobsCollected}개`);
      console.log(`\n⏭️  Phase 5-4: Self-Correction Loop (건너뜀 - 이미 성공)`);

      return;
    }

    // ================================================================
    // Phase 5-4: Self-Correction Loop (초기 테스트 실패 시)
    // ================================================================
    console.log('\n❌ 초기 테스트 실패');
    console.log(`   오류 개수: ${initialTestResult.errors.length}개`);
    console.log(`   실행 시간: ${initialTestResult.executionTime.toFixed(2)}초`);

    if (initialTestResult.errors.length > 0) {
      console.log('\n⚠️  발견된 오류:');
      initialTestResult.errors.forEach((e, idx) => {
        console.log(`   ${idx + 1}. [${e.step}] ${e.error}`);
      });
    }

    console.log('\n💡 Self-Correction Loop를 시작합니다...');

    const correctionResult = await runSelfCorrectionLoop(
      boardName,
      boardUrl,
      analysis,
      codeResult.code,
      initialTestResult.errors,
      3 // 최대 3회 재시도
    );

    // ================================================================
    // 최종 결과 출력
    // ================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📊 최종 결과');
    console.log('='.repeat(80));

    console.log(`\n✅ Phase 5-1: 구조 분석`);
    console.log(`   패턴: ${analysis.mostSimilarPattern}`);
    console.log(`   신뢰도: ${analysis.confidence}%`);

    console.log(`\n✅ Phase 5-2: 코드 생성`);
    console.log(`   파일: ${codeResult.fileName}`);

    console.log(`\n${initialTestResult.success ? '✅' : '❌'} Phase 5-3: Sandbox 초기 테스트`);
    console.log(`   성공 여부: ${initialTestResult.success ? '성공' : '실패'}`);
    console.log(`   수집 개수: ${initialTestResult.jobsCollected}개`);
    console.log(`   오류 개수: ${initialTestResult.errors.length}개`);

    console.log(`\n${correctionResult.success ? '✅' : '❌'} Phase 5-4: Self-Correction Loop`);
    console.log(`   성공 여부: ${correctionResult.success ? '성공' : '실패'}`);
    console.log(`   총 시도 횟수: ${correctionResult.attemptCount}/3`);
    console.log(`   최종 오류: ${correctionResult.errors.length}개`);

    if (correctionResult.success) {
      console.log('\n🎉 자동 수정 성공! 크롤러가 정상 작동합니다.');
      console.log(`\n💾 최종 크롤러 코드 길이: ${correctionResult.finalCode?.length || 0} 글자`);
    } else {
      console.log('\n⚠️  자동 수정 실패. 수동 수정이 필요합니다.');
      if (correctionResult.errors.length > 0) {
        console.log('\n⚠️  남은 오류:');
        correctionResult.errors.forEach((e, idx) => {
          console.log(`   ${idx + 1}. [${e.step}] ${e.error}`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));

  } catch (error: any) {
    console.error('\n❌ 크롤링 프로세스 전체 실패:', error.message);
    if (error.stack) {
      console.error('\n📋 스택 트레이스:');
      console.error(error.stack);
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testFullPipelineWithSelfCorrection();

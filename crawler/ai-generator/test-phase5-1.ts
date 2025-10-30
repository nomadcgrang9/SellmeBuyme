/**
 * Phase 5-1 테스트: 게시판 구조 분석 Agent
 *
 * 테스트 대상: 성남교육지원청 게시판
 */

import { chromium } from 'playwright';
import { captureBoardData, analyzeBoardStructure } from './agents/boardAnalyzer.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// crawler 루트의 .env 파일 로드
dotenv.config({ path: join(__dirname, '../.env') });

async function testPhase51(): Promise<void> {
  console.log('🚀 Phase 5-1 테스트 시작\n');
  console.log('='.repeat(60));

  // 테스트 게시판 URL - 성남교육지원청 (기존 크롤러 있음, 검증 가능)
  const testBoardUrl = 'https://www.goesn.kr/goesn/na/ntt/selectNttList.do?mi=23603&bbsId=17872';

  let browser;

  try {
    // 1. Playwright 브라우저 시작
    console.log('\n[1단계] Playwright 브라우저 시작');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 2. 게시판 데이터 캡처
    console.log('\n[2단계] 게시판 HTML + 스크린샷 캡처');
    const capturedData = await captureBoardData(page, testBoardUrl);

    // 3. AI 구조 분석
    console.log('\n[3단계] AI 구조 분석 실행');
    const analysisResult = await analyzeBoardStructure(capturedData);

    // 4. 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 분석 결과 요약\n');

    if (analysisResult.success) {
      console.log('✅ 분석 성공!');
      console.log('\n📌 패턴 매칭:');
      console.log(`   - 가장 유사한 패턴: ${analysisResult.mostSimilarPattern}`);
      console.log(`   - 신뢰도: ${((analysisResult.confidence || 0) * 100).toFixed(1)}%`);

      if (analysisResult.listPage) {
        console.log('\n📋 목록 페이지 선택자:');
        console.log(`   - 컨테이너: ${analysisResult.listPage.containerSelector}`);
        console.log(`   - 행: ${analysisResult.listPage.rowSelector}`);
        console.log(`   - 제목: ${analysisResult.listPage.titleSelector}`);
        console.log(`   - 날짜: ${analysisResult.listPage.dateSelector}`);

        console.log('\n🔗 링크 추출 방식:');
        console.log(`   - 방법: ${analysisResult.listPage.linkExtraction.method}`);
        if (analysisResult.listPage.linkExtraction.attribute) {
          console.log(`   - 속성: ${analysisResult.listPage.linkExtraction.attribute}`);
        }
        if (analysisResult.listPage.linkExtraction.regex) {
          console.log(`   - 정규식: ${analysisResult.listPage.linkExtraction.regex}`);
        }
      }

      if (analysisResult.detailPage) {
        console.log('\n📄 상세 페이지 선택자:');
        console.log(`   - 본문: ${analysisResult.detailPage.contentSelector}`);
        console.log(`   - 첨부파일: ${analysisResult.detailPage.attachmentSelector}`);
        console.log(`   - 제목: ${analysisResult.detailPage.titleSelector}`);
      }

      console.log('\n💭 분석 이유:');
      console.log(`   ${analysisResult.reasoning}`);

      console.log('\n📝 전체 JSON:');
      console.log(JSON.stringify({
        mostSimilarPattern: analysisResult.mostSimilarPattern,
        confidence: analysisResult.confidence,
        listPage: analysisResult.listPage,
        detailPage: analysisResult.detailPage,
        reasoning: analysisResult.reasoning
      }, null, 2));

    } else {
      console.log('❌ 분석 실패');
      console.log(`   오류: ${analysisResult.error}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Phase 5-1 테스트 완료!');

  } catch (error: any) {
    console.error('\n❌ 테스트 실패:', error);
    console.error(error.stack);
    process.exit(1);

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 실행
testPhase51();

/**
 * Phase 5-2 테스트: 크롤러 코드 생성 Agent
 *
 * 테스트: Phase 5-1의 분석 결과를 사용하여 크롤러 코드 생성
 */

import { chromium } from 'playwright';
import { captureBoardData, analyzeBoardStructure } from './agents/boardAnalyzer.js';
import { generateCrawlerCode, saveCrawlerCode } from './agents/codeGenerator.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

async function testPhase52(): Promise<void> {
  console.log('🚀 Phase 5-2 테스트 시작\n');
  console.log('='.repeat(60));

  // 테스트 게시판 정보
  const testBoardUrl = 'https://www.goesn.kr/goesn/na/ntt/selectNttList.do?mi=23603&bbsId=17872';
  const testBoardName = '성남교육지원청 테스트';

  let browser;

  try {
    // 1. Playwright 브라우저 시작
    console.log('\n[1단계] Playwright 브라우저 시작');
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 2. 게시판 데이터 캡처
    console.log('\n[2단계] 게시판 데이터 캡처');
    const capturedData = await captureBoardData(page, testBoardUrl);

    // 3. AI 구조 분석
    console.log('\n[3단계] AI 구조 분석');
    const analysisResult = await analyzeBoardStructure(capturedData);

    if (!analysisResult.success) {
      throw new Error(`분석 실패: ${analysisResult.error}`);
    }

    console.log(`✅ 분석 완료 - 패턴: ${analysisResult.mostSimilarPattern}`);

    // 4. 크롤러 코드 생성
    console.log('\n[4단계] 크롤러 코드 생성');
    const codeResult = await generateCrawlerCode(analysisResult, testBoardName);

    if (!codeResult.success) {
      throw new Error(`코드 생성 실패: ${codeResult.error}`);
    }

    // 5. 결과 출력
    console.log('\n' + '='.repeat(60));
    console.log('📊 코드 생성 결과\n');

    console.log('✅ 생성 성공!');
    console.log(`\n📝 파일명: ${codeResult.filename}`);
    console.log(`📏 코드 길이: ${codeResult.code?.length} 글자`);

    if (codeResult.warnings && codeResult.warnings.length > 0) {
      console.log('\n⚠️  경고:');
      codeResult.warnings.forEach(w => console.log(`   - ${w}`));
    }

    // 코드 미리보기 (처음 50줄)
    console.log('\n📄 생성된 코드 미리보기 (처음 30줄):');
    console.log('─'.repeat(60));
    const codeLines = codeResult.code?.split('\n') || [];
    console.log(codeLines.slice(0, 30).join('\n'));
    console.log('─'.repeat(60));
    console.log(`... (총 ${codeLines.length}줄)\n`);

    // 6. 파일 저장 (temp 디렉토리에)
    console.log('[5단계] 파일 저장 (temp 디렉토리)');
    const tempDir = join(__dirname, 'temp');
    const savedPath = await saveCrawlerCode(
      codeResult.code!,
      codeResult.filename!,
      tempDir
    );

    console.log(`✅ 저장 완료: ${savedPath}`);

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Phase 5-2 테스트 완료!');
    console.log('\n💡 다음 단계:');
    console.log('   1. Phase 5-3: 생성된 크롤러를 Sandbox에서 실행');
    console.log('   2. 오류 발생 시 Phase 5-4: Self-Correction Loop로 재생성');

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
testPhase52();

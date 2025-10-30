import { chromium, Page, Browser } from 'playwright';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { TestExecutionResult, CrawlerError } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Phase 5-3: 테스트 실행 Sandbox
 *
 * 목적: 생성된 크롤러를 격리된 환경에서 테스트
 */

/**
 * 생성된 크롤러 코드를 격리 환경에서 실행
 */
export async function executeGeneratedCrawler(
  crawlerCode: string,
  boardUrl: string,
  boardName: string
): Promise<TestExecutionResult> {
  const startTime = Date.now();
  const logs: string[] = [];
  const errors: CrawlerError[] = [];
  const screenshots: string[] = [];
  let browser: Browser | null = null;
  let tempFilePath: string | null = null;

  console.log('\n🧪 [Phase 5-3] Sandbox 테스트 시작');
  console.log(`   게시판: ${boardName}`);
  console.log(`   URL: ${boardUrl}`);

  try {
    // 1. 임시 디렉토리 생성
    const tempDir = join(__dirname, '../temp');
    await mkdir(tempDir, { recursive: true });

    // 2. 임시 파일 생성
    const timestamp = Date.now();
    tempFilePath = join(tempDir, `test_${timestamp}.js`);
    await writeFile(tempFilePath, crawlerCode, 'utf-8');

    console.log(`   임시 파일: ${tempFilePath}`);

    // 3. Playwright 브라우저 시작
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // 4. 콘솔 로그 캡처
    page.on('console', msg => {
      const logMsg = `[${msg.type()}] ${msg.text()}`;
      logs.push(logMsg);
      // 중요 로그만 출력
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`   ${logMsg}`);
      }
    });

    // 5. 페이지 에러 캡처
    page.on('pageerror', err => {
      errors.push({
        step: 'page_error',
        error: err.message,
        timestamp: new Date()
      });
    });

    // 6. 동적 import로 크롤러 로드
    console.log('\n   크롤러 로드 중...');
    const crawlerModule = await import(`file://${tempFilePath}`);

    // 첫 번째 export된 함수 찾기
    const crawlFunction = Object.values(crawlerModule).find(
      exp => typeof exp === 'function'
    ) as ((page: Page, config: any) => Promise<any[]>) | undefined;

    if (!crawlFunction) {
      throw new Error('크롤러 함수를 찾을 수 없습니다');
    }

    console.log('   ✅ 크롤러 로드 완료');

    // 7. 크롤링 실행 (1개만 테스트 - 타임아웃 60초)
    console.log('\n   크롤링 실행 중 (1개만 테스트)...');

    const config = {
      url: boardUrl, // 목록 페이지 URL
      baseUrl: boardUrl,
      name: boardName,
      crawlBatchSize: 1, // 테스트는 1개만
      detailUrlTemplate: boardUrl, // 기본값
      listEndpoint: boardUrl, // POST 기반 크롤러용
      detailEndpoint: boardUrl.replace('selectNttList', 'selectNttInfo'), // 상세 페이지 엔드포인트
      selectors: {
        listContainer: 'table, .board-list, .list',
        rows: 'tbody tr, .list-item',
        title: 'td.title a, .title a, .subject a',
        date: 'td.date, .date',
        link: 'a',
        attachment: 'a[href*=download], a[href*=hwp]'
      }
    };

    const result = await Promise.race([
      crawlFunction(page, config),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('타임아웃 (60초 초과)')), 60000)
      )
    ]);

    console.log(`   ✅ 크롤링 완료: ${result.length}개 수집`);

    // 8. 결과 검증
    if (!Array.isArray(result)) {
      errors.push({
        step: 'validation',
        error: '크롤러가 배열을 반환하지 않았습니다'
      });
    }

    if (result.length === 0) {
      errors.push({
        step: 'validation',
        error: '수집된 데이터가 없습니다'
      });
    }

    // 첫 번째 아이템 검증
    if (result.length > 0) {
      const job = result[0];

      if (!job.title || job.title.length < 3) {
        errors.push({
          step: 'validation',
          error: `제목 유효성 검사 실패: "${job.title}"`
        });
      }

      if (!job.detailContent || job.detailContent.length < 50) {
        errors.push({
          step: 'validation',
          error: `본문 길이 부족: ${job.detailContent?.length || 0}자 (최소 50자 권장)`
        });
      }

      if (!job.link) {
        errors.push({
          step: 'validation',
          error: '링크 정보 누락'
        });
      }

      // 수집된 데이터 로그
      console.log('\n   📊 수집된 데이터:');
      console.log(`      제목: ${job.title?.substring(0, 50) || 'N/A'}`);
      console.log(`      날짜: ${job.date || 'N/A'}`);
      console.log(`      링크: ${job.link?.substring(0, 60) || 'N/A'}`);
      console.log(`      본문: ${job.detailContent?.length || 0}자`);
      console.log(`      첨부파일: ${job.attachmentUrl ? 'O' : 'X'}`);
    }

    // 9. 스크린샷 캡처
    const screenshot = await page.screenshot({
      fullPage: false,
      encoding: 'base64'
    });
    screenshots.push(screenshot);

    console.log(`   ✅ 스크린샷 캡처 완료`);

    // 10. 정리
    await browser.close();
    browser = null;

    // 임시 파일 삭제
    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }

    const executionTime = Date.now() - startTime;
    const success = errors.length === 0 && result.length > 0;

    console.log(`\n   ${success ? '✅' : '⚠️'} 테스트 ${success ? '성공' : '경고'}`);
    console.log(`   실행 시간: ${(executionTime / 1000).toFixed(2)}초`);
    console.log(`   수집: ${result.length}개`);
    console.log(`   오류: ${errors.length}개`);

    return {
      success,
      jobsCollected: result.length,
      errors,
      screenshots,
      executionTime,
      logs
    };

  } catch (error: any) {
    console.error(`\n   ❌ 실행 실패: ${error.message}`);

    const executionTime = Date.now() - startTime;

    return {
      success: false,
      jobsCollected: 0,
      errors: [{
        step: 'execution',
        error: error.message,
        timestamp: new Date()
      }],
      screenshots,
      executionTime,
      logs
    };

  } finally {
    // 정리
    if (browser) {
      await browser.close().catch(() => {});
    }

    if (tempFilePath) {
      await unlink(tempFilePath).catch(() => {});
    }
  }
}

/**
 * 테스트 결과를 분석하여 개선점 도출
 */
export function analyzeTestResult(result: TestExecutionResult): {
  needsImprovement: boolean;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  // 데이터 수집 실패
  if (result.jobsCollected === 0) {
    suggestions.push('선택자가 잘못되었을 가능성이 높습니다. HTML 구조를 다시 확인하세요.');
  }

  // 제목 검증 실패
  const titleError = result.errors.find(e => e.error.includes('제목'));
  if (titleError) {
    suggestions.push('제목 선택자를 수정하세요. 여러 fallback 선택자를 시도하세요.');
  }

  // 본문 검증 실패
  const contentError = result.errors.find(e => e.error.includes('본문'));
  if (contentError) {
    suggestions.push('상세 페이지 본문 선택자를 수정하세요.');
  }

  // 링크 검증 실패
  const linkError = result.errors.find(e => e.error.includes('링크'));
  if (linkError) {
    suggestions.push('링크 추출 방식(data-id/href/onclick)을 재검토하세요.');
  }

  // 타임아웃
  const timeoutError = result.errors.find(e => e.error.includes('타임아웃'));
  if (timeoutError) {
    suggestions.push('페이지 로딩 대기 시간을 조정하거나 선택자를 단순화하세요.');
  }

  return {
    needsImprovement: suggestions.length > 0,
    suggestions
  };
}

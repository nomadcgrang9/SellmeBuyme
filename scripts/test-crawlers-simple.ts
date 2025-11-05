import { readFileSync } from 'fs';
import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

const SOURCES_JSON_PATH = './crawler/config/sources.json';

interface SourceConfig {
  name: string;
  baseUrl: string;
  region?: string;
  isLocalGovernment?: boolean;
  active?: boolean;
}

async function testLegacyCrawler(source: string, config: SourceConfig) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${config.name} (${source})`);
  console.log(`${'='.repeat(80)}`);
  console.log(`URL: ${config.baseUrl}`);
  console.log(`Region: ${config.region || '(없음)'}`);
  console.log(`Local Government: ${config.isLocalGovernment ? 'Yes' : 'No'}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log(`\n🌐 페이지 접근 중...`);
    const response = await page.goto(config.baseUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });

    if (!response) {
      console.log(`❌ 페이지 응답 없음`);
      await browser.close();
      return false;
    }

    const status = response.status();
    console.log(`📡 HTTP Status: ${status}`);

    if (status !== 200) {
      console.log(`⚠️  비정상 응답 코드: ${status}`);
      await browser.close();
      return false;
    }

    const title = await page.title();
    console.log(`📄 Page Title: ${title}`);

    // HTML 구조 간단 체크
    const bodyContent = await page.evaluate(() => document.body.innerText.substring(0, 200));
    console.log(`📝 Body Preview: ${bodyContent.substring(0, 100)}...`);

    console.log(`\n✅ ${config.name} 접근 성공`);
    await browser.close();
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`\n❌ ${config.name} 접근 실패`);
    console.log(`오류: ${err.message}`);
    await browser.close();
    return false;
  }
}

async function main() {
  console.log('🔍 크롤러 간단 테스트 시작 (페이지 접근 검증)\n');

  // sources.json 로드
  let sourcesConfig: Record<string, SourceConfig>;
  try {
    const sourcesRaw = readFileSync(SOURCES_JSON_PATH, 'utf-8');
    sourcesConfig = JSON.parse(sourcesRaw);
    console.log(`✅ sources.json 로드 완료 (${Object.keys(sourcesConfig).length}개 소스)`);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(`❌ sources.json 로드 실패: ${err.message}`);
    process.exit(1);
  }

  const LEGACY_SOURCES = ['seongnam', 'gyeonggi', 'uijeongbu', 'namyangju'];
  const results: Record<string, boolean> = {};

  console.log('\n' + '='.repeat(80));
  console.log('Legacy 크롤러 테스트 (4개)');
  console.log('='.repeat(80));

  for (const source of LEGACY_SOURCES) {
    const config = sourcesConfig[source];
    if (!config) {
      console.log(`\n❌ ${source}: sources.json에 설정 없음`);
      results[source] = false;
      continue;
    }

    const success = await testLegacyCrawler(source, config);
    results[source] = success;

    // 다음 테스트까지 1초 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('테스트 요약');
  console.log('='.repeat(80));

  const successCount = Object.values(results).filter((r) => r).length;
  const totalCount = Object.keys(results).length;

  for (const [source, success] of Object.entries(results)) {
    console.log(`${success ? '✅' : '❌'} ${source}`);
  }

  console.log(`\n총 ${successCount}/${totalCount} 성공`);

  if (successCount === totalCount) {
    console.log(`\n🎉 모든 Legacy 크롤러 테스트 통과`);
  } else {
    console.log(`\n⚠️  일부 크롤러 테스트 실패`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ 테스트 실행 실패:', err);
  process.exit(1);
});

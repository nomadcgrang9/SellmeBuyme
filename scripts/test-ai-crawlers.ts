import { createClient } from '@supabase/supabase-js';
import { writeFileSync, unlinkSync } from 'fs';
import dotenv from 'dotenv';
import { chromium } from 'playwright';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경 변수 누락');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const AI_CRAWLERS = [
  { id: 'ce968fdd-6fe4-4fb7-8ec8-60d491932c6c', name: '남양주교육지원청-구인구직' },
  { id: 'de02eada-6569-45df-9f4d-45a4fcc51879', name: '가평교육지원청 기간제교원 구인구직' },
];

async function testAICrawler(boardId: string, name: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing AI Crawler: ${name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Board ID: ${boardId}`);

  // 1. DB에서 크롤러 코드 로드
  console.log(`\n🔍 DB에서 크롤러 코드 로드 중...`);
  const { data: board, error: boardError } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url, crawler_source_code, region, is_local_government')
    .eq('id', boardId)
    .single();

  if (boardError || !board) {
    console.log(`❌ DB 조회 실패: ${boardError?.message || '데이터 없음'}`);
    return false;
  }

  if (!board.crawler_source_code) {
    console.log(`❌ crawler_source_code가 NULL`);
    return false;
  }

  console.log(`✅ 크롤러 코드 로드 성공 (${board.crawler_source_code.length} chars)`);
  console.log(`   Board URL: ${board.board_url}`);
  console.log(`   Region: ${board.region || '(없음)'}`);
  console.log(`   Local Government: ${board.is_local_government ? 'Yes' : 'No'}`);

  // 2. 임시 파일 생성
  const tempFileName = `temp_test_crawler_${boardId}.mjs`;
  const tempFilePath = `./crawler/${tempFileName}`;

  try {
    console.log(`\n📝 임시 파일 생성: ${tempFilePath}`);
    writeFileSync(tempFilePath, board.crawler_source_code, 'utf-8');
    console.log(`✅ 임시 파일 생성 성공`);

    // 3. 동적 import
    console.log(`\n🔧 동적 import 시도...`);
    const crawlerModule = await import(`../crawler/${tempFileName}?t=${Date.now()}`);
    const crawlerFunc = Object.values(crawlerModule)[0];

    if (typeof crawlerFunc !== 'function') {
      console.log(`❌ 크롤러 함수를 찾을 수 없음 (타입: ${typeof crawlerFunc})`);
      unlinkSync(tempFilePath);
      return false;
    }

    console.log(`✅ 크롤러 함수 로드 성공`);

    // 4. 페이지 접근 테스트
    console.log(`\n🌐 페이지 접근 테스트...`);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      const response = await page.goto(board.board_url, {
        timeout: 15000,
        waitUntil: 'domcontentloaded',
      });

      if (!response) {
        console.log(`❌ 페이지 응답 없음`);
        await browser.close();
        unlinkSync(tempFilePath);
        return false;
      }

      const status = response.status();
      console.log(`📡 HTTP Status: ${status}`);

      if (status !== 200) {
        console.log(`⚠️  비정상 응답 코드: ${status}`);
        await browser.close();
        unlinkSync(tempFilePath);
        return false;
      }

      const title = await page.title();
      console.log(`📄 Page Title: ${title}`);

      console.log(`✅ 페이지 접근 성공`);
      await browser.close();
    } catch (error: unknown) {
      const err = error as Error;
      console.log(`❌ 페이지 접근 실패: ${err.message}`);
      await browser.close();
      unlinkSync(tempFilePath);
      return false;
    }

    // 5. 정리
    console.log(`\n🧹 임시 파일 삭제`);
    unlinkSync(tempFilePath);
    console.log(`✅ ${name} 검증 완료`);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`\n❌ 테스트 실패: ${err.message}`);
    try {
      unlinkSync(tempFilePath);
    } catch {}
    return false;
  }
}

async function main() {
  console.log('🔍 AI 크롤러 검증 시작 (2개)\n');

  const results: Record<string, boolean> = {};

  for (const crawler of AI_CRAWLERS) {
    const success = await testAICrawler(crawler.id, crawler.name);
    results[crawler.name] = success;

    // 다음 테스트까지 1초 대기
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log('\n' + '='.repeat(80));
  console.log('테스트 요약');
  console.log('='.repeat(80));

  const successCount = Object.values(results).filter((r) => r).length;
  const totalCount = Object.keys(results).length;

  for (const [name, success] of Object.entries(results)) {
    console.log(`${success ? '✅' : '❌'} ${name}`);
  }

  console.log(`\n총 ${successCount}/${totalCount} 성공`);

  if (successCount === totalCount) {
    console.log(`\n🎉 모든 AI 크롤러 테스트 통과`);
  } else {
    console.log(`\n⚠️  일부 AI 크롤러 테스트 실패`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ 테스트 실행 실패:', err);
  process.exit(1);
});

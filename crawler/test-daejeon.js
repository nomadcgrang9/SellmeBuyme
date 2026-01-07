/**
 * 대전광역시교육청 학교인사 크롤러 테스트
 * URL: https://www.dje.go.kr/boardCnts/list.do?boardID=54&m=030202&s=dje
 */
import { chromium } from 'playwright';
import { crawlDaejeon } from './sources/daejeon.js';
import { readFileSync } from 'fs';

async function main() {
  console.log('🚀 대전광역시교육청 학교인사 크롤러 테스트 시작\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false // 디버깅을 위해 브라우저 표시
  });

  const page = await browser.newPage({
    ignoreHTTPSErrors: true
  });

  // User-Agent 설정
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  try {
    // sources.json에서 설정 로드
    let sourcesConfig;
    try {
      sourcesConfig = JSON.parse(readFileSync('./crawler/config/sources.json', 'utf-8'));
    } catch (e) {
      sourcesConfig = JSON.parse(readFileSync('./config/sources.json', 'utf-8'));
    }

    const config = sourcesConfig.daejeon;
    config.crawlBatchSize = 3; // 테스트용으로 3개만

    console.log('📋 크롤링 설정:');
    console.log(`   이름: ${config.name}`);
    console.log(`   URL: ${config.baseUrl}`);
    console.log(`   Detail URL Template: ${config.detailUrlTemplate}`);
    console.log(`   배치 크기: ${config.crawlBatchSize}`);
    console.log();

    const jobs = await crawlDaejeon(page, config);

    console.log('\n' + '='.repeat(60));
    console.log('📊 테스트 결과');
    console.log('='.repeat(60));
    console.log(`총 수집: ${jobs.length}개`);

    if (jobs.length > 0) {
      console.log('\n📋 수집된 공고 목록:');
      jobs.forEach((job, i) => {
        console.log(`\n[${i + 1}] ${job.title}`);
        console.log(`    📍 지역: ${job.location}`);
        console.log(`    📅 등록일: ${job.date}`);
        console.log(`    🔗 URL: ${job.link}`);
        console.log(`    📝 본문 길이: ${job.detailContent?.length || 0}자`);
        if (job.attachmentUrl) {
          console.log(`    📎 첨부파일: ${job.attachmentFilename || '공고문'}`);
          console.log(`       ${job.attachmentUrl.substring(0, 100)}...`);
        }
        console.log(`    📸 스크린샷: ${job.screenshotBase64 ? '캡처됨' : '없음'} (${Math.round((job.screenshotBase64?.length || 0) / 1024)}KB)`);
      });

      // 첫 번째 공고 상세 정보 (스크린샷 제외)
      console.log('\n' + '-'.repeat(60));
      console.log('📄 첫 번째 공고 상세 정보 (스크린샷 제외):');
      const firstJob = { ...jobs[0] };
      if (firstJob.screenshotBase64) {
        firstJob.screenshotBase64 = `[${Math.round(firstJob.screenshotBase64.length / 1024)}KB 스크린샷]`;
      }
      console.log(JSON.stringify(firstJob, null, 2));
    } else {
      console.log('\n⚠️  수집된 공고가 없습니다.');
      console.log('   - HTML 구조가 변경되었을 수 있습니다.');
      console.log('   - 또는 현재 게시된 공고가 없을 수 있습니다.');
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
    console.error(error.stack);
  } finally {
    await browser.close();
  }

  console.log('\n✅ 테스트 완료');
}

main().catch(console.error);

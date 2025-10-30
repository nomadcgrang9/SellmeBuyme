import { chromium } from 'playwright';
import { crawlNamyangju } from './sources/namyangju.js';

async function testNamyangju() {
  console.log('🚀 구리남양주교육지원청 크롤러 테스트\n');
  console.log('='.repeat(80));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const config = {
      name: '구리남양주교육지원청 인력풀',
      crawlBatchSize: 3 // 테스트는 3개만
    };

    const jobs = await crawlNamyangju(page, config);

    console.log('\n' + '='.repeat(80));
    console.log('📊 테스트 결과');
    console.log('='.repeat(80));
    console.log(`\n✅ 수집 성공: ${jobs.length}개`);

    if (jobs.length > 0) {
      console.log('\n📋 수집된 데이터 샘플:\n');
      jobs.forEach((job, idx) => {
        console.log(`${idx + 1}. ${job.title}`);
        console.log(`   조직: ${job.organization}`);
        console.log(`   지역: ${job.location}`);
        console.log(`   등록일: ${job.structuredContent.registeredDate}`);
        console.log(`   첨부파일: ${job.structuredContent.attachments.length}개`);
        console.log(`   본문 길이: ${job.structuredContent.content.length}자`);
        console.log(`   URL: ${job.sourceUrl}`);
        console.log();
      });
    }

    console.log('='.repeat(80));
    console.log('🎉 테스트 성공!\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testNamyangju();

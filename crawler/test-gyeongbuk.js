/**
 * 경상북도교육청 크롤러 테스트
 */
import { chromium } from 'playwright';
import { crawlGyeongbuk } from './sources/gyeongbuk.js';

async function main() {
  console.log('🚀 경상북도교육청 크롤러 테스트 시작\n');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: true
  });

  const page = await browser.newPage({
    ignoreHTTPSErrors: true
  });

  try {
    const config = {
      name: '경상북도교육청',
      crawlBatchSize: 5  // 테스트용으로 5개만
    };

    const jobs = await crawlGyeongbuk(page, config);

    console.log('\n' + '='.repeat(60));
    console.log('📊 테스트 결과');
    console.log('='.repeat(60));
    console.log(`총 수집: ${jobs.length}개`);

    if (jobs.length > 0) {
      console.log('\n📋 수집된 공고 목록:');
      jobs.forEach((job, i) => {
        console.log(`\n[${i + 1}] ${job.title}`);
        console.log(`    📍 지역: ${job.location}`);
        console.log(`    🏫 기관: ${job.organization}`);
        console.log(`    📅 마감: ${job.deadline || '미지정'}`);
        console.log(`    🔗 URL: ${job.sourceUrl}`);
        if (job.structuredContent?.attachments?.length > 0) {
          console.log(`    📎 첨부: ${job.structuredContent.attachments.length}개`);
        }
      });

      // 첫 번째 공고 상세 정보
      console.log('\n' + '-'.repeat(60));
      console.log('📄 첫 번째 공고 상세 정보:');
      console.log(JSON.stringify(jobs[0], null, 2).substring(0, 2000));
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await browser.close();
  }

  console.log('\n✅ 테스트 완료');
}

main().catch(console.error);

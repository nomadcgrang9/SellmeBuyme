/**
 * AI 생성 크롤러 테스트 스크립트
 * 생성된 크롤러가 실제로 작동하는지 확인
 */

import { chromium } from 'playwright';
import { crawl남양주교육지원청구인구직테스트 } from './sources/남양주교육지원청-구인구직-테스트.js';

async function testAIGeneratedCrawler() {
  console.log('🧪 AI 생성 크롤러 테스트 시작\n');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const config = {
    name: '남양주교육지원청 구인구직 테스트',
    baseUrl: 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656',
    crawlBatchSize: 3, // 테스트이므로 3개만
  };

  try {
    console.log('📍 설정:');
    console.log(`   이름: ${config.name}`);
    console.log(`   URL: ${config.baseUrl}`);
    console.log(`   배치 크기: ${config.crawlBatchSize}\n`);

    const jobs = await crawl남양주교육지원청구인구직테스트(page, config);

    console.log('\n✅ 크롤링 완료!');
    console.log(`   수집된 공고: ${jobs.length}개\n`);

    if (jobs.length > 0) {
      console.log('📋 수집된 데이터 예시:');
      jobs.slice(0, 2).forEach((job, i) => {
        console.log(`\n${i + 1}. 제목: ${job.title}`);
        console.log(`   날짜: ${job.date}`);
        console.log(`   링크: ${job.link}`);
        console.log(`   본문 길이: ${job.detailContent?.length || 0}자`);
        console.log(`   첨부파일: ${job.attachmentUrl ? '있음' : '없음'}`);
        console.log(`   스크린샷: ${job.screenshotBase64 ? (job.screenshotBase64.length / 1024).toFixed(0) + 'KB' : '없음'}`);
      });

      console.log('\n🎉 테스트 성공! AI 생성 크롤러가 정상 작동합니다.');
    } else {
      console.warn('\n⚠️  수집된 데이터가 없습니다.');
    }

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

testAIGeneratedCrawler();

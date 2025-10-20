import { readFileSync } from 'fs';
import { createBrowser } from './lib/playwright.js';
import { crawlUijeongbu } from './sources/uijeongbu.js';

/**
 * 의정부교육지원청 크롤러 테스트
 */
async function testUijeongbu() {
  console.log('\n🧪 의정부교육지원청 크롤러 테스트 시작\n');
  
  // 1. 설정 파일 로드
  const sourcesConfig = JSON.parse(
    readFileSync('./config/sources.json', 'utf-8')
  );
  
  const config = sourcesConfig.uijeongbu;
  
  if (!config) {
    console.error('❌ 의정부 설정을 찾을 수 없습니다.');
    process.exit(1);
  }
  
  // 테스트용 배치 크기 설정 (3개만)
  config.crawlBatchSize = 3;
  
  console.log('📋 설정 정보:');
  console.log(`   이름: ${config.name}`);
  console.log(`   URL: ${config.baseUrl}`);
  console.log(`   배치 크기: ${config.crawlBatchSize}`);
  console.log('');
  
  let browser;
  
  try {
    // 2. 브라우저 시작
    console.log('🌐 브라우저 시작 중...');
    browser = await createBrowser();
    const page = await browser.newPage();
    
    // User-Agent 설정
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    // 3. 크롤링 실행
    console.log('🔍 크롤링 시작...\n');
    const jobs = await crawlUijeongbu(page, config);
    
    // 4. 결과 출력
    console.log('\n📊 크롤링 결과:');
    console.log(`   수집된 공고 수: ${jobs.length}개\n`);
    
    if (jobs.length > 0) {
      console.log('📄 수집된 공고 목록:\n');
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.title}`);
        console.log(`   날짜: ${job.date}`);
        console.log(`   링크: ${job.link}`);
        console.log(`   본문 길이: ${job.detailContent?.length || 0}자`);
        console.log(`   첨부파일: ${job.attachmentUrl ? '있음' : '없음'}`);
        if (job.attachmentFilename) {
          console.log(`   파일명: ${job.attachmentFilename}`);
        }
        console.log(`   스크린샷: ${job.screenshotBase64 ? '있음' : '없음'}`);
        console.log('');
      });
      
      // 첫 번째 공고의 본문 일부 출력
      if (jobs[0].detailContent) {
        console.log('📝 첫 번째 공고 본문 미리보기:');
        console.log(jobs[0].detailContent.substring(0, 300));
        console.log('...\n');
      }
    }
    
    console.log('✅ 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      console.log('\n🔒 브라우저 종료 중...');
      await browser.close();
    }
  }
}

// 실행
testUijeongbu().catch(console.error);

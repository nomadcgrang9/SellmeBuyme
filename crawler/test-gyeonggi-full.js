/**
 * 경기도 크롤러 전체 테스트 (게시판 정보 + 상세 정보 병합)
 */

import { chromium } from 'playwright';
import { crawlGyeonggi } from './sources/gyeonggi.js';
import fs from 'fs';

async function testFullCrawl() {
  const config = JSON.parse(fs.readFileSync('./config/sources.json', 'utf-8'));
  console.log('🧪 경기도 크롤러 전체 테스트 시작\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // 1개만 테스트하도록 설정
    const testConfig = {
      ...config.gyeonggi,
      crawlBatchSize: 1
    };
    
    const jobs = await crawlGyeonggi(page, testConfig);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 크롤링 결과 요약');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    jobs.forEach((job, idx) => {
      console.log(`\n📌 공고 ${idx + 1}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🏫 학교명: ${job.schoolName || '(없음)'}`);
      console.log(`📝 제목: ${job.title || '(없음)'}`);
      console.log(`📞 연락처: ${job.phone || '(없음)'}`);
      console.log(`📍 지역: ${job.location || '(없음)'}`);
      console.log(`👥 채용인원: ${job.recruitCount || '(없음)'}명`);
      console.log(`💼 직무분야: ${job.jobField || '(없음)'}`);
      console.log(`📅 접수기간: ${job.applicationStart} ~ ${job.applicationEnd}`);
      console.log(`📅 채용기간: ${job.employmentStart} ~ ${job.employmentEnd}`);
      console.log(`📆 등록일: ${job.registeredDate || '(없음)'}`);
      console.log(`👁️  조회수: ${job.viewCount || '(없음)'}`);
      console.log(`⏰ 마감상태: ${job.deadlineStatus || '(없음)'}`);
      console.log(`🔗 링크: ${job.link || '(없음)'}`);
      console.log(`📎 첨부파일: ${job.attachmentFilename || '(없음)'}`);
      console.log(`📄 본문 길이: ${job.detailContent ? job.detailContent.length : 0}자`);
      console.log(`📸 스크린샷: ${job.screenshotBase64 ? 'O' : 'X'}`);
    });
    
    console.log('\n✅ 테스트 완료!');
    
  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  } finally {
    await browser.close();
  }
}

testFullCrawl();

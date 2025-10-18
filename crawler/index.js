import { readFileSync } from 'fs';
import { createBrowser } from './lib/playwright.js';
import { normalizeJobData, validateJobData } from './lib/gemini.js';
import { getOrCreateCrawlSource, saveJobPosting, updateCrawlSuccess, incrementErrorCount } from './lib/supabase.js';
import { crawlSeongnam } from './sources/seongnam.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 메인 크롤링 실행
 */
async function main() {
  console.log('🚀 셀미바이미 크롤러 시작\n');
  console.log('=' .repeat(50));
  
  // 1. 설정 파일 로드
  const sourcesConfig = JSON.parse(
    readFileSync('./config/sources.json', 'utf-8')
  );
  
  // 2. 크롤링 대상 선택 (현재는 성남만)
  const targetSource = process.argv.includes('--source=seongnam') 
    ? 'seongnam' 
    : 'seongnam'; // 기본값
  
  const config = sourcesConfig[targetSource];
  
  if (!config || !config.active) {
    console.error(`❌ 소스 '${targetSource}'를 찾을 수 없거나 비활성화됨`);
    process.exit(1);
  }
  
  let browser;
  let successCount = 0;
  let failCount = 0;
  
  try {
    // 3. Supabase에서 크롤링 소스 ID 가져오기
    const crawlSourceId = await getOrCreateCrawlSource(config.name, config.baseUrl);
    console.log(`📌 크롤링 소스 ID: ${crawlSourceId}\n`);
    
    // 4. 브라우저 시작
    browser = await createBrowser();
    const page = await browser.newPage();
    
    // User-Agent 설정 (봇 감지 우회)
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    // 5. 크롤링 실행
    const rawJobs = await crawlSeongnam(page, config);
    
    if (rawJobs.length === 0) {
      console.warn('⚠️  수집된 공고가 없습니다. HTML 구조 변경 의심');
      await incrementErrorCount(crawlSourceId);
      process.exit(0);
    }
    
    // 6. AI 정규화 및 저장
    console.log('🤖 AI 정규화 시작...\n');
    
    for (const rawJob of rawJobs) {
      try {
        // 6-1. AI 정규화
        const normalized = await normalizeJobData(rawJob, config.name);
        
        if (!normalized) {
          failCount++;
          continue;
        }
        
        // 6-2. AI 검증
        const validation = await validateJobData(normalized);
        
        if (!validation.is_valid) {
          console.warn(`⚠️  검증 실패: ${normalized.title}`);
          failCount++;
          continue;
        }
        
        // 6-3. 원본 데이터 병합
        const finalData = {
          ...validation.corrected_data,
          detail_content: rawJob.detailContent,
          attachment_url: rawJob.attachmentUrl,
        };
        
        // 6-4. Supabase 저장
        const saved = await saveJobPosting(finalData, crawlSourceId);
        
        if (saved) {
          successCount++;
        } else {
          failCount++;
        }
        
        // API 호출 제한 방지 (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ 처리 실패: ${rawJob.title} - ${error.message}`);
        failCount++;
      }
    }
    
    // 7. 성공 시간 업데이트
    await updateCrawlSuccess(crawlSourceId);
    
  } catch (error) {
    console.error(`\n❌ 크롤링 실패: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // 8. 결과 출력
  console.log('\n' + '='.repeat(50));
  console.log('📊 크롤링 결과');
  console.log('='.repeat(50));
  console.log(`✅ 성공: ${successCount}개`);
  console.log(`❌ 실패: ${failCount}개`);
  console.log(`📈 성공률: ${((successCount / (successCount + failCount)) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));
  
  if (successCount === 0) {
    console.error('\n⚠️  경고: 저장된 공고가 없습니다. 설정을 확인하세요.');
    process.exit(1);
  }
  
  console.log('\n✨ 크롤링 완료!');
}

// 실행
main().catch(console.error);

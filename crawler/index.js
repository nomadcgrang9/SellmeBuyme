import { readFileSync } from 'fs';
import { createBrowser } from './lib/playwright.js';
import { normalizeJobData, validateJobData, analyzePageScreenshot, structureDetailContent } from './lib/gemini.js';
import { getOrCreateCrawlSource, saveJobPosting, updateCrawlSuccess, incrementErrorCount, getExistingJobBySource } from './lib/supabase.js';
import { crawlSeongnam } from './sources/seongnam.js';
import { crawlGyeonggi } from './sources/gyeonggi.js';
import { crawlUijeongbu } from './sources/uijeongbu.js';
import { getTokenUsage, resetTokenUsage } from './lib/gemini.js';
import dotenv from 'dotenv';
import { logInfo, logStep, logWarn, logError, logDebug } from './lib/logger.js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const downloadFunctionUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/download-attachment`
  : null;

/**
 * URL에서 파일명 추출
 */
function extractFilenameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop();
    
    // 파일 확장자가 있는 경우만 반환
    if (filename && /\.(hwp|hwpx|pdf|doc|docx|xls|xlsx)$/i.test(filename)) {
      return filename;
    }

    // URL 파라미터에서 파일명 찾기
    const params = urlObj.searchParams;
    for (const [key, value] of params.entries()) {
      if (/filename|file|name/i.test(key) && value) {
        return value;
      }
    }
  } catch (error) {
    // URL 파싱 실패 시 null 반환
  }
  return null;
}

function sanitizeFilenameComponent(value) {
  if (!value) {
    return '';
  }
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractExtension(filename) {
  if (!filename) {
    return null;
  }
  const match = filename.match(/\.([a-zA-Z0-9]+)(?:$|\?)/);
  return match ? match[1].toLowerCase() : null;
}

function buildCanonicalAttachmentFilename({
  correctedData,
  normalized,
  visionData,
  rawJob,
  candidateFilename,
}) {
  const organizationName = sanitizeFilenameComponent(
    correctedData?.organization ||
    normalized?.organization ||
    visionData?.school_name ||
    rawJob?.organization ||
    rawJob?.title
  );

  const baseName = organizationName ? `${organizationName} 공고문` : '공고문';

  const extension = extractExtension(candidateFilename) || 'hwp';

  return `${baseName}.${extension}`;
}

function buildAttachmentDownloadUrl(originalUrl, filename) {
  if (!originalUrl) {
    return null;
  }

  if (downloadFunctionUrl) {
    const params = new URLSearchParams({ url: originalUrl });
    if (filename) {
      params.set('filename', filename);
    }
    return `${downloadFunctionUrl}?${params.toString()}`;
  }

  const fallbackName = filename || '공고문.hwp';
  return `${originalUrl}#filename=${encodeURIComponent(fallbackName)}`;
}

/**
 * 급여 정보 요약 (30자 이내)
 */
function summarizeCompensation(text) {
  // 규칙 기반 요약
  if (text.includes('공무원보수규정') || text.includes('호봉')) {
    return '월급여 (호봉제)';
  }
  if (text.includes('시간당') || text.includes('시급')) {
    const match = text.match(/(\d{1,3}(,\d{3})*)\s*원/);
    return match ? `시급 ${match[1]}원` : '시급 협의';
  }
  if (text.includes('일당') || text.includes('일 ')) {
    const match = text.match(/(\d{1,3}(,\d{3})*)\s*원/);
    return match ? `일 ${match[1]}원` : '일급 협의';
  }
  if (text.includes('월')) {
    const match = text.match(/(\d{1,3}(,\d{3})*)\s*원/);
    return match ? `월 ${match[1]}원` : '월급여';
  }
  
  // 30자 이내면 그대로 반환
  if (text.length <= 30) {
    return text;
  }
  
  // 그 외는 "협의"
  return '급여 협의';
}

/**
 * 메인 크롤링 실행
 */
async function main() {
  logInfo('main', '셀미바이미 크롤러 시작');
  logDebug('main', '실행 설정 로드', { argv: process.argv.slice(2) });
  
  // 1. 설정 파일 로드
  const sourcesConfig = JSON.parse(
    readFileSync('./config/sources.json', 'utf-8')
  );
  
  // 2. 크롤링 대상 선택
  let targetSource = 'seongnam'; // 기본값
  
  const sourceArg = process.argv.find(arg => arg.startsWith('--source='));
  if (sourceArg) {
    targetSource = sourceArg.split('=')[1];
  }
  
  const config = sourcesConfig[targetSource];
  
  if (!config || !config.active) {
    logError('main', '소스를 찾을 수 없거나 비활성화됨', null, { targetSource });
    process.exit(1);
  }
  
  let browser;
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  let rawJobs = [];

  try {
    // 토큰 사용량 초기화
    resetTokenUsage();

    // 3. Supabase에서 크롤링 소스 정보 가져오기
    const crawlSourceInfo = await getOrCreateCrawlSource(config.name, config.baseUrl);
    const crawlSourceId = crawlSourceInfo.id;
    const crawlBatchSize = crawlSourceInfo.crawlBatchSize || 10;
    
    logStep('main', '크롤링 소스 정보 확보', { crawlSourceId, crawlBatchSize });
    
    // config에 crawlBatchSize 추가
    config.crawlBatchSize = crawlBatchSize;
    
    // 4. 브라우저 시작
    logStep('browser', 'Playwright 브라우저 생성 시작');
    browser = await createBrowser();
    const page = await browser.newPage();
    logStep('browser', '새 페이지 생성 완료');
    
    // User-Agent 설정 (봇 감지 우회)
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });
    
    // 5. 크롤링 실행
    if (targetSource === 'seongnam') {
      logStep('crawler', '성남교육지원청 크롤링 호출');
      const jobs = await crawlSeongnam(page, config);
      rawJobs = jobs.map(job => ({ ...job, hasContentImages: job.hasContentImages }));
    } else if (targetSource === 'gyeonggi') {
      logStep('crawler', '경기도교육청 크롤링 호출');
      rawJobs = await crawlGyeonggi(page, config);
    } else if (targetSource === 'uijeongbu') {
      logStep('crawler', '의정부교육지원청 크롤링 호출');
      rawJobs = await crawlUijeongbu(page, config);
    } else {
      throw new Error(`지원하지 않는 소스: ${targetSource}`);
    }
    
    if (rawJobs.length === 0) {
      logWarn('crawler', '수집된 공고 없음, HTML 구조 변경 의심', { targetSource });
      await incrementErrorCount(crawlSourceId);
      process.exit(0);
    }
    
    // 6. 중복 체크 및 AI 정규화
    logStep('pipeline', '중복 체크 및 AI 정규화 시작', { jobCount: rawJobs.length });
    
    for (const rawJob of rawJobs) {
      try {
        // 6-1. 중복 체크 (AI 처리 전)
        logDebug('pipeline', '중복 여부 확인', { link: rawJob.link });
        const existing = await getExistingJobBySource(rawJob.link);

        const needsAttachmentRefresh = existing && (
          !existing.attachment_url ||
          existing.attachment_url === rawJob.attachmentUrl ||
          !existing.attachment_url.includes('filename=')
        );

        if (existing) {
          if (needsAttachmentRefresh) {
            logStep('pipeline', '기존 공고 재처리 (첨부파일 갱신)', {
              title: rawJob.title,
              link: rawJob.link,
              previousAttachmentUrl: existing.attachment_url
            });
          } else {
            // 완전 중복 공고 - AI 처리 건너뛰기
            logInfo('pipeline', '중복 공고 건너뛰기 (AI 토큰 절약)', {
              title: rawJob.title,
              link: rawJob.link,
            });
            skippedCount++;
            continue;
          }
        }

        let visionData = null;

        // 6-2. 스크린샷이 있으면 Gemini Vision으로 분석
        if (rawJob.screenshotBase64) {
          logStep('pipeline', 'Gemini Vision 분석 시작', { title: rawJob.title });
          visionData = await analyzePageScreenshot(rawJob.screenshotBase64);
          logDebug('pipeline', 'Gemini Vision 분석 완료', { title: rawJob.title, visionData });
        }
        
        // 6-3. AI 정규화 (텍스트 기반)
        const normalized = await normalizeJobData(rawJob, config.name);
        
        if (!normalized) {
          failCount++;
          continue;
        }
        
        // 6-4. Vision 데이터로 보강 (우선순위: Vision > 텍스트)
        if (visionData) {
          normalized.organization = visionData.school_name || normalized.organization;
          normalized.title = visionData.job_title || normalized.title;
          normalized.job_type = visionData.job_type || normalized.job_type;
          normalized.compensation = visionData.compensation || normalized.compensation;
          normalized.deadline = visionData.deadline || normalized.deadline;
          normalized.tags = visionData.subjects || normalized.tags;
          normalized.application_period = visionData.application_period || normalized.application_period;
          normalized.work_period = visionData.work_period || normalized.work_period;
          normalized.contact = visionData.contact || normalized.contact;
          normalized.qualifications = visionData.qualifications || normalized.qualifications;
          normalized.work_time = visionData.work_time || normalized.work_time;

          // 급여 정보 후처리 (12자 초과 시 강제 요약)
          if (normalized.compensation && normalized.compensation.length > 12) {
            logWarn('pipeline', '급여 정보 12자 초과, 요약 시도', { title: normalized.title, original: normalized.compensation });
            normalized.compensation = summarizeCompensation(normalized.compensation);
            logDebug('pipeline', '급여 요약 완료', { title: normalized.title, summarized: normalized.compensation });
          }
        }
        
        // 6-4. AI 검증
        const validation = await validateJobData(normalized);
        
        if (!validation.is_valid) {
          logWarn('pipeline', '검증 실패', { title: normalized.title });
          failCount++;
          continue;
        }

        // 6-5. 상세 본문 구조화
        const structuredContent = await structureDetailContent(rawJob.detailContent);

        const candidateAttachmentFilename = rawJob.attachmentFilename
          || rawJob.attachments?.[0]?.name
          || extractFilenameFromUrl(rawJob.attachmentUrl);

        const canonicalAttachmentFilename = buildCanonicalAttachmentFilename({
          correctedData: validation.corrected_data,
          normalized,
          visionData,
          rawJob,
          candidateFilename: candidateAttachmentFilename,
        });

        const attachmentUrlWithFilename = buildAttachmentDownloadUrl(
          rawJob.attachmentUrl,
          canonicalAttachmentFilename
        );

        // 6-6. 원본 데이터 병합 (우선순위: 게시판 정보 > AI 분석 > Vision)
        const finalData = {
          ...validation.corrected_data,
          
          // 게시판에서 추출한 구조화된 정보 우선 반영
          location: rawJob.location || validation.corrected_data.location || config.region || '미상',
          organization: rawJob.schoolName || validation.corrected_data.organization,
          
          // 상세 정보
          detail_content: rawJob.detailContent,
          attachment_url: attachmentUrlWithFilename,
          
          // 날짜 및 기간 정보 (게시판 > AI > Vision)
          application_period: rawJob.applicationStart && rawJob.applicationEnd 
            ? `${rawJob.applicationStart} ~ ${rawJob.applicationEnd}`
            : normalized.application_period || visionData?.application_period || null,
          work_period: rawJob.employmentStart && rawJob.employmentEnd
            ? `${rawJob.employmentStart} ~ ${rawJob.employmentEnd}`
            : normalized.work_period || visionData?.work_period || null,
          
          // 기타 정보
          work_time: normalized.work_time || visionData?.work_time || null,
          contact: rawJob.phone || normalized.contact || visionData?.contact || null,
          qualifications: normalized.qualifications || visionData?.qualifications || [],
          structured_content: structuredContent,
        };

        // 6-6. Supabase 저장
        logDebug('pipeline', '저장 시도', { title: finalData.title, crawlSourceId });
        const hasContentImages = !!rawJob.hasContentImages;
        const saved = await saveJobPosting(finalData, crawlSourceId, hasContentImages);

        if (saved) {
          successCount++;
          logInfo('pipeline', '저장 완료', { title: finalData.title, id: saved.id });
        } else {
          failCount++;
          logWarn('pipeline', '저장 실패', { title: finalData.title });
        }
        
        // API 호출 제한 방지 (1초 대기)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        logError('pipeline', '공고 처리 실패', error, { title: rawJob.title, link: rawJob.link });
        failCount++;
      }
    }
    
    // 7. 성공 시간 업데이트
    logStep('supabase', '크롤링 성공 시간 업데이트', { crawlSourceId });
    await updateCrawlSuccess(crawlSourceId);

  } catch (error) {
    logError('main', '크롤링 실패', error, { targetSource });
    process.exit(1);
  } finally {
    if (browser) {
      logStep('browser', '브라우저 종료');
      await browser.close();
    }
  }
  
  // 8. 결과 출력
  const processedCount = rawJobs.length - skippedCount;
  const efficiency = processedCount > 0
    ? Number(((successCount / processedCount) * 100).toFixed(1))
    : 0;

  logStep('summary', '크롤링 결과 요약', {
    total: rawJobs.length,
    successCount,
    skippedCount,
    failCount,
    processedCount,
    efficiency
  });

  // 토큰 사용량 출력
  const tokenUsage = getTokenUsage();
  console.log('\n🧠 AI 토큰 사용량:');
  console.log(`  - API 호출 횟수: ${tokenUsage.apiCalls}회`);
  console.log(`  - 입력 토큰: ${tokenUsage.totalPromptTokens.toLocaleString()}개`);
  console.log(`  - 출력 토큰: ${tokenUsage.totalCandidatesTokens.toLocaleString()}개`);
  console.log(`  - 총 토큰: ${tokenUsage.totalTokens.toLocaleString()}개`);
  if (successCount > 0) {
    const avgTokensPerJob = Math.round(tokenUsage.totalTokens / successCount);
    console.log(`  - 공고당 평균: ${avgTokensPerJob.toLocaleString()}개`);
  }
  console.log('');

  if (successCount === 0) {
    logWarn('summary', '저장된 공고 없음', {
      targetSource,
      skippedCount,
      failCount,
      rawTotal: rawJobs.length
    });
    process.exit(2);
  }
  
  logInfo('main', '크롤링 완료', {
    targetSource,
    successCount,
    skippedCount,
    failCount,
    processedCount,
    rawTotal: rawJobs.length,
    efficiency
  });
}

// 실행
main().catch(console.error);

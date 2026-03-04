import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { createBrowser } from './lib/playwright.js';
import { normalizeJobData, validateJobData, analyzePageScreenshot, structureDetailContent, inferMissingJobAttributes } from './lib/gemini.js';
import { getOrCreateCrawlSource, saveJobPosting, updateCrawlSuccess, incrementErrorCount, recordCrawlFailure, getExistingJobBySource, supabase } from './lib/supabase.js';
import { crawlGyeonggi } from './sources/gyeonggi.js';
import { crawlGyeongnam } from './sources/gyeongnam.js';
import { crawlNttPattern } from './sources/nttPattern.js';
// import { crawlUijeongbu } from './sources/uijeongbu.js'; // NTT 패턴 사용
// import { crawlNamyangju } from './sources/namyangju.js'; // NTT 패턴 사용
import { crawlIncheon } from './sources/incheon.js';
import { crawlSeoul } from './sources/seoul.js';
import { crawlGangwon } from './sources/gangwon.js';
import { crawlGwangju } from './sources/gwangju.js';
import { crawlJeonbuk } from './sources/jeonbuk.js';
import { crawlJeonnam } from './sources/jeonnam.js';
import { crawlJeju } from './sources/jeju.js';
import { crawlUlsan } from './sources/ulsan.js';
import { crawlDaejeon } from './sources/daejeon.js';
import { crawlChungbuk } from './sources/chungbuk.js';
import { crawlChungnam } from './sources/chungnam.js';
import { crawlSejong } from './sources/sejong.js';
import { getTokenUsage, resetTokenUsage } from './lib/gemini.js';
import { parseJobField, deriveJobAttributes } from './lib/jobFieldParser.js';
import { checkRobotsTxt, validateAccess, exponentialBackoff } from './lib/accessChecker.js';
import dotenv from 'dotenv';
import { logInfo, logStep, logWarn, logError, logDebug } from './lib/logger.js';
import { updateSourceStart, updateSourceComplete, updateSourceFailed, updateSourceProgress } from './lib/progressTracker.js';

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
    // Edge Function 호출 시 anon key 포함 (Supabase 인증 우회)
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.ANON_KEY;
    if (anonKey) {
      params.set('apikey', anonKey);
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
  let sourcesConfig;
  try {
    sourcesConfig = JSON.parse(readFileSync('./crawler/config/sources.json', 'utf-8'));
  } catch (e) {
    try {
      sourcesConfig = JSON.parse(readFileSync('./config/sources.json', 'utf-8'));
    } catch (e2) {
      console.error('Failed to load sources.json from ./crawler/config/ or ./config/');
      process.exit(1);
    }
  }

  // 2. 크롤링 대상 선택
  let targetSource = 'seongnam'; // 기본값
  let boardId = null; // AI 생성 크롤러용

  const sourceArg = process.argv.find(arg => arg.startsWith('--source='));
  if (sourceArg) {
    targetSource = sourceArg.split('=')[1];
  }

  const boardIdArg = process.argv.find(arg => arg.startsWith('--board-id='));
  if (boardIdArg) {
    boardId = boardIdArg.split('=')[1];
    targetSource = 'ai-generated'; // AI 생성 크롤러로 표시
  }

  const config = sourcesConfig[targetSource];

  if (!config && targetSource !== 'ai-generated') {
    logError('main', '소스를 찾을 수 없거나 비활성화됨', null, { targetSource });
    process.exit(1);
  }

  // AI 생성 크롤러인 경우 board_id 환경변수에서 크롤러 코드 로드
  if (targetSource === 'ai-generated' && boardId) {
    logStep('main', 'AI 생성 크롤러 실행', { boardId });

    try {
      // 1. Supabase에서 crawler_source_code 로드
      logStep('ai-crawler', 'DB에서 크롤러 코드 로드 중...', { boardId });
      const { data: board, error: boardError } = await supabase
        .from('crawl_boards')
        .select('id, name, board_url, crawler_source_code, crawl_batch_size, region, is_local_government')
        .eq('id', boardId)
        .single();

      if (boardError || !board) {
        logError('ai-crawler', 'crawl_boards 조회 실패', boardError, { boardId });
        process.exit(1);
      }

      if (!board.crawler_source_code) {
        logError('ai-crawler', 'crawler_source_code가 null입니다', null, { boardId, boardName: board.name });
        process.exit(1);
      }

      logStep('ai-crawler', '크롤러 코드 로드 완료', {
        boardName: board.name,
        codeLength: board.crawler_source_code.length
      });

      // 2. 임시 파일로 저장
      const tempFileName = `temp_crawler_${boardId}.mjs`;
      const tempFileUrl = new URL(tempFileName, import.meta.url);
      const tempFilePath = tempFileUrl.pathname.startsWith('/') && process.platform === 'win32'
        ? tempFileUrl.pathname.substring(1) // Windows: remove leading slash
        : tempFileUrl.pathname;
      writeFileSync(tempFilePath, board.crawler_source_code, 'utf-8');
      logStep('ai-crawler', '임시 파일 생성', { tempFilePath });

      // 3. 동적 import로 크롤러 함수 로드
      const crawlerModule = await import(tempFileUrl.href + `?t=${Date.now()}`);
      const crawlerFunc = Object.values(crawlerModule)[0]; // export된 첫 함수

      if (typeof crawlerFunc !== 'function') {
        logError('ai-crawler', '크롤러 함수를 찾을 수 없습니다', null, { tempFilePath });
        try { unlinkSync(tempFilePath); } catch (e) { }
        process.exit(1);
      }

      logStep('ai-crawler', '크롤러 함수 로드 완료');

      // 4. 브라우저 시작
      resetTokenUsage();
      logStep('browser', 'Playwright 브라우저 생성 시작');
      const browser = await createBrowser();
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      });
      logStep('browser', '새 페이지 생성 완료');

      // 5. 크롤러 실행
      logStep('ai-crawler', '크롤링 시작', { boardName: board.name, url: board.board_url });
      const jobs = await crawlerFunc(page, {
        name: board.name,
        url: board.board_url,
        crawlBatchSize: board.crawl_batch_size || 10,
        region: board.region,
        isLocalGovernment: board.is_local_government,
      });

      logStep('ai-crawler', '크롤링 완료', { jobCount: jobs.length });

      // 6. crawl_sources 정보 가져오기 (또는 생성)
      const crawlSourceInfo = await getOrCreateCrawlSource(board.name, board.board_url);
      const crawlSourceId = crawlSourceInfo.id;

      // 7. DB에 저장 (Gemini AI 정규화 적용)
      let successCount = 0;
      let skippedCount = 0;

      for (const job of jobs) {
        try {
          // 중복 체크
          const existing = await getExistingJobBySource(job.link || job.url);
          if (existing) {
            logDebug('ai-crawler', '중복 공고 스킵', { url: job.link || job.url });
            skippedCount++;
            continue;
          }

          const detailContent = job.detailContent || job.detail_content || '';
          const screenshotBase64 = job.screenshot_base64 || job.screenshotBase64;

          // 디버그: job 객체 keys 확인
          logDebug('ai-crawler', 'Job 객체 keys 확인', {
            keys: Object.keys(job),
            hasScreenshot: !!screenshotBase64,
            screenshotLength: screenshotBase64?.length || 0
          });

          let visionData = null;

          // 🔍 Vision AI 분석 (스크린샷 있으면 최우선 사용)
          if (screenshotBase64) {
            try {
              logStep('ai-crawler', 'Vision AI 분석 시작', { title: job.title });
              visionData = await analyzePageScreenshot(screenshotBase64);

              if (visionData) {
                logInfo('ai-crawler', 'Vision AI 분석 완료', {
                  school: visionData.school_name,
                  job: visionData.job_title,
                  deadline: visionData.deadline
                });
              }
            } catch (visionError) {
              logWarn('ai-crawler', 'Vision AI 분석 실패, fallback 사용', { error: visionError.message });
            }
          }

          // 텍스트 기반 AI 정규화 (Vision 실패 시 fallback)
          let normalized = null;
          if (!visionData) {
            normalized = await normalizeJobData({
              title: job.title,
              date: job.date || '',
              link: job.link || job.url,
              detailContent: detailContent
            }, board.name);

            if (!normalized) {
              logWarn('ai-crawler', 'AI 정규화 실패, 원본 데이터 사용', { title: job.title });
            }
          }

          // Vision 데이터 우선, 없으면 normalized, 없으면 fallback
          const finalOrganization = visionData?.school_name || normalized?.organization || job.organization || board.name;
          const finalTitle = visionData?.job_title || normalized?.title || job.title;

          // Location: 기초/광역 자치단체 구분
          let finalLocation;
          if (board.is_local_government) {
            // 기초자치단체: board.region 하드코딩 최우선
            finalLocation = board.region || '지역 미상';
          } else {
            // 광역자치단체: AI 분석 결과 우선
            finalLocation = visionData?.location || normalized?.location || job.location || board.region || '지역 미상';
          }
          const finalDeadline = visionData?.deadline || normalized?.deadline || null;
          const finalCompensation = visionData?.compensation || normalized?.compensation || '협의';
          const finalTags = visionData?.subjects || normalized?.tags || [];

          // 저장
          const saved = await saveJobPosting({
            title: finalTitle,
            organization: finalOrganization,
            location: finalLocation,
            compensation: finalCompensation,
            deadline: finalDeadline,
            application_period: visionData?.application_period || normalized?.application_period || null,
            work_period: visionData?.work_period || normalized?.work_period || null,
            contact: visionData?.contact || normalized?.contact || null,
            tags: finalTags,
            detail_content: detailContent,
            source_url: job.link || job.url,
            posted_date: job.postedDate || job.date,
            attachment_url: job.attachmentUrl || job.attachment_url || null,
            is_urgent: normalized?.is_urgent || false,
          }, crawlSourceId);

          if (saved) {
            successCount++;
            logInfo('ai-crawler', '공고 저장 완료', {
              organization: finalOrganization,
              title: finalTitle,
              source: visionData ? 'Vision AI' : (normalized ? 'Text AI' : 'Fallback')
            });
          }
        } catch (saveError) {
          logError('ai-crawler', '공고 저장 실패', saveError, { title: job.title });
        }
      }

      // 8. 크롤링 성공 업데이트 (통계 포함)
      await updateCrawlSuccess(crawlSourceId, {
        jobsFound: jobs.length,
        jobsSaved: successCount,
        jobsSkipped: skippedCount
      });

      // 9. 정리
      await browser.close();
      try { unlinkSync(tempFilePath); } catch (e) { }

      const tokenUsage = getTokenUsage();
      logStep('ai-crawler', 'AI 크롤러 실행 완료', {
        total: jobs.length,
        success: successCount,
        skipped: skippedCount,
        tokens: tokenUsage
      });

      process.exit(0);
    } catch (error) {
      logError('ai-crawler', 'AI 크롤러 실행 중 오류', error);
      process.exit(1);
    }
  }

  let browser;
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  let rawJobs = [];
  let crawlSourceId = null;

  try {
    // 토큰 사용량 초기화
    resetTokenUsage();

    // 2.5. robots.txt 사전 검증 (skipRobotsCheck 설정 시 건너뛰기)
    if (config.skipRobotsCheck) {
      logInfo('access', 'robots.txt 검증 건너뛰기 (skipRobotsCheck 설정)', { baseUrl: config.baseUrl });
    } else {
      logStep('access', 'robots.txt 검증 시작', { baseUrl: config.baseUrl });
      const robotsCheck = await checkRobotsTxt(config.baseUrl);

      if (!robotsCheck.allowed) {
        logError('access', 'robots.txt에서 크롤링 차단됨', null, {
          baseUrl: config.baseUrl,
          reason: robotsCheck.reason,
          rules: robotsCheck.rules
        });
        console.log('\n⚠️  크롤링 중단: ' + robotsCheck.reason);
        console.log('   이 사이트는 robots.txt에서 봇 접근을 금지하고 있습니다.');
        console.log('   합법적인 데이터 수집을 위해 해당 교육청에 공식 요청이 필요합니다.\n');
        process.exit(0); // 정상 종료 (에러가 아님)
      }

      logInfo('access', 'robots.txt 검증 통과', { baseUrl: config.baseUrl, reason: robotsCheck.reason });
    }

    // 3. Supabase에서 크롤링 소스 정보 가져오기
    if (!config) {
      if (targetSource === 'ai-generated') {
        throw new Error('AI Crawler 실행을 위해서는 --board-id 파라미터가 필수입니다. (워크플로우 입력에서 Board ID를 확인해주세요)');
      }
      throw new Error(`소스 설정(${targetSource})을 찾을 수 없습니다. sources.json을 확인해주세요.`);
    }

    const crawlSourceInfo = await getOrCreateCrawlSource(config);
    crawlSourceId = crawlSourceInfo.id;
    const crawlBatchSize = crawlSourceInfo.crawlBatchSize || 10;

    logStep('main', '크롤링 소스 정보 확보', { crawlSourceId, crawlBatchSize });

    // config에 추가 정보 설정
    config.crawlBatchSize = crawlBatchSize;
    config.region = crawlSourceInfo.region;
    config.isLocalGovernment = crawlSourceInfo.isLocalGovernment;

    // 4. 브라우저 시작
    logStep('browser', 'Playwright 브라우저 생성 시작');
    browser = await createBrowser();
    const page = await browser.newPage();
    logStep('browser', '새 페이지 생성 완료');

    // User-Agent 및 브라우저 환경 설정 (봇 감지 우회)
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 진행 상태 업데이트: 크롤링 시작
    updateSourceStart(targetSource, 0);

    // 5. 크롤링 실행 (parserType 기반 라우팅 + 개별 크롤러 지원)
    const parserType = config.parserType || 'html';

    // 개별 크롤러가 있는 경우 우선 사용
    if (targetSource === 'gyeonggi' || targetSource === 'gyeonggi-public-worker') {
      logStep('crawler', `${config.name} 크롤링 호출`);
      rawJobs = await crawlGyeonggi(page, config);
    } else if (targetSource === 'gyeongnam') {
      logStep('crawler', '경상남도교육청 크롤링 호출');
      rawJobs = await crawlGyeongnam(page, config);
    // uijeongbu와 namyangju는 NTT 패턴 사용
    } else if (targetSource === 'incheon') {
      logStep('crawler', '인천교육청 크롤링 호출');
      rawJobs = await crawlIncheon(page, config);
    } else if (targetSource === 'seoul' || targetSource === 'seoul_v2') {
      logStep('crawler', '서울교육일자리포털 크롤링 호출');
      rawJobs = await crawlSeoul(page, config);
    } else if (targetSource === 'gangwon' || targetSource === 'gangwon_v2') {
      logStep('crawler', '강원특별자치도교육청 크롤링 호출');
      rawJobs = await crawlGangwon(page, config);
    } else if (targetSource === 'gwangju') {
      logStep('crawler', '광주광역시교육청 크롤링 호출');
      rawJobs = await crawlGwangju(page, config);
    } else if (targetSource === 'jeonbuk') {
      logStep('crawler', '전북특별자치도교육청 크롤링 호출');
      rawJobs = await crawlJeonbuk(page, config);
    } else if (targetSource === 'jeonnam') {
      logStep('crawler', '전라남도교육청 크롤링 호출');
      rawJobs = await crawlJeonnam(page, config);
    } else if (targetSource === 'jeju') {
      logStep('crawler', '제주특별자치도교육청 크롤링 호출');
      rawJobs = await crawlJeju(page, config);
    } else if (targetSource === 'ulsan') {
      logStep('crawler', '울산광역시교육청 크롤링 호출');
      rawJobs = await crawlUlsan(page, config);
    } else if (targetSource === 'daejeon') {
      logStep('crawler', '대전광역시교육청 크롤링 호출');
      rawJobs = await crawlDaejeon(page, config);
    } else if (targetSource === 'chungbuk') {
      logStep('crawler', '충청북도교육청 크롤링 호출');
      rawJobs = await crawlChungbuk(page, config);
    } else if (targetSource === 'chungnam') {
      logStep('crawler', '충청남도교육청 크롤링 호출');
      rawJobs = await crawlChungnam(page, config);
    } else if (targetSource === 'sejong') {
      logStep('crawler', '세종특별자치시교육청 크롤링 호출');
      rawJobs = await crawlSejong(page, config);
    } else if (parserType === 'ntt') {
      // 범용 selectNttList.do 패턴 크롤러
      logStep('crawler', `[NTT패턴] ${config.name} 크롤링 호출`);
      rawJobs = await crawlNttPattern(page, config);
    } else {
      throw new Error(`지원하지 않는 크롤러: ${targetSource} (parserType: ${parserType})`);
    }

    // 크롤러가 { jobs, meta } 형태로 반환하는 경우 분리
    let crawlMeta = null;
    if (rawJobs && typeof rawJobs === 'object' && !Array.isArray(rawJobs) && rawJobs.jobs) {
      crawlMeta = rawJobs.meta || null;
      rawJobs = rawJobs.jobs;
    }

    // rawJobs가 null/undefined인 경우 빈 배열로 처리
    if (!rawJobs) {
      logWarn('crawler', 'rawJobs가 null/undefined입니다. 빈 배열로 처리합니다.', { targetSource });
      rawJobs = [];
    }

    if (rawJobs.length === 0) {
      // 크롤러가 내부 중복처리를 하는 경우: 파싱은 성공했지만 전부 중복
      if (crawlMeta && crawlMeta.totalFound > 0) {
        logStep('crawler', '신규 공고 없음 (전부 기존 중복)', {
          totalFound: crawlMeta.totalFound,
          skipped: crawlMeta.skipped,
          targetSource,
        });
        await updateCrawlSuccess(crawlSourceId, {
          jobsFound: crawlMeta.totalFound,
          jobsSaved: 0,
          jobsSkipped: crawlMeta.skipped,
        });
        process.exit(0);
      }

      // 페이지에서 아무것도 파싱 못한 경우 → 진짜 실패
      logWarn('crawler', '수집된 공고 없음, HTML 구조 변경 의심', { targetSource });
      await recordCrawlFailure(crawlSourceId, '수집된 공고 없음 - HTML 구조 변경 의심');
      process.exit(1);
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

        const missingDerivedFields = existing && (
          !existing.school_level ||
          !existing.subject ||
          !existing.required_license
        );

        if (existing) {
          if (needsAttachmentRefresh || missingDerivedFields) {
            logStep('pipeline', missingDerivedFields ? '기존 공고 재처리 (학교급/과목 보강)' : '기존 공고 재처리 (첨부파일 갱신)', {
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
        let normalized = null;

        // 크롤러가 이미 Supabase 형식을 반환하는지 확인
        const hasSupabaseFormat = rawJob.organization && rawJob.sourceUrl;

        if (hasSupabaseFormat) {
          // 크롤러가 정규화된 데이터를 제공 - AI 건너뛰기
          logStep('pipeline', '크롤러 정규화 데이터 사용 (AI 건너뛰기)', {
            title: rawJob.title,
            organization: rawJob.organization,
            location: rawJob.location
          });

          // rawJob을 normalized 형식으로 매핑
          normalized = {
            organization: rawJob.organization,
            title: rawJob.title,
            tags: rawJob.tags || [],
            location: rawJob.location,
            compensation: rawJob.compensation,
            deadline: rawJob.deadline,
            is_urgent: rawJob.isUrgent || false,
            school_level: rawJob.schoolLevel,
            subject: rawJob.subject,
            required_license: rawJob.requiredLicense,
            source_url: rawJob.sourceUrl,
            attachment_url: rawJob.structuredContent?.attachmentUrl || rawJob.attachmentUrl,
            detail_content: rawJob.structuredContent?.content || rawJob.detailContent,
            screenshot_base64: rawJob.screenshotBase64
          };

          // Vision 분석은 선택적으로 실행 (스크린샷이 있고 일부 필드가 비어있으면)
          if (rawJob.screenshotBase64 && (!normalized.deadline || !normalized.tags?.length)) {
            logStep('pipeline', 'Gemini Vision으로 누락 필드 보강', { title: rawJob.title });
            visionData = await analyzePageScreenshot(rawJob.screenshotBase64);

            // 누락 필드만 보강
            if (visionData) {
              normalized.deadline = normalized.deadline || visionData.deadline;
              normalized.tags = normalized.tags?.length ? normalized.tags : (visionData.subjects || []);
              normalized.compensation = normalized.compensation || visionData.compensation;
            }
          }

        } else {
          // 기존 로직: AI 정규화 필요
          if (rawJob.screenshotBase64) {
            logStep('pipeline', 'Gemini Vision 분석 시작', { title: rawJob.title });
            visionData = await analyzePageScreenshot(rawJob.screenshotBase64);
            logDebug('pipeline', 'Gemini Vision 분석 완료', { title: rawJob.title, visionData });
          }

          // AI 정규화 (텍스트 기반)
          normalized = await normalizeJobData(rawJob, config.name);

          if (!normalized) {
            failCount++;
            continue;
          }
        }

        // 6-4. Vision 데이터로 보강 (우선순위: Vision > 텍스트)
        // 단, Supabase 형식일 때는 organization/location은 크롤러 값 유지
        if (visionData && !hasSupabaseFormat) {
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

        // 6-4. AI 검증 (Supabase 형식일 때는 건너뛰기)
        let validation;
        if (hasSupabaseFormat) {
          // Supabase 형식: 검증 건너뛰기, 더미 validation 객체 생성
          logStep('pipeline', 'AI 검증 건너뛰기 (Supabase 형식)', { title: normalized.title });
          validation = {
            is_valid: true,
            corrected_data: {
              organization: normalized.organization,
              location: normalized.location,
              job_type: normalized.job_type || null,
              tags: normalized.tags || []
            }
          };
        } else {
          // 기존 로직: AI 검증 실행
          validation = await validateJobData(normalized);

          if (!validation.is_valid) {
            logWarn('pipeline', '검증 실패', { title: normalized.title });
            failCount++;
            continue;
          }
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

        // 원본 URL을 그대로 사용 (Edge Function 우회)
        const attachmentUrlWithFilename = rawJob.attachmentUrl;

        // 6-6. 직무 속성 추론 (학교급, 과목, 라이센스)
        // organization 우선순위: Supabase 형식일 때는 크롤러 값 절대 우선
        let bestOrganization;
        if (hasSupabaseFormat) {
          // Supabase 형식: 크롤러가 제공한 organization을 절대 신뢰
          bestOrganization = rawJob.organization;
        } else {
          // 기존 로직: AI 정리 > 크롤러 추출 > 기타
          const genericNames = ['교육청', '교육지원청', '유치원', '초등학교', '중학교', '고등학교'];
          const isGenericSchoolName = !rawJob.schoolName || genericNames.some(g => rawJob.schoolName === g || rawJob.schoolName?.endsWith('교육청') || rawJob.schoolName?.endsWith('교육지원청'));
          bestOrganization = isGenericSchoolName
            ? (validation.corrected_data?.organization || normalized?.organization || rawJob.schoolName)
            : (rawJob.schoolName || validation.corrected_data?.organization || normalized?.organization);
        }

        const derivedJobAttributes = deriveJobAttributes({
          jobField: rawJob.jobField,
          title: rawJob.title,
          normalizedTitle: normalized?.title || validation.corrected_data?.title,
          schoolName: bestOrganization,
          detailContent: rawJob.detailContent,
          tags: Array.isArray(normalized?.tags) ? normalized.tags : [],
          correctedTags: Array.isArray(validation.corrected_data?.tags) ? validation.corrected_data.tags : [],
        });

        logDebug('pipeline', '직무 속성 추론 결과', {
          jobField: rawJob.jobField,
          title: rawJob.title,
          organization: bestOrganization,
          derived: derivedJobAttributes,
        });

        // 6-6-1. LLM Fallback: school_level이 없을 때만 호출 (가장 중요)
        let finalSchoolLevel = derivedJobAttributes.schoolLevel;
        let finalSubject = derivedJobAttributes.subject;

        // Location 처리: Supabase 형식일 때는 크롤러 값 절대 우선
        let finalLocation;
        if (hasSupabaseFormat) {
          // Supabase 형식: 크롤러가 제공한 location을 절대 신뢰
          finalLocation = rawJob.location || config.region || '미상';
          logDebug('pipeline', 'Supabase 형식 location (크롤러 값 사용)', {
            rawLocation: rawJob.location,
            configRegion: config.region,
            final: finalLocation
          });
        } else if (config.isLocalGovernment) {
          // 기초자치단체: 크롤러 하드코딩(rawJob.location) > DB(config.region) 순서
          finalLocation = rawJob.location || config.region || '미상';
          logDebug('pipeline', '기초자치단체 location 하드코딩', {
            rawLocation: rawJob.location,
            configRegion: config.region,
            final: finalLocation
          });

          // 최후방어선: '미상'이면 게시판 이름에서 지역 추출
          if (finalLocation === '미상' || !finalLocation) {
            const match = config.name.match(/^([가-힣]+)(교육|교육지원청)/);
            if (match) {
              finalLocation = match[1];
              logDebug('pipeline', '게시판 이름에서 지역 추출 (최후방어선)', {
                boardName: config.name,
                extractedLocation: finalLocation
              });
            }
          }
        } else {
          // 광역자치단체: 크롤러 추출 > AI 분석 > fallback
          finalLocation = rawJob.location || validation.corrected_data.location || config.region || '미상';
          logDebug('pipeline', '광역자치단체 location AI 추출', {
            rawLocation: rawJob.location,
            aiLocation: validation.corrected_data.location,
            fallback: config.region,
            final: finalLocation
          });
        }

        // 디버깅: 규칙 파싱 결과 로그
        logDebug('pipeline', '규칙 파싱 완료', {
          title: rawJob.title,
          organization: bestOrganization,
          school_level: finalSchoolLevel,
          subject: finalSubject,
          location: finalLocation
        });

        if (!finalSchoolLevel) {
          logStep('pipeline', 'LLM Fallback 시작 (school_level 누락)', {
            title: rawJob.title,
            organization: bestOrganization,
            jobField: rawJob.jobField
          });

          const llmResult = await inferMissingJobAttributes({
            schoolName: bestOrganization,
            title: rawJob.title,
            contentPreview: rawJob.detailContent ? rawJob.detailContent.slice(0, 1000) : null,
            jobField: rawJob.jobField,
            currentSchoolLevel: finalSchoolLevel,
            currentSubject: finalSubject,
            currentLocation: finalLocation
          });

          if (llmResult.inferred) {
            finalSchoolLevel = llmResult.school_level;
            finalSubject = llmResult.subject || finalSubject; // subject는 선택적 업데이트

            // Location은 Supabase 형식이 아니고, 기초자치단체가 아닐 때만 LLM 결과 반영
            if (!hasSupabaseFormat && !config.isLocalGovernment) {
              finalLocation = llmResult.location || finalLocation;
            }

            logInfo('pipeline', 'LLM Fallback 완료', {
              title: rawJob.title,
              school_level: finalSchoolLevel,
              subject: finalSubject,
              location: finalLocation,
              location_source: config.isLocalGovernment ? 'hardcoded' : 'llm',
              confidence: llmResult.confidence
            });
          } else {
            logWarn('pipeline', 'LLM Fallback 실패', {
              title: rawJob.title,
              organization: bestOrganization
            });
          }
        }

        // 6-6-2. 최종 검증: school_level이 여전히 null이면 저장 안 함
        // 단, 비교사 직종(행정, 시설관리, 조리 등)은 학교급 없이도 저장 허용
        const NON_TEACHER_JOB_TYPES = [
          '교육공무직원(행정,교무)',
          '교육공무직원(과학,정보,사서)',
          '교육공무직원(돌봄)',
          '교육공무직원(특수교육)',
          '시설관리',
          '조리사 및 조리실무사',
          '당직전담',
          '기타',
        ];
        const isNonTeacherJob = NON_TEACHER_JOB_TYPES.some(type =>
          rawJob.jobField?.includes(type) || validation.corrected_data?.job_type?.includes(type)
        );

        if ((!finalSchoolLevel || finalSchoolLevel === '미상') && !isNonTeacherJob) {
          logWarn('pipeline', '학교급 정보 누락 - 저장 건너뛰기', {
            title: rawJob.title,
            link: rawJob.link,
            jobField: rawJob.jobField,
            schoolName: rawJob.schoolName
          });
          failCount++;
          continue;
        }

        // 비교사 직종인데 학교급 없으면 "미상"으로 설정 후 저장
        if (isNonTeacherJob && (!finalSchoolLevel || finalSchoolLevel === '미상')) {
          logInfo('pipeline', '비교사 직종 - 학교급 없이 저장 진행', {
            title: rawJob.title,
            jobField: rawJob.jobField
          });
          finalSchoolLevel = '미상';
        }

        // required_license 재계산 (LLM 결과 반영)
        const finalRequiredLicense = finalSchoolLevel && finalSubject
          ? `${finalSchoolLevel}${finalSubject}`
          : null;

        // 6-7. 원본 데이터 병합 (우선순위: 게시판 정보 > AI 분석 > Vision)
        const baseData = hasSupabaseFormat
          ? {
              // Supabase 형식: AI 값 무시, 크롤러+수동 설정값만 사용
              organization: bestOrganization,
              title: normalized.title,
              job_type: normalized.job_type || validation.corrected_data.job_type,
              tags: normalized.tags || [],
              location: finalLocation || '미상',
              compensation: normalized.compensation,
              deadline: normalized.deadline,
              is_urgent: normalized.is_urgent || false,
              source_url: normalized.source_url,
            }
          : {
              // 기존 로직: AI 정규화 결과 사용
              ...validation.corrected_data,

              // 게시판에서 추출한 구조화된 정보 우선 반영 (LLM Fallback 적용)
              location: finalLocation || '미상',
              organization: bestOrganization,
            };

        const finalData = {
          ...baseData,

          // 상세 정보
          detail_content: rawJob.detailContent,
          attachment_url: attachmentUrlWithFilename,

          // 광역자치단체 정보 (규칙 1: 광역+기초 둘 다 저장)
          metropolitan_region: config.metropolitanRegion || null,

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

          // 학교급, 과목, 라이센스 정보 (LLM Fallback 적용)
          school_level: finalSchoolLevel,
          subject: finalSubject,
          required_license: finalRequiredLicense,
        };

        // 6-8. Supabase 저장
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

    // 7. 성공 시간 업데이트 (통계 포함)
    logStep('supabase', '크롤링 성공 시간 업데이트', { crawlSourceId });
    await updateCrawlSuccess(crawlSourceId, {
      jobsFound: rawJobs.length,
      jobsSaved: successCount,
      jobsSkipped: skippedCount
    });

  } catch (error) {
    logError('main', '크롤링 실패', error, { targetSource });
    // 실패 로그 기록
    if (crawlSourceId) {
      await recordCrawlFailure(crawlSourceId, error.message || '알 수 없는 오류');
    }
    // 진행 상태 업데이트: 크롤링 실패
    updateSourceFailed(targetSource, error.message || '알 수 없는 오류');
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
    logWarn('summary', '저장된 공고 없음 (신규 공고 없음 또는 모두 중복)', {
      targetSource,
      skippedCount,
      failCount,
      rawTotal: rawJobs.length
    });
    // Exit code 0: 신규 공고가 없는 것은 정상 상황 (워크플로우 실패로 처리하지 않음)
    process.exit(0);
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

  // 진행 상태 업데이트: 크롤링 완료
  updateSourceComplete(targetSource, {
    new: successCount,
    skipped: skippedCount,
    processed: rawJobs.length
  });
}

// 실행
main().catch(console.error);

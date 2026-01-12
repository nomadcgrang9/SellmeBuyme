/**
 * Health Check Worker - Monitors crawler_health_jobs table and processes pending jobs
 * Uses existing Playwright infrastructure to fetch real HTML and compare with DB
 */

import { createBrowser, loadPageWithRetry } from './lib/playwright.js';
import { supabase } from './lib/supabase.js';
import { logInfo, logStep, logWarn, logError } from './lib/logger.js';

const REGION_BOARDS = {
  seoul: { name: '서울', boardUrl: 'https://work.sen.go.kr/recruit/job/pageListJob.do', domains: ['work.sen.go.kr'] },
  busan: { name: '부산', boardUrl: 'https://www.pen.go.kr/selectBbsNttList.do?bbsNo=397&key=1553', domains: ['www.pen.go.kr'] },
  daegu: { name: '대구', boardUrl: 'https://www.dge.go.kr/main/na/ntt/selectNttList.do?mi=8026&bbsId=4261', domains: ['www.dge.go.kr'] },
  incheon: { name: '인천', boardUrl: 'https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981', domains: ['www.ice.go.kr'] },
  gwangju: { name: '광주', boardUrl: 'https://www.gen.go.kr/xboard/board.php?tbnum=32', domains: ['www.gen.go.kr'] },
  daejeon: { name: '대전', boardUrl: 'https://www.dje.go.kr/boardCnts/list.do?boardID=54&m=030202&s=dje', domains: ['www.dje.go.kr'] },
  ulsan: { name: '울산', boardUrl: 'https://www.use.go.kr/subPage.do?page=sub06_06_01&m=0606&s=use', domains: ['use.go.kr'] },
  sejong: { name: '세종', boardUrl: 'https://www.sje.go.kr/sje/na/ntt/selectNttList.do?mi=52132&bbsId=108', domains: ['www.sje.go.kr'] },
  gyeonggi: { name: '경기', boardUrl: 'https://www.goe.go.kr/recruit/ad/func/pb/hnfpPbancList.do?mi=10502', domains: ['www.goe.go.kr'] },
  gangwon: { name: '강원', boardUrl: 'https://www.gwe.go.kr/main/bbs/list.do?key=bTIzMDcyMTA1ODU2MzM=', domains: ['www.gwe.go.kr'] },
  chungbuk: { name: '충북', boardUrl: 'https://www.cbe.go.kr/cbe/na/ntt/selectNttList.do?mi=11716&bbsId=1798', domains: ['www.cbe.go.kr'] },
  chungnam: { name: '충남', boardUrl: 'https://www.cne.go.kr/boardCnts/list.do?boardID=642&m=020201&s=cne', domains: ['www.cne.go.kr'] },
  jeonbuk: { name: '전북', boardUrl: 'https://www.jbe.go.kr/board/list.jbe?boardId=BBS_0000130&menuCd=DOM_000000103004006000', domains: ['www.jbe.go.kr', '222.120.4.134', 'www.goeujb.kr'] },
  jeonnam: { name: '전남', boardUrl: 'https://www.jne.go.kr/main/na/ntt/selectNttList.do?mi=265&bbsId=117', domains: ['www.jne.go.kr'] },
  gyeongbuk: { name: '경북', boardUrl: 'https://www.gbe.kr/main/na/ntt/selectNttList.do?mi=3626&bbsId=1887', domains: ['www.gbe.kr'] },
  gyeongnam: { name: '경남', boardUrl: 'https://www.gne.go.kr/works/index.do', domains: ['www.gne.go.kr'] },
  jeju: { name: '제주', boardUrl: 'https://www.jje.go.kr/board/list.jje?boardId=BBS_0000507&menuCd=DOM_000000103003009000', domains: ['www.jje.go.kr'] },
};

/**
 * Extract post titles from page using simple HTML parsing
 */
async function extractTitlesFromPage(page, regionCode) {
  try {
    // Wait for content to load
    await page.waitForTimeout(3000);

    // Extract all links and text that look like job posting titles
    const titles = await page.evaluate(() => {
      const results = new Set();

      // Common selectors for job posting titles
      const selectors = [
        'td.subject a',
        'td.ta_l a',
        '.nttInfoBtn',
        'a[href*="selectNttInfo"]',
        'a[href*="view"]',
        'a[href*="detail"]',
        '.list_title a',
        'td:nth-child(2) a',
        'td:nth-child(3) a',
        'td:nth-child(5) a'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 5 && text.length < 200) {
            // Filter out non-job-posting text
            if (!text.match(/^(번호|제목|작성자|등록일|조회|첨부|처음|이전|다음|마지막)/)) {
              results.add(text);
            }
          }
        });
      }

      return Array.from(results).slice(0, 30); // Max 30 titles
    });

    return titles;
  } catch (error) {
    logError('health-check-worker', 'extractTitlesFromPage 실패', error, { regionCode });
    return [];
  }
}

/**
 * Get DB postings for region
 */
async function getDbPostings(regionCode) {
  const regionConfig = REGION_BOARDS[regionCode];
  if (!regionConfig) {
    return { titles: [], latestDate: null, count: 0 };
  }

  const domains = regionConfig.domains;
  const allTitles = [];
  let latestDate = null;
  let totalCount = 0;

  for (const domain of domains) {
    const { data, error } = await supabase
      .from('job_postings')
      .select('title, created_at')
      .ilike('source_url', `%${domain}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      logError('health-check-worker', 'getDbPostings 실패', error, { regionCode, domain });
      continue;
    }

    if (data && data.length > 0) {
      totalCount += data.length;
      allTitles.push(...data.map(d => d.title));

      if (!latestDate || new Date(data[0].created_at) > new Date(latestDate)) {
        latestDate = data[0].created_at;
      }
    }
  }

  return {
    titles: [...new Set(allTitles)], // Remove duplicates
    latestDate,
    count: totalCount
  };
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w가-힣\s]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Find matching titles
 */
function findMatchingTitles(originalTitles, dbTitles) {
  const normalizedDbTitles = dbTitles.map(normalizeTitle);

  let matchCount = 0;
  const missingTitles = [];

  for (const original of originalTitles) {
    const normalizedOriginal = normalizeTitle(original);

    const isMatch = normalizedDbTitles.some(dbTitle => {
      if (dbTitle === normalizedOriginal) return true;
      if (dbTitle.includes(normalizedOriginal) || normalizedOriginal.includes(dbTitle)) return true;
      return false;
    });

    if (isMatch) {
      matchCount++;
    } else {
      missingTitles.push(original);
    }
  }

  return { matchCount, missingTitles };
}

/**
 * Calculate days since date
 */
function calculateDaysSince(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Determine health status
 */
function determineStatus(collectionRate, daysSinceCrawl) {
  if (daysSinceCrawl !== null && daysSinceCrawl >= 7) {
    return { status: 'critical', reason: `${daysSinceCrawl}일간 미수집` };
  }

  if (collectionRate < 50) {
    return { status: 'critical', reason: `수집률 ${collectionRate.toFixed(0)}% (위험)` };
  }

  if (collectionRate < 80 || (daysSinceCrawl !== null && daysSinceCrawl >= 3)) {
    const reasons = [];
    if (collectionRate < 80) reasons.push(`수집률 ${collectionRate.toFixed(0)}%`);
    if (daysSinceCrawl !== null && daysSinceCrawl >= 3) reasons.push(`${daysSinceCrawl}일 경과`);
    return { status: 'warning', reason: reasons.join(', ') };
  }

  return { status: 'healthy', reason: '정상' };
}

/**
 * Generate AI comment
 */
function generateAiComment(status, regionName, collectionRate, missingCount, daysSinceCrawl) {
  switch (status) {
    case 'critical':
      if (daysSinceCrawl !== null && daysSinceCrawl >= 7) {
        return `${regionName} 지역 크롤러가 ${daysSinceCrawl}일간 작동하지 않았습니다. 즉시 확인이 필요합니다.`;
      }
      return `${regionName} 지역에서 ${missingCount}개 공고가 누락되었습니다. 크롤러 점검이 필요합니다.`;
    case 'warning':
      return `${regionName} 지역 수집률이 ${collectionRate.toFixed(0)}%입니다. 모니터링을 강화해주세요.`;
    default:
      return `${regionName} 지역 크롤러가 정상 작동 중입니다. (수집률 ${collectionRate.toFixed(0)}%)`;
  }
}

/**
 * Process a single health check job
 */
async function processJob(job, browser) {
  const { id, region_code } = job;
  const regionConfig = REGION_BOARDS[region_code];

  if (!regionConfig) {
    logError('health-check-worker', '알 수 없는 지역', null, { region_code });
    await supabase
      .from('crawler_health_jobs')
      .update({
        status: 'failed',
        error_message: '알 수 없는 지역',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
    return;
  }

  // Update status to processing
  await supabase
    .from('crawler_health_jobs')
    .update({
      status: 'processing',
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  logInfo('health-check-worker', `${regionConfig.name} 점검 시작`, { region_code });

  try {
    // 1. Fetch original HTML with Playwright
    const page = await browser.newPage();

    const loadResult = await loadPageWithRetry(page, regionConfig.boardUrl, {
      maxRetries: 3
    });

    if (!loadResult.success) {
      throw new Error(`페이지 로딩 실패: ${loadResult.error}`);
    }

    // 2. Extract titles from rendered HTML
    const originalTitles = await extractTitlesFromPage(page, region_code);
    logInfo('health-check-worker', `${regionConfig.name} 추출 완료`, { count: originalTitles.length });

    await page.close();

    // 3. Get DB data
    const dbData = await getDbPostings(region_code);
    logInfo('health-check-worker', `${regionConfig.name} DB 조회 완료`, { count: dbData.count });

    // 4. Compare
    const { matchCount, missingTitles } = findMatchingTitles(originalTitles, dbData.titles);
    const missingCount = originalTitles.length - matchCount;
    const collectionRate = originalTitles.length > 0
      ? (matchCount / originalTitles.length) * 100
      : (dbData.count > 0 ? 100 : 0);

    const daysSinceCrawl = calculateDaysSince(dbData.latestDate);

    // 5. Determine status
    const { status, reason } = determineStatus(collectionRate, daysSinceCrawl);

    // 6. Update job with results
    await supabase
      .from('crawler_health_jobs')
      .update({
        status: 'completed',
        original_count: originalTitles.length,
        original_titles: JSON.stringify(originalTitles.slice(0, 10)),
        db_count: dbData.count,
        latest_crawl_date: dbData.latestDate,
        days_since_crawl: daysSinceCrawl,
        match_count: matchCount,
        missing_count: missingCount,
        collection_rate: collectionRate,
        missing_titles: JSON.stringify(missingTitles.slice(0, 5)),
        health_status: status,
        status_reason: reason,
        ai_comment: generateAiComment(status, regionConfig.name, collectionRate, missingCount, daysSinceCrawl),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    logInfo('health-check-worker', `${regionConfig.name} 점검 완료`, { status, collectionRate });

  } catch (error) {
    logError('health-check-worker', `${regionConfig.name} 점검 실패`, error, { region_code });

    await supabase
      .from('crawler_health_jobs')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  }
}

/**
 * Main worker loop
 */
async function runWorker() {
  logInfo('health-check-worker', 'Worker 시작');

  let browser = null;

  while (true) {
    try {
      // Get pending jobs
      const { data: jobs, error } = await supabase
        .from('crawler_health_jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5);

      if (error) {
        logError('health-check-worker', 'Job 조회 실패', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      if (jobs && jobs.length > 0) {
        logInfo('health-check-worker', `처리할 Job ${jobs.length}개 발견`);

        // Create browser if not exists
        if (!browser) {
          browser = await createBrowser();
        }

        // Process each job
        for (const job of jobs) {
          await processJob(job, browser);
        }
      } else {
        // No pending jobs, wait before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      logError('health-check-worker', 'Worker 오류', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// Start worker
runWorker().catch(error => {
  logError('health-check-worker', 'Worker 시작 실패', error);
  process.exit(1);
});

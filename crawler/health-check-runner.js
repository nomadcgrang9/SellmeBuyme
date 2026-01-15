/**
 * Health Check Runner - GitHub Actions용 일회성 실행 스크립트
 * 모든 지역을 점검하고 결과를 DB에 저장한 후 종료
 */

import { createBrowser, loadPageWithRetry } from './lib/playwright.js';
import { supabase } from './lib/supabase.js';
import { logInfo, logStep, logWarn, logError } from './lib/logger.js';

const REGION_BOARDS = {
  seoul: { name: '서울', location: '서울', boardUrl: 'https://work.sen.go.kr/recruit/job/pageListJob.do' },
  busan: { name: '부산', location: '부산', boardUrl: 'https://www.pen.go.kr/selectBbsNttList.do?bbsNo=397&key=1553' },
  daegu: { name: '대구', location: '대구', boardUrl: 'https://www.dge.go.kr/main/na/ntt/selectNttList.do?mi=8026&bbsId=4261' },
  incheon: { name: '인천', location: '인천', boardUrl: 'https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981' },
  gwangju: { name: '광주', location: '광주', boardUrl: 'https://www.gen.go.kr/xboard/board.php?tbnum=32' },
  daejeon: { name: '대전', location: '대전', boardUrl: 'https://www.dje.go.kr/boardCnts/list.do?boardID=54&m=030202&s=dje' },
  ulsan: { name: '울산', location: '울산', boardUrl: 'https://www.use.go.kr/subPage.do?page=sub06_06_01&m=0606&s=use' },
  sejong: { name: '세종', location: '세종', boardUrl: 'https://www.sje.go.kr/sje/na/ntt/selectNttList.do?mi=52132&bbsId=108' },
  gyeonggi: { name: '경기', location: '경기', boardUrl: 'https://www.goe.go.kr/recruit/ad/func/pb/hnfpPbancList.do?mi=10502' },
  gangwon: { name: '강원', location: '강원', boardUrl: 'https://www.gwe.go.kr/main/bbs/list.do?key=bTIzMDcyMTA1ODU2MzM=' },
  chungbuk: { name: '충북', location: '충북', boardUrl: 'https://www.cbe.go.kr/cbe/na/ntt/selectNttList.do?mi=11716&bbsId=1798' },
  chungnam: { name: '충남', location: '충남', boardUrl: 'https://www.cne.go.kr/boardCnts/list.do?boardID=642&m=020201&s=cne' },
  jeonbuk: { name: '전북', location: '전북', boardUrl: 'https://www.jbe.go.kr/board/list.jbe?boardId=BBS_0000130&menuCd=DOM_000000103004006000' },
  jeonnam: { name: '전남', location: '전남', boardUrl: 'https://www.jne.go.kr/main/na/ntt/selectNttList.do?mi=265&bbsId=117' },
  gyeongbuk: { name: '경북', location: '경상북', boardUrl: 'https://www.gbe.kr/main/na/ntt/selectNttList.do?mi=3626&bbsId=1887' },
  gyeongnam: { name: '경남', location: '경남', boardUrl: 'https://www.gne.go.kr/works/index.do' },
  jeju: { name: '제주', location: '제주', boardUrl: 'https://www.jje.go.kr/board/list.jje?boardId=BBS_0000507&menuCd=DOM_000000103003009000' },
};

/**
 * Extract post titles from page
 */
async function extractTitlesFromPage(page, regionCode) {
  try {
    await page.waitForTimeout(3000);

    const titles = await page.evaluate(() => {
      const results = new Set();
      const selectors = [
        'td.subject a', 'td.ta_l a', '.nttInfoBtn',
        'a[href*="selectNttInfo"]', 'a[href*="view"]', 'a[href*="detail"]',
        '.list_title a', 'td:nth-child(2) a', 'td:nth-child(3) a', 'td:nth-child(5) a'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 5 && text.length < 200) {
            if (!text.match(/^(번호|제목|작성자|등록일|조회|첨부|처음|이전|다음|마지막)/)) {
              results.add(text);
            }
          }
        });
      }
      return Array.from(results).slice(0, 30);
    });

    return titles;
  } catch (error) {
    logError('health-runner', 'extractTitlesFromPage 실패', error, { regionCode });
    return [];
  }
}

/**
 * Get DB postings for region (location 필드 기준)
 */
async function getDbPostings(regionCode) {
  const regionConfig = REGION_BOARDS[regionCode];
  if (!regionConfig) return { titles: [], latestDate: null, count: 0 };

  const locationName = regionConfig.location; // '대전', '서울' 등

  // location 부분 매칭 (예: '대구' → '대구광역시', '대구' 등 매칭)
  const { data, error } = await supabase
    .from('job_postings')
    .select('title, created_at')
    .ilike('location', `%${locationName}%`)
    .order('created_at', { ascending: false })
    .limit(100); // 최근 100개까지 확인

  if (error || !data || data.length === 0) {
    return { titles: [], latestDate: null, count: 0 };
  }

  return {
    titles: data.map(d => d.title),
    latestDate: data[0].created_at,
    count: data.length
  };
}

function normalizeTitle(title) {
  return title.replace(/\s+/g, ' ').replace(/[^\w가-힣\s]/g, '').trim().toLowerCase();
}

function findMatchingTitles(originalTitles, dbTitles) {
  const normalizedDbTitles = dbTitles.map(normalizeTitle);
  let matchCount = 0;
  const missingTitles = [];

  for (const original of originalTitles) {
    const normalizedOriginal = normalizeTitle(original);
    const isMatch = normalizedDbTitles.some(dbTitle =>
      dbTitle === normalizedOriginal ||
      dbTitle.includes(normalizedOriginal) ||
      normalizedOriginal.includes(dbTitle)
    );

    if (isMatch) matchCount++;
    else missingTitles.push(original);
  }

  return { matchCount, missingTitles };
}

function calculateDaysSince(dateStr) {
  if (!dateStr) return null;
  const diff = new Date().getTime() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

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
 * Check single region
 */
async function checkRegion(regionCode, browser) {
  const regionConfig = REGION_BOARDS[regionCode];
  if (!regionConfig) {
    return { regionCode, error: '알 수 없는 지역' };
  }

  logInfo('health-runner', `${regionConfig.name} 점검 시작`);

  try {
    const page = await browser.newPage();
    const loadResult = await loadPageWithRetry(page, regionConfig.boardUrl, { maxRetries: 3 });

    if (!loadResult.success) {
      await page.close();
      throw new Error(`페이지 로딩 실패: ${loadResult.error}`);
    }

    const originalTitles = await extractTitlesFromPage(page, regionCode);
    await page.close();

    logInfo('health-runner', `${regionConfig.name} 원본 추출 완료`, { count: originalTitles.length });

    const dbData = await getDbPostings(regionCode);
    const { matchCount, missingTitles } = findMatchingTitles(originalTitles, dbData.titles);
    const collectionRate = originalTitles.length > 0
      ? (matchCount / originalTitles.length) * 100
      : (dbData.count > 0 ? 100 : 0);

    const daysSinceCrawl = calculateDaysSince(dbData.latestDate);
    const { status, reason } = determineStatus(collectionRate, daysSinceCrawl);

    const result = {
      regionCode,
      regionName: regionConfig.name,
      boardUrl: regionConfig.boardUrl,
      originalCount: originalTitles.length,
      originalTitles: originalTitles.slice(0, 10),
      dbCount: dbData.count,
      latestCrawlDate: dbData.latestDate,
      daysSinceCrawl,
      matchCount,
      missingCount: originalTitles.length - matchCount,
      collectionRate,
      missingTitles: missingTitles.slice(0, 5),
      healthStatus: status,
      statusReason: reason,
      aiComment: generateAiComment(status, regionConfig.name, collectionRate, originalTitles.length - matchCount, daysSinceCrawl),
      checkedAt: new Date().toISOString()
    };

    logInfo('health-runner', `${regionConfig.name} 점검 완료`, { status, collectionRate: collectionRate.toFixed(0) + '%' });

    return result;

  } catch (error) {
    logError('health-runner', `${regionConfig.name} 점검 실패`, error);
    return {
      regionCode,
      regionName: regionConfig.name,
      boardUrl: regionConfig.boardUrl,
      error: error.message,
      healthStatus: 'error',
      checkedAt: new Date().toISOString()
    };
  }
}

/**
 * Main runner - check all regions and save to DB
 */
async function runHealthCheck() {
  console.log('='.repeat(60));
  console.log('크롤러 헬스체크 시작:', new Date().toISOString());
  console.log('='.repeat(60));

  let browser = null;
  const results = [];
  const regionCodes = Object.keys(REGION_BOARDS);

  try {
    browser = await createBrowser();
    logInfo('health-runner', '브라우저 생성 완료');

    for (const regionCode of regionCodes) {
      const result = await checkRegion(regionCode, browser);
      results.push(result);

      // 짧은 딜레이로 서버 부하 방지
      await new Promise(r => setTimeout(r, 1000));
    }

    // 결과를 crawler_health_results 테이블에 저장
    const batchId = new Date().toISOString();

    for (const result of results) {
      const { error } = await supabase
        .from('crawler_health_results')
        .upsert({
          region_code: result.regionCode,
          region_name: result.regionName,
          board_url: result.boardUrl,
          original_count: result.originalCount || 0,
          original_titles: JSON.stringify(result.originalTitles || []),
          db_count: result.dbCount || 0,
          latest_crawl_date: result.latestCrawlDate,
          days_since_crawl: result.daysSinceCrawl,
          match_count: result.matchCount || 0,
          missing_count: result.missingCount || 0,
          collection_rate: result.collectionRate || 0,
          missing_titles: JSON.stringify(result.missingTitles || []),
          health_status: result.healthStatus,
          status_reason: result.statusReason || result.error,
          ai_comment: result.aiComment,
          batch_id: batchId,
          checked_at: result.checkedAt,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'region_code'
        });

      if (error) {
        logError('health-runner', '결과 저장 실패', error, { regionCode: result.regionCode });
      }
    }

    // 요약 출력
    console.log('\n' + '='.repeat(60));
    console.log('점검 결과 요약');
    console.log('='.repeat(60));

    const summary = {
      total: results.length,
      healthy: results.filter(r => r.healthStatus === 'healthy').length,
      warning: results.filter(r => r.healthStatus === 'warning').length,
      critical: results.filter(r => r.healthStatus === 'critical').length,
      error: results.filter(r => r.healthStatus === 'error').length
    };

    console.log(`총 ${summary.total}개 지역`);
    console.log(`✓ 정상: ${summary.healthy}개`);
    console.log(`⚠ 주의: ${summary.warning}개`);
    console.log(`● 긴급: ${summary.critical}개`);
    console.log(`✕ 오류: ${summary.error}개`);

    console.log('\n상세 결과:');
    for (const r of results) {
      const statusIcon = {
        healthy: '✓',
        warning: '⚠',
        critical: '●',
        error: '✕'
      }[r.healthStatus] || '?';

      console.log(`${statusIcon} ${r.regionName}: ${r.statusReason || r.error || '정상'}`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('크롤러 헬스체크 완료:', new Date().toISOString());
    console.log('='.repeat(60));

  } catch (error) {
    logError('health-runner', '헬스체크 실패', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run
runHealthCheck().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

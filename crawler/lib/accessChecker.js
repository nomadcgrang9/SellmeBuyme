/**
 * 크롤링 접근 권한 검증 유틸리티
 * - robots.txt 검증
 * - HTTP 응답 코드 검증
 * - 차단 페이지 감지
 */

import { logInfo, logWarn, logError, logDebug } from './logger.js';

/**
 * robots.txt 파싱 및 크롤링 허용 여부 확인
 * @param {string} baseUrl - 사이트 기본 URL
 * @param {string} userAgent - 사용할 User-Agent (기본: *)
 * @returns {Promise<{allowed: boolean, reason: string, rules: object}>}
 */
export async function checkRobotsTxt(baseUrl, userAgent = '*') {
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;

    logDebug('accessChecker', 'robots.txt 확인 시작', { robotsUrl });

    const response = await fetch(robotsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SellmeBuymeBot/1.0)',
      },
      signal: AbortSignal.timeout(10000), // 10초 타임아웃
    });

    // robots.txt가 없으면 크롤링 허용으로 간주
    if (response.status === 404) {
      logInfo('accessChecker', 'robots.txt 없음 - 크롤링 허용', { baseUrl });
      return { allowed: true, reason: 'robots.txt 없음', rules: {} };
    }

    if (!response.ok) {
      logWarn('accessChecker', 'robots.txt 접근 실패', {
        baseUrl,
        status: response.status
      });
      return { allowed: true, reason: `robots.txt 접근 실패 (${response.status})`, rules: {} };
    }

    const text = await response.text();
    const rules = parseRobotsTxt(text);

    // User-Agent별 규칙 확인 (우선순위: 특정 봇 > * > 없음)
    const applicableRules = rules[userAgent.toLowerCase()] || rules['*'] || {};

    // Disallow: / 확인 (전체 차단)
    if (applicableRules.disallow?.includes('/')) {
      logWarn('accessChecker', 'robots.txt에서 전면 차단', {
        baseUrl,
        userAgent,
        disallowRules: applicableRules.disallow
      });
      return {
        allowed: false,
        reason: 'robots.txt에서 전면 차단 (Disallow: /)',
        rules: applicableRules
      };
    }

    // 특정 경로 차단 확인
    const urlPath = url.pathname;
    const isPathBlocked = applicableRules.disallow?.some(disallowPath => {
      if (disallowPath === '/') return true;
      return urlPath.startsWith(disallowPath);
    });

    if (isPathBlocked) {
      logWarn('accessChecker', 'robots.txt에서 경로 차단', {
        baseUrl,
        path: urlPath,
        disallowRules: applicableRules.disallow
      });
      return {
        allowed: false,
        reason: `robots.txt에서 경로 차단 (${urlPath})`,
        rules: applicableRules
      };
    }

    logInfo('accessChecker', 'robots.txt 허용', { baseUrl });
    return { allowed: true, reason: '크롤링 허용', rules: applicableRules };

  } catch (error) {
    // 네트워크 오류 등은 허용으로 처리 (보수적 접근)
    logWarn('accessChecker', 'robots.txt 확인 실패', {
      baseUrl,
      error: error.message
    });
    return {
      allowed: true,
      reason: `robots.txt 확인 실패: ${error.message}`,
      rules: {}
    };
  }
}

/**
 * robots.txt 파싱
 * @param {string} text - robots.txt 내용
 * @returns {object} 파싱된 규칙 객체
 */
function parseRobotsTxt(text) {
  const rules = {};
  let currentUserAgent = null;

  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // 주석 무시
    if (trimmed.startsWith('#') || !trimmed) continue;

    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;

    const directive = trimmed.substring(0, colonIndex).trim().toLowerCase();
    const value = trimmed.substring(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      currentUserAgent = value.toLowerCase();
      if (!rules[currentUserAgent]) {
        rules[currentUserAgent] = { allow: [], disallow: [] };
      }
    } else if (currentUserAgent) {
      if (directive === 'disallow' && value) {
        rules[currentUserAgent].disallow.push(value);
      } else if (directive === 'allow' && value) {
        rules[currentUserAgent].allow.push(value);
      }
    }
  }

  return rules;
}

/**
 * HTTP 응답 상태 코드 검증
 * @param {Response|object} response - Playwright 응답 또는 fetch 응답
 * @returns {{ok: boolean, status: number, reason: string, retryable: boolean}}
 */
export function validateHttpResponse(response) {
  const status = typeof response.status === 'function'
    ? response.status() // Playwright Response
    : response.status;  // Fetch Response

  // 성공 응답
  if (status >= 200 && status < 300) {
    return { ok: true, status, reason: 'OK', retryable: false };
  }

  // 리다이렉트 (일반적으로 허용)
  if (status >= 300 && status < 400) {
    return { ok: true, status, reason: '리다이렉트', retryable: false };
  }

  // 클라이언트 오류
  if (status === 403) {
    return {
      ok: false,
      status,
      reason: '접근 거부됨 (403 Forbidden) - 봇 차단 또는 권한 부족',
      retryable: false
    };
  }

  if (status === 429) {
    return {
      ok: false,
      status,
      reason: '요청 제한 (429 Too Many Requests) - Rate Limit 초과',
      retryable: true
    };
  }

  if (status === 401) {
    return {
      ok: false,
      status,
      reason: '인증 필요 (401 Unauthorized)',
      retryable: false
    };
  }

  if (status === 404) {
    return {
      ok: false,
      status,
      reason: '페이지 없음 (404 Not Found)',
      retryable: false
    };
  }

  // 서버 오류
  if (status === 503) {
    return {
      ok: false,
      status,
      reason: '서비스 일시 중단 (503 Service Unavailable)',
      retryable: true
    };
  }

  if (status >= 500) {
    return {
      ok: false,
      status,
      reason: `서버 오류 (${status})`,
      retryable: true
    };
  }

  // 기타 클라이언트 오류
  return {
    ok: false,
    status,
    reason: `HTTP 오류 (${status})`,
    retryable: false
  };
}

/**
 * 차단 페이지 감지
 * @param {Page} page - Playwright 페이지 객체
 * @returns {Promise<{blocked: boolean, reason: string}>}
 */
export async function detectBlockedPage(page) {
  try {
    // 페이지 제목 확인
    const title = await page.title();
    const blockedTitles = [
      '접근 거부',
      '접근이 거부',
      '권한 없음',
      '차단',
      'Access Denied',
      'Forbidden',
      'Blocked',
      '보안 경고',
      '비정상적인 접근',
      'Error',
      '오류',
    ];

    if (blockedTitles.some(blocked => title.includes(blocked))) {
      return {
        blocked: true,
        reason: `차단 페이지 감지 (제목: ${title})`
      };
    }

    // 페이지 본문 확인
    const bodyText = await page.textContent('body').catch(() => '');
    const blockedKeywords = [
      '접근이 거부되었습니다',
      '접근 권한이 없습니다',
      '비정상적인 접근',
      '자동화된 접근',
      '봇 감지',
      '로봇 감지',
      'Access Denied',
      'Access is denied',
      'You have been blocked',
      'Request blocked',
      'IP has been blocked',
      'Too many requests',
      '잠시 후 다시 시도',
      'CAPTCHA',
      '보안 문자',
    ];

    const detectedKeyword = blockedKeywords.find(kw =>
      bodyText.toLowerCase().includes(kw.toLowerCase())
    );

    if (detectedKeyword) {
      return {
        blocked: true,
        reason: `차단 페이지 감지 (키워드: ${detectedKeyword})`
      };
    }

    // 페이지 내용이 비정상적으로 짧은 경우 (빈 페이지 또는 에러 페이지)
    if (bodyText.length < 100) {
      const url = page.url();
      logDebug('accessChecker', '페이지 내용이 매우 짧음', {
        url,
        contentLength: bodyText.length
      });
      // 경고만 하고 차단으로 판단하지는 않음
    }

    return { blocked: false, reason: '정상 페이지' };

  } catch (error) {
    logWarn('accessChecker', '차단 페이지 감지 실패', { error: error.message });
    return { blocked: false, reason: '감지 실패 - 정상으로 간주' };
  }
}

/**
 * 종합 접근 검증 (robots.txt + HTTP + 차단 페이지)
 * @param {Page} page - Playwright 페이지 객체
 * @param {string} url - 검증할 URL
 * @param {Response} response - Playwright 응답 객체
 * @returns {Promise<{allowed: boolean, reason: string, details: object}>}
 */
export async function validateAccess(page, url, response) {
  const details = {};

  // 1. HTTP 응답 검증
  if (response) {
    const httpResult = validateHttpResponse(response);
    details.http = httpResult;

    if (!httpResult.ok) {
      logWarn('accessChecker', 'HTTP 응답 오류', { url, ...httpResult });
      return {
        allowed: false,
        reason: httpResult.reason,
        details
      };
    }
  }

  // 2. 차단 페이지 감지
  const blockResult = await detectBlockedPage(page);
  details.blockDetection = blockResult;

  if (blockResult.blocked) {
    logWarn('accessChecker', '차단 페이지 감지됨', { url, ...blockResult });
    return {
      allowed: false,
      reason: blockResult.reason,
      details
    };
  }

  return {
    allowed: true,
    reason: '접근 허용',
    details
  };
}

/**
 * Rate Limit 대응 지수 백오프 대기
 * @param {number} attempt - 현재 시도 횟수 (1부터 시작)
 * @param {number} baseDelay - 기본 대기 시간 (ms)
 * @param {number} maxDelay - 최대 대기 시간 (ms)
 * @returns {Promise<number>} 실제 대기한 시간 (ms)
 */
export async function exponentialBackoff(attempt, baseDelay = 1000, maxDelay = 60000) {
  // 지수 백오프: baseDelay * 2^(attempt-1) + 랜덤 지터
  const exponentialDelay = Math.min(
    baseDelay * Math.pow(2, attempt - 1),
    maxDelay
  );

  // 랜덤 지터 추가 (0~1000ms)
  const jitter = Math.random() * 1000;
  const totalDelay = exponentialDelay + jitter;

  logDebug('accessChecker', '지수 백오프 대기', {
    attempt,
    delay: Math.round(totalDelay)
  });

  await new Promise(resolve => setTimeout(resolve, totalDelay));

  return totalDelay;
}

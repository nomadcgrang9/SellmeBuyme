import { chromium } from 'playwright';
import { logStep, logWarn, logDebug, logError } from './logger.js';
import { validateHttpResponse, detectBlockedPage, validateAccess } from './accessChecker.js';

/**
 * Playwright 브라우저 인스턴스 생성
 */
export async function createBrowser() {
  return await chromium.launch({
    headless: true, // 백그라운드 실행
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
}

/**
 * 페이지 로딩 및 안정화 대기
 * @param {Page} page - Playwright 페이지 객체
 * @param {string} url - 로딩할 URL
 * @param {string} waitForSelector - 대기할 선택자 (옵션)
 * @param {object} options - 추가 옵션
 * @param {boolean} options.validateResponse - HTTP 응답 검증 여부 (기본: true)
 * @param {boolean} options.detectBlock - 차단 페이지 감지 여부 (기본: true)
 * @returns {Promise<{success: boolean, response: Response|null, blockInfo: object|null}>}
 */
export async function loadPage(page, url, waitForSelector = null, options = {}) {
  const { validateResponse = true, detectBlock = true } = options;

  logStep('playwright.loadPage', '페이지 로딩 시작', { url, waitForSelector });

  let response = null;

  try {
    response = await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 45000  // 30초 → 45초로 증가
    });
    logStep('playwright.loadPage', 'networkidle 대기 완료', { url });
  } catch (error) {
    if (!isTimeoutError(error)) {
      logWarn('playwright.loadPage', '페이지 이동 실패 (networkidle)', { url, error: error.message });
      // timeout이 아닌 에러는 retryable로 반환
      return {
        success: false,
        response: null,
        error: error.message,
        retryable: true,
        blockInfo: null
      };
    }
    logWarn('playwright.loadPage', '네트워크 유휴 대기 타임아웃, domcontentloaded 재시도', { url });

    try {
      if (page.url() === url) {
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
          logDebug('playwright.loadPage', 'domcontentloaded 대기 성공', { url });
        } catch (_waitError) {
          await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
          logDebug('playwright.loadPage', 'load 대기 결과 (fallback)', { url });
        }
      } else {
        response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 90000  // 60초 → 90초로 증가
        });
        logStep('playwright.loadPage', 'domcontentloaded 재호출 성공', { url });
      }
    } catch (retryError) {
      // domcontentloaded도 실패하면 retryable로 반환
      logWarn('playwright.loadPage', 'domcontentloaded 재시도도 실패', { url, error: retryError.message });
      return {
        success: false,
        response: null,
        error: retryError.message,
        retryable: true,
        blockInfo: null
      };
    }
  }

  // HTTP 응답 검증
  if (validateResponse && response) {
    const httpResult = validateHttpResponse(response);
    if (!httpResult.ok) {
      logError('playwright.loadPage', 'HTTP 응답 오류', null, {
        url,
        status: httpResult.status,
        reason: httpResult.reason,
        retryable: httpResult.retryable
      });
      return {
        success: false,
        response,
        error: httpResult.reason,
        retryable: httpResult.retryable,
        blockInfo: null
      };
    }
  }

  // 차단 페이지 감지
  if (detectBlock) {
    const blockResult = await detectBlockedPage(page);
    if (blockResult.blocked) {
      logError('playwright.loadPage', '차단 페이지 감지', null, {
        url,
        reason: blockResult.reason
      });
      return {
        success: false,
        response,
        error: blockResult.reason,
        retryable: false,
        blockInfo: blockResult
      };
    }
  }

  // 특정 선택자 대기 (옵션)
  if (waitForSelector) {
    try {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    } catch (error) {
      logWarn('playwright.loadPage', '선택자 대기 실패', { url, waitForSelector, error: error.message });
    }
  }

  // 추가 안정화 대기
  await page.waitForTimeout(2000);
  logStep('playwright.loadPage', '페이지 로딩 완료', { url });

  return {
    success: true,
    response,
    error: null,
    retryable: false,
    blockInfo: null
  };
}

/**
 * 다중 선택자 시도 (Plan A, B, C)
 */
export async function trySelectors(page, selectors) {
  const selectorList = selectors.split(',').map(s => s.trim());
  
  for (const selector of selectorList) {
    try {
      const element = await page.$(selector);
      if (element) {
        return element;
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

/**
 * 다중 선택자로 텍스트 추출
 */
export async function getTextBySelectors(element, selectors) {
  const selectorList = selectors.split(',').map(s => s.trim());
  
  for (const selector of selectorList) {
    try {
      const text = await element.$eval(selector, el => el.textContent?.trim());
      if (text) {
        return text;
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

/**
 * 다중 선택자로 속성 추출
 */
export async function getAttributeBySelectors(element, selectors, attribute = 'href') {
  const selectorList = selectors.split(',').map(s => s.trim());
  
  for (const selector of selectorList) {
    try {
      const attr = await element.$eval(selector, (el, attr) => el.getAttribute(attr), attribute);
      if (attr) {
        return attr;
      }
    } catch (error) {
      continue;
    }
  }
  
  return null;
}

/**
 * 상대 URL을 절대 URL로 변환
 */
export function resolveUrl(baseUrl, relativeUrl) {
  if (!relativeUrl) return null;
  
  if (relativeUrl.startsWith('http')) {
    return relativeUrl;
  }
  
  try {
    const base = new URL(baseUrl);
    return new URL(relativeUrl, base.origin).href;
  } catch (error) {
    return null;
  }
}

function isTimeoutError(error) {
  return error?.name === 'TimeoutError' || (typeof error?.message === 'string' && error.message.includes('Timeout'));
}

/**
 * 재시도 가능한 안전한 페이지 로딩 (지수 백오프 포함)
 * @param {Page} page - Playwright 페이지 객체
 * @param {string} url - 로딩할 URL
 * @param {object} options - 옵션
 * @param {number} options.maxRetries - 최대 재시도 횟수 (기본: 3)
 * @param {string} options.waitForSelector - 대기할 선택자
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
export async function loadPageWithRetry(page, url, options = {}) {
  const { maxRetries = 3, waitForSelector = null } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    logStep('playwright.loadPageWithRetry', `페이지 로딩 시도 ${attempt}/${maxRetries}`, { url });

    const result = await loadPage(page, url, waitForSelector);

    if (result.success) {
      return result;
    }

    // 재시도 불가능한 오류
    if (!result.retryable) {
      logError('playwright.loadPageWithRetry', '재시도 불가능한 오류', null, {
        url,
        error: result.error,
        attempt
      });
      return result;
    }

    // 마지막 시도가 아니면 지수 백오프 대기
    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
      const jitter = Math.random() * 1000;
      const totalDelay = delay + jitter;

      logWarn('playwright.loadPageWithRetry', `재시도 대기 중 (${Math.round(totalDelay)}ms)`, {
        url,
        attempt,
        nextAttempt: attempt + 1
      });

      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  return {
    success: false,
    error: `최대 재시도 횟수(${maxRetries}) 초과`,
    retryable: false,
    response: null,
    blockInfo: null
  };
}

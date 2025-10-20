import { chromium } from 'playwright';
import { logStep, logWarn, logDebug } from './logger.js';

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
 */
export async function loadPage(page, url, waitForSelector = null) {
  logStep('playwright.loadPage', '페이지 로딩 시작', { url, waitForSelector });
  
  try {
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    logStep('playwright.loadPage', 'networkidle 대기 완료', { url });
  } catch (error) {
    if (!isTimeoutError(error)) {
      logWarn('playwright.loadPage', '페이지 이동 실패 (networkidle)', { url, error: error.message });
      throw error;
    }
    logWarn('playwright.loadPage', '네트워크 유휴 대기 타임아웃, domcontentloaded 재시도', { url });
    if (page.url() === url) {
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        logDebug('playwright.loadPage', 'domcontentloaded 대기 성공', { url });
      } catch (_waitError) {
        await page.waitForLoadState('load', { timeout: 10000 }).catch(() => {});
        logDebug('playwright.loadPage', 'load 대기 결과 (fallback)', { url });
      }
    } else {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
      logStep('playwright.loadPage', 'domcontentloaded 재호출 성공', { url });
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

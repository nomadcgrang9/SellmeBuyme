import { chromium } from 'playwright';

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
  console.log(`🌐 페이지 로딩: ${url}`);
  
  await page.goto(url, {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  // 특정 선택자 대기 (옵션)
  if (waitForSelector) {
    try {
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    } catch (error) {
      console.warn(`⚠️  선택자 대기 실패: ${waitForSelector}`);
    }
  }

  // 추가 안정화 대기
  await page.waitForTimeout(2000);
  
  console.log(`✅ 페이지 로딩 완료`);
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

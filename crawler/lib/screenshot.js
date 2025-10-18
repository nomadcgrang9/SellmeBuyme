import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 페이지 전체 스크린샷 캡처
 */
export async function captureFullPageScreenshot(page) {
  try {
    const screenshotDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const filename = `screenshot_${Date.now()}.png`;
    const filepath = path.join(screenshotDir, filename);

    // 전체 페이지 스크린샷
    await page.screenshot({
      path: filepath,
      fullPage: true,
    });

    console.log(`📸 스크린샷 저장: ${filename}`);
    return filepath;
  } catch (error) {
    console.error(`❌ 스크린샷 실패: ${error.message}`);
    return null;
  }
}

/**
 * 특정 영역만 스크린샷 (본문 영역)
 */
export async function captureContentArea(page, selector = '.board-view-content, .view-content, .nttCn') {
  try {
    const element = await page.$(selector);
    
    if (!element) {
      console.warn('⚠️  본문 영역을 찾을 수 없음 - 전체 페이지 캡처');
      return await captureFullPageScreenshot(page);
    }

    const screenshotDir = path.join(__dirname, '../screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    const filename = `screenshot_${Date.now()}.png`;
    const filepath = path.join(screenshotDir, filename);

    await element.screenshot({ path: filepath });

    console.log(`📸 본문 스크린샷 저장: ${filename}`);
    return filepath;
  } catch (error) {
    console.warn(`⚠️  영역 스크린샷 실패, 전체 페이지로 대체`);
    return await captureFullPageScreenshot(page);
  }
}

/**
 * 이미지를 Base64로 인코딩
 */
export function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error(`❌ 이미지 인코딩 실패: ${error.message}`);
    return null;
  }
}

/**
 * 스크린샷 파일 삭제
 */
export function deleteScreenshot(filepath) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.warn(`⚠️  파일 삭제 실패: ${filepath}`);
  }
}

/**
 * 페이지 스크린샷 → Base64 전체 파이프라인
 */
export async function capturePageAsBase64(page) {
  const screenshotPath = await captureFullPageScreenshot(page);
  
  if (!screenshotPath) {
    return null;
  }

  const base64 = imageToBase64(screenshotPath);
  
  // 파일 삭제
  deleteScreenshot(screenshotPath);
  
  return base64;
}

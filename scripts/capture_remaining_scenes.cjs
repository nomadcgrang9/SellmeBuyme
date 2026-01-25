
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function capture() {
    const browser = await chromium.launch();
    const context = await browser.newContext({
        viewport: { width: 430, height: 932 }, // iPhone 14 Pro Max
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    });
    const page = await context.newPage();
    const outputDir = 'c:/PRODUCT/Maynine/slides/promo_screenshots';

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
        // Scene 6: Search
        console.log('Navigating to mobile-search...');
        await page.goto('http://localhost:5173/mobile-search', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000); // Wait for UI to settle
        await page.screenshot({ path: path.join(outputDir, 'scene6_search.png') });
        console.log('Captured scene6_search.png');

        // Scene 7: Chat/Detail
        console.log('Navigating to mobile-chat...');
        await page.goto('http://localhost:5173/mobile-chat', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outputDir, 'scene7_detail.png') });
        console.log('Captured scene7_detail.png');

        // Scene 8: Home/Landing
        console.log('Navigating to Home...');
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outputDir, 'scene8_home.png') });
        console.log('Captured scene8_home.png');

    } catch (error) {
        console.error('Error capturing screenshots:', error);
    } finally {
        await browser.close();
    }
}

capture();

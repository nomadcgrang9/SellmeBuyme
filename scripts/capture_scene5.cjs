const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Desktop Viewport (1920x1080)
    await page.setViewportSize({ width: 1920, height: 1080 });

    try {
        console.log('Navigating to Desktop Home (Scene 5)...');
        // Main Map View
        await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

        // Wait for map and markers to load
        await page.waitForTimeout(5000);

        const outputDir = 'c:/PRODUCT/Maynine/slides/promo_screenshots';
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputPath = path.join(outputDir, 'scene5_desktop.png');
        await page.screenshot({ path: outputPath, fullPage: false });
        console.log(`Saved screenshot to ${outputPath}`);

    } catch (e) {
        console.error('Error during capture:', e);
    } finally {
        await browser.close();
    }
})();

import { createBrowser } from '../lib/playwright.js';
import { readFileSync } from 'fs';

async function debugDate() {
    console.log("🐞 Debugging Date Selectors...");
    const sources = JSON.parse(readFileSync('crawler/config/sources.json', 'utf-8'));
    const browser = await createBrowser();
    const page = await browser.newPage();

    async function checkRegion(regionKey) {
        const config = sources[regionKey];
        console.log(`\nChecking ${config.name} (${config.baseUrl})...`);
        await page.goto(config.baseUrl);
        await page.waitForTimeout(3000);

        const rows = await page.$$(config.selectors.row);
        console.log(`Found ${rows.length} rows.`);

        if (rows.length > 0) {
            const firstRow = rows[0];
            const dateSelector = typeof config.selectors.date === 'string'
                ? config.selectors.date
                : config.selectors.date.selector;
            const dateEl = await firstRow.$(dateSelector);
            if (dateEl) {
                const rawText = await dateEl.innerText();
                const innerHTML = await dateEl.innerHTML();
                console.log(`[RAW DATE TEXT]: "${rawText}"`);
                console.log(`[DATE HTML]: ${innerHTML}`);
            } else {
                console.log("Date element not found in first row.");
            }
        }
    }

    await checkRegion('daegu');
    await checkRegion('incheon');

    await browser.close();
}

debugDate();

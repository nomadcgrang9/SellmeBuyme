import { createBrowser } from '../lib/playwright.js';
import { readFileSync } from 'fs';

async function debugColumns() {
    console.log("🐞 Debugging Table Columns...");
    const sources = JSON.parse(readFileSync('crawler/config/sources.json', 'utf-8'));
    const browser = await createBrowser();
    const page = await browser.newPage();

    async function checkRegion(regionKey) {
        const config = sources[regionKey];
        console.log(`\nChecking ${config.name}...`);
        await page.goto(config.baseUrl);
        await page.waitForTimeout(3000);

        const tables = await page.$$('table');
        console.log(`Found ${tables.length} tables.`);

        for (let t = 0; t < tables.length; t++) {
            const table = tables[t];
            const className = await table.getAttribute('class') || 'no-class';
            console.log(`\nTable ${t + 1} (class: ${className}):`);

            const rows = await table.$$('tr');
            if (rows.length > 0) {
                // Check first 2 rows
                for (let r = 0; r < Math.min(rows.length, 2); r++) {
                    const cells = await rows[r].$$('td, th');
                    const texts = [];
                    for (const cell of cells) {
                        texts.push((await cell.innerText()).trim());
                    }
                    console.log(`  Row ${r + 1}: [${texts.join(', ').substring(0, 100)}...]`);
                }
            } else {
                console.log("  (Empty table)");
            }
        }
    }

    // await checkRegion('daegu');
    await checkRegion('incheon');
    // await checkRegion('gwangju');

    await browser.close();
}

debugColumns();

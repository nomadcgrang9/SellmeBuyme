import { createBrowser } from '../lib/playwright.js';

async function debugIncheonExtraction() {
    console.log("🐞 Debugging Incheon Extraction...");
    const browser = await createBrowser();
    const page = await browser.newPage();

    // Incheon URL and Selector
    const url = "https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981";
    await page.goto(url);
    await page.waitForTimeout(3000);

    // Selector from config
    const listContainerSelector = "table:nth-of-type(2)";
    const rowSelector = "tbody tr";
    const dateSelector = "td:nth-child(1)";
    const titleSelector = "td:nth-child(5)";
    const linkSelector = "td:nth-child(5) a";

    // Explicitly grab 2nd table
    const tables = await page.$$('table');
    console.log(`Found ${tables.length} tables.`);
    const container = tables[1]; // Index 1 is the 2nd table

    // Test selector based finding too
    const selectorTest = await page.$("table:nth-of-type(2)");
    console.log(`Selector 'table:nth-of-type(2)' found: ${!!selectorTest}`);

    if (!container) {
        console.log("❌ Container not found (index 1)");
        await browser.close();
        return;
    }

    const rows = await container.$$(rowSelector);
    console.log(`Found ${rows.length} rows.`);

    for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const row = rows[i];

        // Date Extraction
        const dateEl = await row.$(dateSelector);
        const dateText = dateEl ? await dateEl.innerText() : "null";

        // cleanup logic
        let cleanDate = dateText.trim().replace(/[.\-/]+$/, '');
        cleanDate = cleanDate.replace(/\./g, '-').replace(/\//g, '-');
        if (/^\d{2}[.-]\d{2}[.-]\d{2}$/.test(cleanDate)) cleanDate = '20' + cleanDate;

        // Link Extraction
        const linkEl = await row.$(linkSelector);
        const linkHref = linkEl ? await linkEl.getAttribute('href') : "null";
        const linkDataId = linkEl ? await linkEl.getAttribute('data-id') : "null";
        const linkOnClick = linkEl ? await linkEl.getAttribute('onclick') : "null";

        console.log(`\nRow ${i + 1}:`);
        console.log(`  Date Raw: "${dateText}" -> Clean: "${cleanDate}"`);
        console.log(`  Link Href: "${linkHref}"`);
        console.log(`  Link DataId: "${linkDataId}"`);
        console.log(`  Link OnClick: "${linkOnClick}"`);
    }

    await browser.close();
}

debugIncheonExtraction();

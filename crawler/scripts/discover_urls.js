import { createBrowser } from '../lib/playwright.js';
import { writeFileSync } from 'fs';

const targets = [
    { region: "서울", name: "서울특별시교육청", domain: "sen.go.kr" },
    { region: "부산", name: "부산광역시교육청", domain: "pen.go.kr" }, // Known valid
    { region: "대구", name: "대구광역시교육청", domain: "dge.go.kr" }, // Known valid
    { region: "인천", name: "인천광역시교육청", domain: "ice.go.kr" },
    { region: "광주", name: "광주광역시교육청", domain: "gen.go.kr" },
    { region: "대전", name: "대전광역시교육청", domain: "dje.go.kr" },
    { region: "울산", name: "울산광역시교육청", domain: "use.go.kr" },
    { region: "세종", name: "세종특별자치시교육청", domain: "sje.go.kr" },
    { region: "강원", name: "강원특별자치도교육청", domain: "gwe.go.kr" },
    { region: "충북", name: "충청북도교육청", domain: "cbe.go.kr" },
    { region: "충남", name: "충청남도교육청", domain: "cne.go.kr" },
    { region: "전북", name: "전북특별자치도교육청", domain: "jbe.go.kr" },
    { region: "전남", name: "전라남도교육청", domain: "jne.go.kr" },
    { region: "경북", name: "경상북도교육청", domain: "gbe.kr" },
    { region: "경남", name: "경상남도교육청", domain: "gne.go.kr" },
    { region: "제주", name: "제주특별자치도교육청", domain: "jje.go.kr" }
];

async function discover() {
    console.log("🔍 Starting URL Discovery for Education Offices (Enhanced)...");
    const browser = await createBrowser();
    const context = await browser.newContext();
    const results = {};

    for (const target of targets) {
        console.log(`\n➡️ Processing: ${target.name} (${target.region})`);
        const page = await context.newPage();

        try {
            page.setDefaultTimeout(15000);
            const mainUrl = `https://www.${target.domain}`;

            try {
                await page.goto(mainUrl, { waitUntil: 'domcontentloaded' });
            } catch (e) {
                console.log(`   ⚠️ Failed to load main page, skipping.`);
                await page.close();
                continue;
            }

            // Handle popups
            try {
                const popups = await page.locator('.layer_popup, #popup, .popup, .main_popup').all();
                for (const popup of popups) {
                    if (await popup.isVisible()) {
                        await popup.evaluate(el => el.remove());
                    }
                }
            } catch (e) { }

            let foundUrl = null;

            // Strategy: Find keywords in links
            const keywords = ['채용', '구인', '시험', '인사', '공고'];

            // Wait for networking to settle slightly
            try { await page.waitForTimeout(2000); } catch (e) { }

            const links = await page.getByRole('link').all();

            for (const link of links) {
                let isVisible = false;
                try { isVisible = await link.isVisible(); } catch (e) { }
                if (!isVisible) continue;

                let text = '';
                let href = '';
                try {
                    text = (await link.innerText()).trim();
                    href = await link.getAttribute('href');
                } catch (e) { continue; }

                if (!href || href.startsWith('javascript') || href === '#' || href === '/') continue;

                // Check text against keywords
                if (keywords.some(k => text.includes(k))) {
                    let fullUrl;
                    try {
                        fullUrl = new URL(href, mainUrl).href;
                    } catch (e) { continue; }

                    // Filter: We prefer board lists
                    if (fullUrl.includes('list') || fullUrl.includes('List') || fullUrl.includes('board') || fullUrl.includes('selectNttList')) {
                        console.log(`   ✨ Potential Candidate: ${text} -> ${fullUrl}`);

                        // Verification: visit the candidate
                        const subPage = await context.newPage();
                        try {
                            await subPage.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });

                            // Check for table rows which indicates a list
                            const rowCount = await subPage.locator('table tbody tr').count();
                            if (rowCount > 0 && rowCount < 100) { // < 100 to avoid giant calendar tables etc
                                console.log(`   ✅ Verified Table (${rowCount} rows)!`);
                                foundUrl = fullUrl;
                                await subPage.close();
                                break;
                            }
                        } catch (e) {
                            // console.log(`      Verification failed: ${e.message}`);
                        } finally {
                            if (!subPage.isClosed()) await subPage.close();
                        }
                    }
                }
            }

            if (foundUrl) {
                results[target.region] = foundUrl;
            } else {
                console.log(`   ❌ No confident URL found.`);
            }

        } catch (e) {
            console.error(`   ⚠️ Error: ${e.message}`);
        } finally {
            if (!page.isClosed()) await page.close();
        }
    }

    await browser.close();

    console.log("\n📦 Discovery Complete. Saving to 'discovered_config.json'...");
    writeFileSync('crawler/config/discovered_config.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
}

discover().catch(console.error);

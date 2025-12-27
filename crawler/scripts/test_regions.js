import { createBrowser } from '../lib/playwright.js';
import { crawlAdaptive } from '../lib/adaptiveCrawler.js';

const commonSelectors = {
    listContainer: ".BD_list table, .tbl_type01, .board_list, .board-list, table.board_list, table",
    row: "tbody tr",
    title: {
        selector: "td.subject a, td.title a, td.ta_l a, .nttInfoBtn, td.tit a",
        extract: "text"
    },
    date: {
        selector: "td:nth-child(4), td:nth-child(5), .date, td.reg_date",
        extract: "text"
    },
    link: {
        selector: "a",
        extract: "href" // heuristic, will be refined in loop if needed
    }
};

const regions = [
    {
        region: "서울",
        name: "서울특별시교육청",
        baseUrl: "https://www.sen.go.kr/sen/si/si03/si0305/si030501.do",
        selectors: commonSelectors
    },
    {
        region: "부산",
        name: "부산광역시교육청",
        baseUrl: "https://www.pen.go.kr/main/na/ntt/selectNttList.do?mi=30367&bbsId=2364",
        selectors: commonSelectors
    },
    {
        region: "대구",
        name: "대구광역시교육청",
        baseUrl: "https://www.dge.go.kr/main/na/ntt/selectNttList.do?mi=2626&bbsId=1063",
        selectors: commonSelectors
    },
    {
        region: "인천",
        name: "인천광역시교육청",
        baseUrl: "https://www.ice.go.kr/main/na/ntt/selectNttList.do?mi=10556&bbsId=2508",
        selectors: commonSelectors
    },
    {
        region: "광주",
        name: "광주광역시교육청",
        baseUrl: "https://www.gen.go.kr/main/na/ntt/selectNttList.do?mi=11562&bbsId=3227",
        selectors: commonSelectors
    },
    {
        region: "대전",
        name: "대전광역시교육청",
        baseUrl: "https://www.dje.go.kr/main/na/ntt/selectNttList.do?mi=1436&bbsId=785",
        selectors: commonSelectors
    },
    {
        region: "울산",
        name: "울산광역시교육청",
        baseUrl: "https://www.use.go.kr/main/na/ntt/selectNttList.do?mi=1173&bbsId=304",
        selectors: commonSelectors
    },
    {
        region: "세종",
        name: "세종특별자치시교육청",
        baseUrl: "https://www.sje.go.kr/main/na/ntt/selectNttList.do?mi=10738&bbsId=2422",
        selectors: commonSelectors
    },
    {
        region: "강원",
        name: "강원특별자치도교육청",
        baseUrl: "https://www.gwe.go.kr/main/na/ntt/selectNttList.do?mi=12852&bbsId=3568",
        selectors: commonSelectors
    },
    {
        region: "충북",
        name: "충청북도교육청",
        baseUrl: "https://www.cbe.go.kr/main/na/ntt/selectNttList.do?mi=10839&bbsId=1214",
        selectors: commonSelectors
    },
    {
        region: "충남",
        name: "충청남도교육청",
        baseUrl: "https://www.cne.go.kr/main/na/ntt/selectNttList.do?mi=1306&bbsId=513",
        selectors: commonSelectors
    },
    {
        region: "전북",
        name: "전북특별자치도교육청",
        baseUrl: "https://www.jbe.go.kr/main/na/ntt/selectNttList.do?mi=1218&bbsId=1067",
        selectors: commonSelectors
    },
    {
        region: "전남",
        name: "전라남도교육청",
        baseUrl: "https://www.jne.go.kr/main/na/ntt/selectNttList.do?mi=1126&bbsId=388",
        selectors: commonSelectors
    },
    {
        region: "경북",
        name: "경상북도교육청",
        baseUrl: "https://www.gbe.kr/main/na/ntt/selectNttList.do?mi=10168&bbsId=1371",
        selectors: commonSelectors
    },
    {
        region: "경남",
        name: "경상남도교육청",
        baseUrl: "https://www.gne.go.kr/main/na/ntt/selectNttList.do?mi=10375&bbsId=578",
        selectors: commonSelectors
    },
    {
        region: "제주",
        name: "제주특별자치도교육청",
        baseUrl: "https://www.jje.go.kr/main/na/ntt/selectNttList.do?mi=10186&bbsId=116",
        selectors: commonSelectors
    }
];

// Gyeonggi is special (POST based), skipping for generic test or handling separately if needed.
// Integrating Gyeonggi with existing config if possible, but let's focus on new ones first or use the known config.

async function testRegions() {
    console.log("Starting Crawler Test for 17 Education Offices...");
    const browser = await createBrowser();
    const page = await browser.newPage();
    
    // Set a timeout for navigation
    page.setDefaultTimeout(30000); 

    const results = [];

    for (const region of regions) {
        console.log(`\n-----------------------------------`);
        console.log(`Testing: ${region.name} (${region.region})`);
        console.log(`URL: ${region.baseUrl}`);
        
        try {
            // Mock config for adaptiveCrawler
            const config = {
                region: region.region,
                name: region.name,
                baseUrl: region.baseUrl,
                selectors: region.selectors,
                type: 'table', // Assume table for now
                parserType: 'html',
                pagination: { type: 'none' } // Disable pagination for test
            };

            // Custom logic: we just want to see if we can get *any* items.
            // basic adaptiveCrawler runs in a loop. We might want to limit it.
            // Since we can't easily modify adaptiveCrawler's internal loop limit without changing code,
            // we will let it run for one page (pagination none).

            const items = await crawlAdaptive(page, config);

            if (items && items.length > 0) {
                console.log(`✅ SUCCESS: Found ${items.length} items.`);
                console.log(`Sample: ${items[0].title} / ${items[0].date}`);
                results.push({ region: region.region, status: 'SUCCESS', count: items.length });
            } else {
                console.log(`❌ FAILURE: No items found.`);
                results.push({ region: region.region, status: 'FAILURE', reason: 'No items' });
            }

        } catch (error) {
            console.error(`❌ ERROR: ${error.message}`);
            results.push({ region: region.region, status: 'ERROR', reason: error.message });
        }
    }

    await browser.close();
    
    console.log("\n================ SUMMARY ================");
    console.table(results);
}

testRegions().catch(console.error);

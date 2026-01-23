/**
 * 서울특별시교육청 크롤러 테스트 (심화 진단)
 * 목적: 로컬 환경에서 서울 크롤러를 실행하여 수집되는 데이터를 확인하고,
 *       누락이나 중복 로직 이슈를 검증한다.
 */
import { chromium } from 'playwright';
import { crawlSeoul } from './sources/seoul.js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    console.log('🚀 서울특별시교육청 크롤러 정밀 진단 시작 (순서/누락 확인)\n');
    console.log('='.repeat(60));

    const browser = await chromium.launch({
        headless: false
    });

    const page = await browser.newPage();

    // User-Agent 설정
    await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    });

    try {
        // 설정 로드
        let sourcesConfig;
        try {
            sourcesConfig = JSON.parse(readFileSync('./crawler/config/sources.json', 'utf-8'));
        } catch (e) {
            try {
                sourcesConfig = JSON.parse(readFileSync('c:/PRODUCT/SellmeBuyme/crawler/config/sources.json', 'utf-8'));
            } catch (e2) {
                sourcesConfig = {
                    seoul: {
                        name: "서울특별시교육청",
                        baseUrl: "https://sen.go.kr/web/services/bbs/bbsList.action?bbsBean.bbsCd=72",
                        detailUrlTemplate: "https://sen.go.kr/web/services/bbs/bbsView.action?bbsBean.bbsCd=72&bbsBean.bbsSeq=",
                        region: "서울",
                        metropolitanRegion: "서울"
                    }
                }
            }
        }

        const config = sourcesConfig.seoul;

        // 테스트용 설정 오버라이드: 배치 사이즈를 늘려서 더 많이 가져와본다
        config.crawlBatchSize = 30;

        console.log('📋 크롤링 설정:');
        console.log(`   이름: ${config.name}`);
        console.log(`   URL: ${config.baseUrl}`);
        console.log();

        // 실제 크롤링 실행
        const jobs = await crawlSeoul(page, config);

        console.log('\n' + '='.repeat(60));
        console.log('📊 진단 결과 상세');
        console.log('='.repeat(60));
        console.log(`총 수집 시도 결과: ${jobs.length}개`);

        // 날짜 순서 분석
        const dates = jobs.map(j => j.date);
        console.log('📅 수집된 공고 날짜 순서 (최신순이어야 함):');
        console.log(dates.join(' -> '));

        // 역순 존재 여부 확인
        let isSorted = true;
        for (let i = 0; i < dates.length - 1; i++) {
            // 날짜가 같으면 패스, 앞 날짜가 뒷 날짜보다 "작으면" (과거면) 역전임 (내림차순 정렬이어야 하므로)
            // 예: [0] 2026-01-20 -> [1] 2026-01-21 : 이건 역전임.
            if (dates[i] < dates[i + 1]) {
                console.log(`⚠️  순서 역전 발견: [${i}] ${dates[i]} 뒤에 [${i + 1}] ${dates[i + 1]} 가 옴 (최신글이 더 뒤에 있음)`);
                isSorted = false;
            }
        }

        if (!isSorted) {
            console.log('\n🚨 결론: 공고가 날짜순으로 정렬되어 있지 않습니다.');
            console.log('   -> 뒤섞여 있는 경우, 크롤러가 "옛날 글(중복)"을 먼저 만나면 바로 멈춰버려서');
            console.log('      그 뒤에 숨어있는 "최신 글(신규)"을 놓치게 됩니다.');
        } else {
            console.log('\n✅ 현재 페이지는 날짜순으로 잘 정렬되어 보입니다. (누락 원인이 다른 곳에 있을 수 있음)');
        }

        if (jobs.length > 0) {
            console.log('\n📋 수집된 상위 5개 공고:');
            jobs.slice(0, 5).forEach((job, i) => {
                console.log(`\n[${i + 1}] ${job.title}`);
                console.log(`    📅 등록일: ${job.date}`);
                console.log(`    📍 지역: ${job.location}`);
            });
        }

    } catch (error) {
        console.error('❌ 테스트 실패:', error);
    } finally {
        await browser.close();
    }
}

main().catch(console.error);

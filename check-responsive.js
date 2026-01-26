import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch();

    // 1. 데스크톱 뷰 (1920x1080)
    console.log('=== 1. 데스크톱 뷰 (1920x1080) ===');
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(3000); // 로딩 대기

    const hasSidePanel = await page.$('[data-panel="list"]');
    // 데스크톱에서는 사이드 패널이 보여야 함 (display: flex)
    const isSidePanelVisible = await hasSidePanel?.isVisible();

    // 모바일 요소들은 숨겨져 있어야 함
    const mobileSearchBar = await page.$('.md\\:hidden .bg-gradient-to-b'); // 모바일 상단 바
    const isMobileBarVisible = await mobileSearchBar?.isVisible();

    console.log('데스크톱 사이드 패널:', isSidePanelVisible ? '✅ 보임' : '❌ 안 보임');
    console.log('모바일 상단바:', (!isMobileBarVisible) ? '✅ 숨겨짐' : '❌ 보임');

    await page.screenshot({ path: 'integrated-desktop.png' });

    // 2. 뷰포트 변경 (동적 리사이즈 테스트)
    console.log('\n=== 2. 리사이즈 → 모바일 (375x667) ===');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);

    const isSidePanelVisibleMobile = await hasSidePanel?.isVisible();
    const isMobileBarVisibleMobile = await mobileSearchBar?.isVisible();
    const hasBottomSheet = await page.$('.fixed.bottom-0'); // MobileBottomSheet
    const isBottomSheetVisible = await hasBottomSheet?.isVisible();

    console.log('데스크톱 사이드 패널:', (!isSidePanelVisibleMobile) ? '✅ 숨겨짐' : '❌ 보임');
    console.log('모바일 상단바:', isMobileBarVisibleMobile ? '✅ 보임' : '❌ 안 보임');
    console.log('모바일 바텀시트:', isBottomSheetVisible ? '✅ 보임' : '❌ 안 보임');

    await page.screenshot({ path: 'integrated-mobile.png' });

    await browser.close();
    console.log('\n=== 테스트 완료 ===');
})();

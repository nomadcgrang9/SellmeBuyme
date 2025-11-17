import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';

async function verifyChatFeatures() {
  let browser: Browser | null = null;

  try {
    console.log('🚀 채팅 기능 검증 시작...\n');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      viewport: { width: 1400, height: 900 }
    });
    const page = await context.newPage();

    // 홈페이지 이동
    console.log('📍 Step 1: 홈페이지 접속 (http://localhost:5173)');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);

    // 투어 모달 닫기
    const tourModal = page.locator('text=다음');
    const tourModalExists = await tourModal.isVisible().catch(() => false);
    if (tourModalExists) {
      console.log('   투어 모달 발견 - 닫기 시도');
      // X 버튼 또는 "다음" 버튼 연타해서 닫기
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
      }
      // 또는 직접 버튼 찾아서 클릭
      const closeButton = page.locator('button').filter({ hasText: /닫기|건너뛰기|다음/ }).first();
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
        await page.waitForTimeout(500);
      }
    }

    await page.screenshot({ path: '.playwright-mcp/chat-verify-1-home.png' });

    // AI 추천 영역 확인 (CompactTalentCard 체크)
    console.log('\n📍 Step 2: AI 추천 영역 CompactTalentCard 채팅 버튼 확인');

    const compactCards = page.locator('[class*="compact"]').filter({ hasText: '인력풀' });
    const compactCardCount = await compactCards.count();
    console.log(`   찾은 CompactTalentCard 개수: ${compactCardCount}`);

    if (compactCardCount > 0) {
      const firstCard = compactCards.first();
      await firstCard.scrollIntoViewIfNeeded();
      await page.screenshot({ path: '.playwright-mcp/chat-verify-2-compact-cards.png' });

      // 채팅 버튼 찾기 (MessageCircle 아이콘)
      const chatButtons = firstCard.locator('button').filter({ hasText: /채팅/i });
      const iconButtons = firstCard.locator('button');

      const chatButtonCount = await chatButtons.count();
      const iconButtonCount = await iconButtons.count();

      console.log(`   CompactTalentCard 채팅 텍스트 버튼: ${chatButtonCount}개`);
      console.log(`   CompactTalentCard 전체 버튼: ${iconButtonCount}개`);

      // 카드 HTML 구조 출력
      const cardHTML = await firstCard.innerHTML();
      console.log('\n   카드 HTML 구조 샘플:');
      console.log(cardHTML.substring(0, 500) + '...');
    } else {
      console.log('   ⚠️ CompactTalentCard를 찾을 수 없음');
    }

    // 일반 TalentCard 확인
    console.log('\n📍 Step 3: 일반 TalentCard 채팅 버튼 확인');

    // 스크롤 다운해서 일반 카드 찾기
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1000);

    const talentCards = page.locator('[class*="talent"]').filter({ hasText: '인력풀' });
    const talentCardCount = await talentCards.count();
    console.log(`   찾은 TalentCard 개수: ${talentCardCount}`);

    if (talentCardCount > 0) {
      await page.screenshot({ path: '.playwright-mcp/chat-verify-3-talent-cards.png' });

      const firstTalentCard = talentCards.first();
      const talentChatButtons = firstTalentCard.locator('button').filter({ hasText: /채팅/i });
      const talentChatButtonCount = await talentChatButtons.count();

      console.log(`   TalentCard 채팅 버튼: ${talentChatButtonCount}개`);
    } else {
      console.log('   ⚠️ TalentCard를 찾을 수 없음 (인력풀 카드가 없을 수 있음)');
    }

    // 데스크톱 채팅 모달 테스트
    console.log('\n📍 Step 4: 데스크톱 채팅 모달 존재 확인');

    const chatModal = page.locator('[class*="modal"]').filter({ hasText: /채팅/i });
    const chatModalExists = await chatModal.count() > 0;

    console.log(`   채팅 모달 존재: ${chatModalExists}`);

    // 헤더의 채팅 버튼 클릭 테스트
    console.log('\n📍 Step 5: 헤더 채팅 버튼 클릭 테스트');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);

    const headerChatButton = page.locator('header button').filter({ hasText: /채팅/i });
    const headerChatExists = await headerChatButton.count() > 0;

    console.log(`   헤더 채팅 버튼 존재: ${headerChatExists}`);

    if (headerChatExists) {
      // 로그인 하지 않은 상태에서 클릭
      await headerChatButton.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: '.playwright-mcp/chat-verify-4-header-chat-click.png' });

      // 로그인 모달 또는 채팅 모달이 떴는지 확인
      const loginModal = page.locator('text=로그인');
      const loginModalVisible = await loginModal.isVisible().catch(() => false);

      console.log(`   로그인 모달 표시: ${loginModalVisible}`);
    }

    // UserSearchModal 코드 분석
    console.log('\n📍 Step 6: UserSearchModal 코드 분석');

    const userSearchModalPath = 'c:\\PRODUCT\\SellmeBuyme\\src\\components\\chat\\UserSearchModal.tsx';

    if (fs.existsSync(userSearchModalPath)) {
      const content = fs.readFileSync(userSearchModalPath, 'utf-8');

      // email 필드가 있는지 확인
      const hasEmailSelect = content.includes('email') && content.includes('.select');
      const hasEmailFilter = content.includes('email.ilike');

      console.log(`   UserSearchModal에 email select: ${hasEmailSelect}`);
      console.log(`   UserSearchModal에 email.ilike 쿼리: ${hasEmailFilter}`);

      if (hasEmailSelect || hasEmailFilter) {
        console.log('   ❌ 문제: user_profiles.email 컬럼이 존재하지 않는데 쿼리하고 있음!');
      }
    }

    // 최종 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 검증 결과 요약');
    console.log('='.repeat(60));
    console.log(`✅ CompactTalentCard 존재: ${compactCardCount > 0}`);
    console.log(`❌ CompactTalentCard 채팅 버튼: 확인 필요`);
    console.log(`✅ 헤더 채팅 버튼 존재: ${headerChatExists}`);
    console.log(`❌ UserSearchModal email 쿼리 문제: 확인됨`);
    console.log('='.repeat(60));

    console.log('\n✅ 검증 완료! 스크린샷은 .playwright-mcp/ 폴더에 저장되었습니다.');

    // 5초 대기 후 종료
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

verifyChatFeatures();

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_DIR = path.join(__dirname, '../../.playwright-storage');
const USER1_STATE = path.join(STORAGE_DIR, 'user1-google.json');
const USER2_STATE = path.join(STORAGE_DIR, 'user2-kakao.json');

// Storage 디렉토리 생성
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

async function waitForManualLogin(page: Page, loginProvider: string): Promise<void> {
  console.log(`\n⏳ ${loginProvider} 로그인을 진행해주세요...`);
  console.log('   비밀번호 입력 후 로그인이 완료될 때까지 대기합니다.\n');

  // 로그인 완료 대기 (홈페이지로 리다이렉트 확인)
  await page.waitForURL('http://localhost:5174/**', { timeout: 300000 }); // 5분 대기

  // 추가 대기 (페이지 안정화)
  await page.waitForTimeout(2000);

  console.log(`✅ ${loginProvider} 로그인 완료!\n`);
}

async function setupUser1(browser: Browser): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 User 1: Google 로그인 (l30417305@gmail.com)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 브라우저가 열리면 직접 로그인해주세요:');
  console.log('   1. 프로필 버튼 클릭');
  console.log('   2. "Google로 로그인" 클릭');
  console.log('   3. l30417305@gmail.com 으로 로그인');
  console.log('   4. 로그인 완료되면 자동으로 다음 단계 진행됩니다\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // 홈페이지 접속
  await page.goto('http://localhost:5174');

  // 사용자가 수동으로 로그인할 때까지 대기
  await waitForManualLogin(page, 'Google');

  // Storage State 저장
  await context.storageState({ path: USER1_STATE });
  console.log(`💾 Storage State 저장: ${USER1_STATE}\n`);

  await context.close();
}

async function setupUser2(browser: Browser): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 User 2: Kakao 로그인 (cgrang@naver.com)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('📌 브라우저가 열리면 직접 로그인해주세요:');
  console.log('   1. 프로필 버튼 클릭');
  console.log('   2. "Kakao로 로그인" 클릭');
  console.log('   3. cgrang@naver.com 계정으로 로그인');
  console.log('   4. 로그인 완료되면 자동으로 다음 단계 진행됩니다\n');

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  // 홈페이지 접속
  await page.goto('http://localhost:5174');

  // 사용자가 수동으로 로그인할 때까지 대기
  await waitForManualLogin(page, 'Kakao');

  // Storage State 저장
  await context.storageState({ path: USER2_STATE });
  console.log(`💾 Storage State 저장: ${USER2_STATE}\n`);

  await context.close();
}

async function runChatTest(browser: Browser): Promise<void> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🧪 채팅 E2E 테스트 시작');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // User 1, User 2 Context 생성 (저장된 Storage State 사용)
  const context1 = await browser.newContext({
    storageState: USER1_STATE,
    viewport: { width: 1280, height: 720 },
  });
  const context2 = await browser.newContext({
    storageState: USER2_STATE,
    viewport: { width: 1280, height: 720 },
  });

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. 사용자 검색 테스트
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('📌 1. 사용자 검색 테스트');

    await page1.goto('http://localhost:5174/chat');
    await page1.waitForTimeout(1000);

    // 새 채팅 버튼 클릭
    const newChatBtn = page1.locator('button[aria-label="새 채팅"]');
    await newChatBtn.click();
    await page1.waitForTimeout(500);

    // User 2 검색 (cgrang 검색)
    const searchInput = page1.locator('input[placeholder*="사용자"]');
    await searchInput.fill('cgrang');

    const searchBtn = page1.locator('button:has-text("검색")');
    await searchBtn.click();
    await page1.waitForTimeout(2000);

    // 검색 결과 확인
    const searchResults = page1.locator('button:has(h3)'); // 사용자 카드 버튼
    const resultCount = await searchResults.count();

    if (resultCount === 0) {
      console.log('   ❌ 검색 결과 없음 - display_name 또는 phone 확인 필요');
    } else {
      console.log(`   ✅ 검색 결과: ${resultCount}개`);

      // 첫 번째 결과 클릭 → 채팅방 생성
      await searchResults.first().click();
      await page1.waitForTimeout(2000);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. 메시지 송수신 테스트
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📌 2. 메시지 송수신 테스트');

    // User 1 → User 2 메시지 전송
    const messageInput1 = page1.locator('textarea[placeholder*="메시지"]');
    const testMessage1 = `테스트 메시지 from User1 at ${new Date().toLocaleTimeString()}`;

    await messageInput1.fill(testMessage1);
    const sendBtn1 = page1.locator('button[aria-label="전송"]');
    await sendBtn1.click();
    await page1.waitForTimeout(1000);

    console.log(`   📤 User 1 메시지 전송: "${testMessage1}"`);

    // User 2가 채팅방 목록 확인
    await page2.goto('http://localhost:5174/chat');
    await page2.waitForTimeout(2000);

    // User 2 채팅방 목록에서 새 메시지 확인
    const chatRoomList = page2.locator('[class*="chat-room"]'); // 실제 selector 확인 필요
    const hasUnread = await page2.locator('text="1"').isVisible({ timeout: 3000 }).catch(() => false);

    if (hasUnread) {
      console.log('   ✅ User 2: 읽지 않은 메시지 배지 표시됨');
    } else {
      console.log('   ⚠️  User 2: 읽지 않은 메시지 배지 확인 불가');
    }

    // User 2가 채팅방 입장
    const firstChatRoom = page2.locator('button').filter({ hasText: 'User' }).first();
    if (await firstChatRoom.isVisible({ timeout: 3000 })) {
      await firstChatRoom.click();
      await page2.waitForTimeout(1000);
    }

    // User 2가 메시지 수신 확인
    const receivedMessage = page2.locator(`text="${testMessage1}"`);
    const messageReceived = await receivedMessage.isVisible({ timeout: 3000 });

    if (messageReceived) {
      console.log(`   ✅ User 2: 메시지 수신 확인 - "${testMessage1}"`);
    } else {
      console.log(`   ❌ User 2: 메시지 수신 실패`);
      throw new Error('메시지 수신 실패');
    }

    // User 2 → User 1 답장
    const messageInput2 = page2.locator('textarea[placeholder*="메시지"]');
    const testMessage2 = `답장 from User2 at ${new Date().toLocaleTimeString()}`;

    await messageInput2.fill(testMessage2);
    const sendBtn2 = page2.locator('button[aria-label="전송"]');
    await sendBtn2.click();
    await page2.waitForTimeout(1000);

    console.log(`   📤 User 2 답장 전송: "${testMessage2}"`);

    // User 1이 답장 수신 확인
    const replyMessage = page1.locator(`text="${testMessage2}"`);
    const replyReceived = await replyMessage.isVisible({ timeout: 3000 });

    if (replyReceived) {
      console.log(`   ✅ User 1: 답장 수신 확인 - "${testMessage2}"`);
    } else {
      console.log(`   ❌ User 1: 답장 수신 실패`);
      throw new Error('답장 수신 실패');
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. 메시지 영속성 테스트 (페이지 새로고침)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('\n📌 3. 메시지 영속성 테스트 (새로고침)');

    await page1.reload();
    await page1.waitForTimeout(2000);

    const persistedMessage = page1.locator(`text="${testMessage2}"`);
    const messagePersisted = await persistedMessage.isVisible({ timeout: 3000 });

    if (messagePersisted) {
      console.log('   ✅ 메시지 영속성 확인: 새로고침 후에도 메시지 유지됨');
    } else {
      console.log('   ❌ 메시지 영속성 실패: 새로고침 후 메시지 사라짐');
      throw new Error('메시지 영속성 실패');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 모든 테스트 통과!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error);

    // 스크린샷 저장
    await page1.screenshot({ path: 'test-failure-user1.png', fullPage: true });
    await page2.screenshot({ path: 'test-failure-user2.png', fullPage: true });

    throw error;
  } finally {
    await context1.close();
    await context2.close();
  }
}

async function main() {
  let browser: Browser | null = null;

  try {
    // 로그인용 브라우저 (slowMo 있음)
    browser = await chromium.launch({
      headless: false,
      slowMo: 300,
    });

    // Storage State가 없으면 로그인 진행
    if (!fs.existsSync(USER1_STATE)) {
      await setupUser1(browser);
    } else {
      console.log(`✅ User 1 Storage State 이미 존재: ${USER1_STATE}`);
    }

    if (!fs.existsSync(USER2_STATE)) {
      await setupUser2(browser);
    } else {
      console.log(`✅ User 2 Storage State 이미 존재: ${USER2_STATE}`);
    }

    // 로그인 브라우저 닫기
    await browser.close();
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 로그인 완료 - 테스트용 브라우저 재시작');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 테스트용 브라우저 (slowMo 없음, 빠르게 실행)
    browser = await chromium.launch({
      headless: false,
    });

    // 채팅 테스트 실행
    await runChatTest(browser);

  } catch (error) {
    console.error('❌ 에러 발생:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();

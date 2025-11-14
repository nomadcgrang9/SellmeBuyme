import { chromium } from 'playwright';

async function main() {
  console.log('브라우저 2개 컨텍스트를 엽니다...\n');

  const browser = await chromium.launch({
    headless: false,
  });

  // User 1 Context
  const context1 = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page1 = await context1.newPage();
  await page1.goto('http://localhost:5174');
  console.log('✅ Browser 1 열림: http://localhost:5174');

  // User 2 Context
  const context2 = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page2 = await context2.newPage();
  await page2.goto('http://localhost:5174');
  console.log('✅ Browser 2 열림: http://localhost:5174');

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('두 브라우저에서 각각 다른 계정으로 로그인하세요.');
  console.log('종료하려면 Ctrl+C 를 누르세요.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 무한 대기 (Ctrl+C로만 종료 가능)
  await new Promise(() => {});
}

main();

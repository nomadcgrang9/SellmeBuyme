import { chromium } from 'playwright';

async function autoFixRLS() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔧 RLS 정책 자동 수정 (Playwright + Dashboard)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sql = `DROP POLICY IF EXISTS "Only functions can create participant info" ON chat_participants;
DROP POLICY IF EXISTS "Users can create own participant info" ON chat_participants;`;

  console.log('📌 실행할 SQL:');
  console.log(sql);
  console.log('\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('🌐 Supabase Dashboard 접속 중...\n');
    await page.goto('https://supabase.com/dashboard/project/qpwnsvsiduvvqdijyxio/sql/new');

    // Wait for login page or SQL editor
    await page.waitForTimeout(3000);

    const currentUrl = page.url();

    if (currentUrl.includes('sign-in')) {
      console.log('⏳ 로그인이 필요합니다.');
      console.log('   브라우저에서 수동으로 로그인해주세요...\n');
      console.log('   로그인 후, SQL Editor 페이지로 자동 이동합니다.');
      console.log('   (최대 5분 대기)\n');

      // Wait for successful login and redirect to SQL page
      await page.waitForURL('**/sql/**', { timeout: 300000 }); // 5 minutes
      console.log('✅ 로그인 완료!\n');
      await page.waitForTimeout(2000);
    }

    console.log('📝 SQL Editor에 코드 입력 중...\n');

    // Find the SQL editor (CodeMirror or Monaco editor)
    const editorSelector = 'textarea, .monaco-editor, .CodeMirror';
    await page.waitForSelector(editorSelector, { timeout: 10000 });

    // Try to find textarea first
    const textarea = await page.locator('textarea[placeholder*="sql" i], textarea[class*="editor"]').first();

    if (await textarea.isVisible({ timeout: 2000 }).catch(() => false)) {
      await textarea.fill(sql);
      console.log('✅ SQL 입력 완료\n');
    } else {
      // Try clicking on the editor area to focus it
      console.log('⏳ 에디터 포커스 설정 중...');
      const editorArea = await page.locator('.monaco-editor, .CodeMirror').first();
      await editorArea.click();
      await page.waitForTimeout(500);

      // Type the SQL
      await page.keyboard.type(sql);
      console.log('✅ SQL 입력 완료\n');
    }

    await page.waitForTimeout(1000);

    console.log('▶️  "Run" 버튼 클릭 중...\n');

    // Find and click Run button
    const runButton = page.locator('button:has-text("Run"), button[title*="run" i], button:has(svg)').filter({ hasText: /run/i }).first();

    if (await runButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await runButton.click();
      console.log('✅ Run 버튼 클릭 완료\n');

      await page.waitForTimeout(3000);

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ SQL 실행 완료!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      console.log('💡 브라우저에서 결과를 확인하세요.');
      console.log('   "Success. No rows returned" 또는 유사한 메시지가 표시되어야 합니다.\n');
      console.log('💡 다음 단계: 데이터베이스 상태 확인');
      console.log('   npx tsx scripts/db/check-chat-state.ts\n');
      console.log('⏳ 확인 후 브라우저를 닫아주세요...\n');

      // Keep browser open for user to verify
      await new Promise(() => {});

    } else {
      console.log('⚠️  Run 버튼을 찾을 수 없습니다.');
      console.log('   수동으로 Run 버튼을 클릭해주세요.\n');

      // Keep browser open
      await new Promise(() => {});
    }

  } catch (error: any) {
    console.error('❌ 에러 발생:', error.message);
    console.log('\n💡 브라우저를 확인하고 수동으로 진행해주세요.');
    console.log('   Ctrl+C로 종료할 수 있습니다.\n');

    // Keep browser open for manual intervention
    await new Promise(() => {});
  } finally {
    await browser.close();
  }
}

autoFixRLS();

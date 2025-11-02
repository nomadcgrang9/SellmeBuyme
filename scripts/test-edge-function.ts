import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testEdgeFunction() {
  console.log('🧪 Edge Function 테스트 시작...\n');

  // 먼저 로그인 (관리자 계정)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'l34017305@gmail.com',
    password: 'test1234' // 실제 비밀번호로 변경 필요
  });

  if (authError) {
    console.error('❌ 로그인 실패:', authError.message);
    console.log('\n💡 비밀번호를 스크립트에 직접 입력하거나, 이미 로그인된 세션 토큰을 사용해야 합니다.');
    return;
  }

  console.log('✅ 로그인 성공:', authData.user?.email);

  const startTime = Date.now();
  console.log('\n📞 Edge Function 호출 중...\n');

  const { data, error } = await supabase.functions.invoke('profile-recommendations', {
    body: {}
  });

  const duration = Date.now() - startTime;

  if (error) {
    console.error('❌ Edge Function 오류:', error);
    return;
  }

  console.log(`✅ Edge Function 응답 (${duration}ms):\n`);
  console.log('카드 개수:', data.cards?.length || 0);
  console.log('AI 코멘트:', data.ai_comment);

  if (data.cards && data.cards.length > 0) {
    console.log('\n📋 반환된 카드 목록:');
    data.cards.forEach((card: any, idx: number) => {
      console.log(`\n카드 #${idx + 1}:`);
      console.log(`  ID: ${card.id}`);
      console.log(`  타입: ${card.type}`);
      console.log(`  제목: ${card.title || card.name}`);
      console.log(`  지역: ${card.location}`);
      if (card.deadline) {
        console.log(`  마감: ${card.deadline}`);
      }
    });
  }

  // 로그아웃
  await supabase.auth.signOut();
}

testEdgeFunction();

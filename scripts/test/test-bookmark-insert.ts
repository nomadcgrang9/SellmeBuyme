import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testBookmarkInsert() {
  console.log('🧪 북마크 INSERT 테스트\n');
  console.log('='.repeat(60));

  try {
    // 1. 테스트 사용자 확인 (직접 입력하세요)
    const testUserId = 'YOUR_USER_ID_HERE'; // ← 실제 사용자 ID 입력 필요
    const testCardId = 'TEST_CARD_ID';
    const testCardType = 'job';

    if (testUserId === 'YOUR_USER_ID_HERE') {
      console.error('❌ testUserId를 실제 값으로 변경하세요!');
      console.log('\n실제 사용자 ID를 얻으려면:');
      console.log('1. 브라우저에서 로그인');
      console.log('2. 개발자 도구 → Console');
      console.log('3. 실행: localStorage.getItem("supabase.auth.token")');
      return;
    }

    console.log('\n📍 Step 1: 북마크 테이블 RLS 정책 확인');

    const { data: policies, error: policyError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies
          WHERE tablename = 'bookmarks'
          ORDER BY policyname;
        `
      })
      .single();

    if (policyError) {
      console.log('⚠️  RLS 정책 직접 확인 불가 (exec_sql 없음)');
      console.log('\nSupabase Dashboard에서 확인:');
      console.log('Authentication → Policies → bookmarks 테이블');
    } else {
      console.log('✅ RLS 정책:', policies);
    }

    console.log('\n📍 Step 2: 북마크 추가 테스트 (anon key)');

    const { data: insertData, error: insertError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: testUserId,
        card_id: testCardId,
        card_type: testCardType
      })
      .select();

    if (insertError) {
      console.error('❌ INSERT 실패:', insertError);
      console.error('\n에러 상세:');
      console.error('  code:', insertError.code);
      console.error('  message:', insertError.message);
      console.error('  details:', insertError.details);
      console.error('  hint:', insertError.hint);

      if (insertError.message.includes('new row violates row-level security')) {
        console.log('\n🔍 RLS 정책 문제:');
        console.log('1. bookmarks 테이블의 INSERT 정책이 없거나');
        console.log('2. auth.uid() 조건이 맞지 않거나');
        console.log('3. anon key로는 INSERT가 불가능할 수 있음');
      }
    } else {
      console.log('✅ INSERT 성공:', insertData);
    }

    console.log('\n📍 Step 3: 삽입된 데이터 확인');

    const { data: selectData, error: selectError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', testUserId)
      .eq('card_id', testCardId);

    if (selectError) {
      console.error('❌ SELECT 실패:', selectError);
    } else {
      console.log('✅ 조회 결과:', selectData);
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 테스트 완료\n');
}

testBookmarkInsert().catch(console.error);

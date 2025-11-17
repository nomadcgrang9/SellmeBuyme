/**
 * 북마크 테이블 존재 여부 및 구조 확인 스크립트
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// .env 파일 로드
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkBookmarksTable() {
  console.log('🔍 북마크 테이블 확인 중...\n');

  try {
    // 1. 테이블 존재 확인 (SELECT 시도)
    console.log('1️⃣ 테이블 존재 확인...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('bookmarks')
      .select('*')
      .limit(1);

    if (tableError) {
      console.error('❌ 테이블이 존재하지 않거나 접근 불가:', tableError.message);
      console.error('   Code:', tableError.code);
      console.error('   Hint:', tableError.hint);
      return;
    }

    console.log('✅ bookmarks 테이블 존재 확인\n');

    // 2. 현재 사용자 정보 확인
    console.log('2️⃣ 현재 사용자 확인...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ 로그인 필요:', userError?.message);
      return;
    }

    console.log('✅ 로그인됨:', user.email);
    console.log('   User ID:', user.id, '\n');

    // 3. 북마크 추가 테스트
    console.log('3️⃣ 북마크 추가 테스트...');
    const testCardId = '00000000-0000-0000-0000-000000000001'; // 테스트 UUID

    const { data: insertData, error: insertError } = await supabase
      .from('bookmarks')
      .insert({
        user_id: user.id,
        card_type: 'job',
        card_id: testCardId
      })
      .select();

    if (insertError) {
      console.error('❌ 추가 실패:', insertError.message);
      console.error('   Code:', insertError.code);
      console.error('   Hint:', insertError.hint);
      console.error('   Details:', insertError.details);
    } else {
      console.log('✅ 북마크 추가 성공:', insertData);
    }

    // 4. 북마크 조회 테스트
    console.log('\n4️⃣ 북마크 조회 테스트...');
    const { data: selectData, error: selectError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', user.id);

    if (selectError) {
      console.error('❌ 조회 실패:', selectError.message);
    } else {
      console.log('✅ 북마크 조회 성공:', selectData?.length, '개');
      console.log(selectData);
    }

    // 5. 북마크 삭제 테스트 (정리)
    console.log('\n5️⃣ 테스트 데이터 삭제...');
    const { error: deleteError } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('card_id', testCardId);

    if (deleteError) {
      console.error('❌ 삭제 실패:', deleteError.message);
    } else {
      console.log('✅ 테스트 데이터 삭제 완료');
    }

  } catch (error) {
    console.error('❌ 예외 발생:', error);
  }
}

checkBookmarksTable();

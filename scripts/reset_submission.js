/**
 * 남양주 게시판 제출을 pending 상태로 되돌리는 스크립트
 * 사용법: node scripts/reset_submission.js
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resetSubmission() {
  try {
    console.log('🔄 남양주 게시판 제출을 pending 상태로 되돌리는 중...');

    // 남양주 게시판 찾기
    const { data: submissions, error: fetchError } = await supabase
      .from('dev_board_submissions')
      .select('*')
      .ilike('boardName', '%남양주%')
      .limit(1);

    if (fetchError) {
      console.error('❌ 제출 조회 실패:', fetchError);
      process.exit(1);
    }

    if (!submissions || submissions.length === 0) {
      console.error('❌ 남양주 게시판 제출을 찾을 수 없습니다.');
      process.exit(1);
    }

    const submission = submissions[0];
    console.log('📋 찾은 제출:', {
      id: submission.id,
      boardName: submission.boardName,
      status: submission.status,
      crawl_board_id: submission.crawl_board_id,
    });

    // 상태를 pending으로 되돌리기
    const { error: updateError } = await supabase
      .from('dev_board_submissions')
      .update({
        status: 'pending',
        crawl_board_id: null,
        approved_by: null,
        approved_at: null,
      })
      .eq('id', submission.id);

    if (updateError) {
      console.error('❌ 제출 업데이트 실패:', updateError);
      process.exit(1);
    }

    console.log('✅ 제출이 pending 상태로 되돌려졌습니다.');
    console.log('📝 다시 "AI 크롤러 생성" 버튼을 눌러 테스트해 주세요.');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

resetSubmission();

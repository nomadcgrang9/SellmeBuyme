import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// SERVICE_ROLE_KEY 사용하여 RLS 우회
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function approveSubmissionAndUpdateDB() {
  const submissionId = process.env.SUBMISSION_ID;
  const boardName = process.env.BOARD_NAME;
  const boardUrl = process.env.BOARD_URL;
  const adminUserId = process.env.ADMIN_USER_ID;

  if (!submissionId || !boardName || !boardUrl || !adminUserId) {
    console.error('❌ 필수 환경 변수 누락:');
    console.error(`   SUBMISSION_ID: ${submissionId}`);
    console.error(`   BOARD_NAME: ${boardName}`);
    console.error(`   BOARD_URL: ${boardUrl}`);
    console.error(`   ADMIN_USER_ID: ${adminUserId}`);
    process.exit(1);
  }

  console.log('=== 게시판 승인 및 DB 업데이트 시작 ===\n');
  console.log(`제출 ID: ${submissionId}`);
  console.log(`게시판명: ${boardName}`);
  console.log(`URL: ${boardUrl}`);
  console.log(`관리자 ID: ${adminUserId}\n`);

  try {
    // 1. 생성된 크롤러 코드 읽기
    const crawlerFileName = boardName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9가-힣-]/g, '');

    const crawlerPath = join(process.cwd(), 'crawler', 'sources', `${crawlerFileName}.js`);
    console.log(`📂 크롤러 파일 경로: ${crawlerPath}`);

    const crawlerCode = readFileSync(crawlerPath, 'utf-8');
    console.log(`✅ 크롤러 코드 읽기 완료 (${crawlerCode.length}자)\n`);

    // 2. crawl_boards 테이블에 생성 또는 업데이트
    const { data: existingBoard, error: fetchError } = await supabase
      .from('crawl_boards')
      .select('id')
      .eq('board_url', boardUrl)
      .maybeSingle();

    let crawlBoardId: string;

    if (existingBoard) {
      console.log(`📝 기존 게시판 발견, 업데이트 중... (ID: ${existingBoard.id})`);

      const { error: updateError } = await supabase
        .from('crawl_boards')
        .update({
          name: boardName,
          description: `AI 자동 생성 크롤러 - ${boardName}`,
          is_active: true,
          status: 'active',
          crawler_source_code: crawlerCode,
          approved_by: adminUserId,
          approved_at: new Date().toISOString(),
        })
        .eq('id', existingBoard.id);

      if (updateError) {
        throw new Error(`crawl_boards 업데이트 실패: ${updateError.message}`);
      }

      crawlBoardId = existingBoard.id;
      console.log(`✅ 크롤 게시판 업데이트 완료\n`);
    } else {
      console.log('📝 새 게시판 생성 중...');

      const { data, error: insertError } = await supabase
        .from('crawl_boards')
        .insert({
          name: boardName,
          board_url: boardUrl,
          category: 'job',
          description: `AI 자동 생성 크롤러 - ${boardName}`,
          is_active: true,
          status: 'active',
          crawl_batch_size: 10,
          crawler_source_code: crawlerCode,
          approved_by: adminUserId,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertError || !data) {
        throw new Error(`crawl_boards 생성 실패: ${insertError?.message}`);
      }

      crawlBoardId = data.id;
      console.log(`✅ 크롤 게시판 생성 완료 (ID: ${crawlBoardId})\n`);
    }

    // 3. dev_board_submissions 승인 처리
    console.log('📝 제출 승인 처리 중...');

    const { error: submissionError } = await supabase
      .from('dev_board_submissions')
      .update({
        status: 'approved',
        crawl_board_id: crawlBoardId,
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', submissionId);

    if (submissionError) {
      console.warn(`⚠️  제출 승인 업데이트 경고: ${submissionError.message}`);
    } else {
      console.log(`✅ 제출 승인 완료\n`);
    }

    console.log('=== 전체 프로세스 완료 ===');
    console.log(`제출 ID: ${submissionId}`);
    console.log(`크롤 게시판 ID: ${crawlBoardId}`);
    console.log(`크롤러 코드 길이: ${crawlerCode.length}자`);

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

approveSubmissionAndUpdateDB();

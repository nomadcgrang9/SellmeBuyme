import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// SERVICE_ROLE_KEY 사용하여 RLS 우회
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateCrawlerCode() {
  console.log('=== 남양주 크롤러 코드 업데이트 ===\n');

  // 1. 로컬 파일에서 코드 읽기
  const localFilePath = join(process.cwd(), 'crawler', 'sources', '남양주교육지원청-구인구직.js');
  const crawlerCode = readFileSync(localFilePath, 'utf-8');

  console.log(`✅ 로컬 파일 읽기 완료`);
  console.log(`   경로: ${localFilePath}`);
  console.log(`   코드 길이: ${crawlerCode.length}자\n`);

  // 2. 남양주 board ID (GitHub Actions 로그에서 확인)
  const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

  // crawl_boards에서 정보 가져오기
  const { data: board, error: boardError } = await supabase
    .from('crawl_boards')
    .select('id, name, crawler_source_code')
    .eq('id', boardId)
    .single();

  if (boardError || !board) {
    console.error('❌ 남양주 게시판을 찾을 수 없습니다:', boardError?.message);
    return;
  }
  console.log(`📌 업데이트 대상:`);
  console.log(`   ID: ${board.id}`);
  console.log(`   이름: ${board.name}`);
  console.log(`   기존 코드 길이: ${board.crawler_source_code?.length || 0}자\n`);

  // 3. DB 업데이트
  const { error: updateError } = await supabase
    .from('crawl_boards')
    .update({ crawler_source_code: crawlerCode })
    .eq('id', board.id);

  if (updateError) {
    console.error('❌ 업데이트 실패:', updateError.message);
    return;
  }

  console.log(`✅ 크롤러 코드 업데이트 완료!`);
  console.log(`   새 코드 길이: ${crawlerCode.length}자\n`);

  // 4. 검증
  const { data: updated } = await supabase
    .from('crawl_boards')
    .select('crawler_source_code')
    .eq('id', board.id)
    .single();

  console.log(`🎯 검증 결과:`);
  console.log(`   DB에 저장된 코드 길이: ${updated?.crawler_source_code?.length || 0}자`);
  console.log(`   일치 여부: ${updated?.crawler_source_code?.length === crawlerCode.length ? '✅ 성공' : '❌ 실패'}\n`);

  console.log('✅ 작업 완료! 이제 GitHub Actions에서 크롤러를 실행할 수 있습니다.');
}

updateCrawlerCode();

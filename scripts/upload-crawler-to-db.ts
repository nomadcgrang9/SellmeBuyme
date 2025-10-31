import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function uploadCrawlerToDb() {
  const boardName = process.argv[2];

  if (!boardName) {
    console.error('사용법: npx tsx scripts/upload-crawler-to-db.ts <게시판명>');
    process.exit(1);
  }

  console.log(`📝 ${boardName} 크롤러 코드 DB 업로드 시작...\n`);

  // 1. 로컬 파일에서 생성된 크롤러 코드 읽기
  const fileName = boardName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9가-힣-]/g, '');

  const localFilePath = join(process.cwd(), 'crawler', 'sources', `${fileName}.js`);

  if (!existsSync(localFilePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${localFilePath}`);
    process.exit(1);
  }

  const crawlerCode = readFileSync(localFilePath, 'utf-8');

  console.log(`✅ 로컬 파일 읽기 완료`);
  console.log(`   경로: ${localFilePath}`);
  console.log(`   코드 길이: ${crawlerCode.length}자\n`);

  // 2. crawl_boards에서 해당 게시판 찾기 (name으로 검색)
  const { data: boards, error: searchError } = await supabase
    .from('crawl_boards')
    .select('id, name, crawler_source_code')
    .ilike('name', `%${boardName}%`)
    .limit(1);

  if (searchError || !boards || boards.length === 0) {
    console.error(`❌ 게시판을 찾을 수 없습니다: ${boardName}`);
    console.error(`   에러:`, searchError?.message);
    process.exit(1);
  }

  const board = boards[0];

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
    process.exit(1);
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

  console.log('✅ DB 업로드 완료!');
}

uploadCrawlerToDb();

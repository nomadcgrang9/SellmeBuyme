import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join } from 'path';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function restoreCrawlerCode() {
  console.log('\n📦 남양주 크롤러 코드 복원\n');

  // 1. 로컬 파일 읽기
  const filePath = join(process.cwd(), 'crawler', 'sources', '남양주교육지원청-구인구직-테스트.js');
  console.log(`📄 파일 읽기: ${filePath}`);

  const crawlerCode = readFileSync(filePath, 'utf-8');
  console.log(`   코드 길이: ${crawlerCode.length}자\n`);

  // 2. DB에 저장
  const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

  const { data, error } = await supabase
    .from('crawl_boards')
    .update({
      crawler_source_code: crawlerCode
    })
    .eq('id', boardId)
    .select('id, name, crawler_source_code');

  if (error) {
    console.error('❌ DB 저장 실패:', error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.error('❌ 게시판을 찾을 수 없습니다');
    process.exit(1);
  }

  console.log('✅ DB 저장 완료');
  console.log(`   게시판: ${data[0].name}`);
  console.log(`   저장된 코드 길이: ${data[0].crawler_source_code?.length || 0}자\n`);
}

restoreCrawlerCode();

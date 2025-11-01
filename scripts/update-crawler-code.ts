import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function updateCrawlerCode(boardId: string, crawlerFilePath: string) {
  console.log(`\n📝 크롤러 코드 업데이트 중...`);
  console.log(`   Board ID: ${boardId}`);
  console.log(`   File: ${crawlerFilePath}`);

  try {
    // 파일 읽기
    const crawlerCode = readFileSync(crawlerFilePath, 'utf-8');
    console.log(`   코드 길이: ${crawlerCode.length}자`);

    // DB 업데이트
    const { data, error } = await supabase
      .from('crawl_boards')
      .update({ crawler_code: crawlerCode })
      .eq('id', boardId);

    if (error) throw error;

    console.log(`\n✅ 크롤러 코드 업데이트 완료!`);
  } catch (error) {
    console.error('\n❌ 에러 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';
const crawlerFilePath = join(process.cwd(), 'crawler', 'sources', '남양주교육지원청-구인구직.js');

updateCrawlerCode(boardId, crawlerFilePath);

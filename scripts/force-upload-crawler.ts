import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function forceUpload() {
  const boardId = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';
  const filePath = 'crawler/sources/남양주교육지원청-구인구직-테스트.js';

  console.log('📝 강제 업로드 시작...\n');

  const code = readFileSync(filePath, 'utf-8');
  console.log(`✅ 파일 읽기 완료: ${code.length}자\n`);

  const { error } = await supabase
    .from('crawl_boards')
    .update({ crawler_source_code: code })
    .eq('id', boardId);

  if (error) {
    console.error('❌ 업로드 실패:', error);
    process.exit(1);
  }

  console.log('✅ 업로드 완료!\n');

  // 검증
  const { data } = await supabase
    .from('crawl_boards')
    .select('crawler_source_code')
    .eq('id', boardId)
    .single();

  console.log(`🎯 검증: DB에 저장된 코드 길이 = ${data?.crawler_source_code?.length}자`);
}

forceUpload();

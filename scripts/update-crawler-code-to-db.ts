import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

async function main() {
  console.log('📝 AI 크롤러 코드를 DB에 업데이트\n');

  // 1. 생성된 크롤러 파일 읽기
  const filePath = 'C:\\PRODUCT\\sellmebuyme\\crawler\\sources\\남양주교육지원청-구인구직-테스트.js';
  console.log('파일 읽는 중:', filePath);

  const code = readFileSync(filePath, 'utf-8');
  console.log('코드 길이:', code.length, '자\n');

  // 2. DB 업데이트 (먼저 컬럼이 있는지 확인)
  console.log('DB 업데이트 시도 중...');

  const { data, error } = await supabase
    .from('crawl_boards')
    .update({ crawler_source_code: code })
    .eq('id', BOARD_ID)
    .select('id, name, crawler_source_code');

  if (error) {
    console.error('❌ 업데이트 실패:', error.message);
    console.log('\n컬럼이 없을 가능성이 있습니다. Supabase Dashboard에서 수동으로 추가하세요:');
    console.log('ALTER TABLE crawl_boards ADD COLUMN crawler_source_code TEXT;');
  } else {
    console.log('✅ 업데이트 성공!');
    console.log('게시판:', data[0].name);
    console.log('저장된 코드 길이:', data[0].crawler_source_code?.length || 0, '자');
  }
}

main();

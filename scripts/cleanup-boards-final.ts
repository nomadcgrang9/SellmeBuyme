import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function cleanupBoardsFinal() {
  console.log('\n🗑️  crawl_boards 최종 정리\n');

  const { error, count } = await supabase
    .from('crawl_boards')
    .delete({ count: 'exact' })
    .or('name.ilike.%구리남양주%,name.ilike.%남양주%');

  if (error) {
    console.log(`❌ 실패: ${error.message}`);
  } else {
    console.log(`✅ ${count}개 삭제 완료!\n`);
  }
}

cleanupBoardsFinal();

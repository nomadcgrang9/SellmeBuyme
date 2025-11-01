import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function resetSubmission() {
  console.log('=== 남양주 제출 상태 리셋 ===\n');

  const { error } = await supabase
    .from('dev_board_submissions')
    .update({
      status: 'pending',
      approved_by: null,
      approved_at: null,
      crawl_board_id: null,
    })
    .eq('board_name', '남양주교육지원청 구인구직');

  if (error) {
    console.error('❌ 오류:', error);
  } else {
    console.log('✅ 제출 상태를 pending으로 리셋 완료');
  }
}

resetSubmission();

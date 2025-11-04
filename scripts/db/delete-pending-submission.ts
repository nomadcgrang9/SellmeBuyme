import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function deletePendingSubmission() {
  const submissionId = '3dc6e37b-47ea-43e8-8ab4-105786e1b26a';

  console.log('=== pending 제출 삭제 시작 ===\n');
  console.log(`제출 ID: ${submissionId}\n`);

  const { error } = await supabase
    .from('dev_board_submissions')
    .delete()
    .eq('id', submissionId);

  if (error) {
    console.error('❌ 삭제 실패:', error);
    process.exit(1);
  }

  console.log('✅ 삭제 완료');
}

deletePendingSubmission();

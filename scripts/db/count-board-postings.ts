import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function countBoardPostings(boardId: string, boardName: string) {
  const { count, error } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .eq('crawl_board_id', boardId);

  if (error) {
    console.error(`❌ ${boardName} 조회 실패:`, error);
    return;
  }

  console.log(`${boardName} 공고 수: ${count}개`);
}

async function main() {
  console.log('=== 크롤링 전 공고 수 확인 ===\n');

  await countBoardPostings('5a94f47d-5feb-4821-99af-f8805cc3d619', '성남교육지원청');
  await countBoardPostings('55d09cac-71aa-48d5-a8b8-bbd9181970bb', '의정부교육지원청');
  await countBoardPostings('5d7799d9-5d8d-47a2-b0df-6dd4f39449bd', '구리남양주 기간제교사');
  await countBoardPostings('ce968fdd-6fe4-4fb7-8ec8-60d491932c6c', '남양주교육지원청');
}

main();

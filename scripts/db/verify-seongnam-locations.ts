import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifySeongnamLocations() {
  const boardId = '5a94f47d-5feb-4821-99af-f8805cc3d619'; // 성남

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, created_at')
    .eq('crawl_board_id', boardId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`=== 성남교육지원청 공고 (${data?.length || 0}개) ===\n`);

  for (const job of data || []) {
    const locationStatus = job.location === '성남' ? '✅' : '❌';
    console.log(`${locationStatus} ${job.organization}`);
    console.log(`   제목: ${job.title}`);
    console.log(`   지역: ${job.location}`);
    console.log(`   생성: ${job.created_at}`);
    console.log('');
  }
}

verifySeongnamLocations();

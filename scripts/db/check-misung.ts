import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMisung() {
  console.log('=== 지역 미상 공고 확인 ===\n');

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, crawl_board_id, created_at')
    .eq('location', '미상')
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`총 ${data?.length || 0}개 발견:\n`);

  for (const job of data || []) {
    console.log(`공고 ID: ${job.id}`);
    console.log(`제목: ${job.title}`);
    console.log(`기관: ${job.organization}`);
    console.log(`지역: ${job.location}`);
    console.log(`crawl_board_id: ${job.crawl_board_id || 'NULL'}`);
    console.log(`생성일: ${job.created_at}`);
    console.log('---\n');
  }
}

checkMisung();

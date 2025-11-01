import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGuriJobs() {
  const boardId = '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd';

  // crawl_board_id로 조회
  const { data: byBoardId, error: error1 } = await supabase
    .from('job_postings')
    .select('id, organization, attachment_url, crawl_board_id, crawl_source_id')
    .eq('crawl_board_id', boardId);

  console.log('\n=== crawl_board_id로 조회 ===');
  console.log(`총 ${byBoardId?.length || 0}개`);
  if (byBoardId && byBoardId.length > 0) {
    byBoardId.forEach(j => {
      console.log(`- ${j.organization}: attachment_url=${j.attachment_url ? '있음' : 'NULL'}`);
    });
  }

  // crawl_source_id로 조회
  const { data: bySourceId, error: error2 } = await supabase
    .from('job_postings')
    .select('id, organization, attachment_url, crawl_board_id, crawl_source_id')
    .eq('crawl_source_id', boardId);

  console.log('\n=== crawl_source_id로 조회 ===');
  console.log(`총 ${bySourceId?.length || 0}개`);
  if (bySourceId && bySourceId.length > 0) {
    bySourceId.forEach(j => {
      console.log(`- ${j.organization}: attachment_url=${j.attachment_url ? '있음' : 'NULL'}`);
    });
  }

  // 최근 10개 공고 (어떤 게시판이든)
  const { data: recent } = await supabase
    .from('job_postings')
    .select('id, organization, attachment_url, crawl_board_id, crawl_source_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('\n=== 최근 10개 공고 ===');
  recent?.forEach(j => {
    console.log(`- ${j.organization}`);
    console.log(`  crawl_board_id: ${j.crawl_board_id}`);
    console.log(`  crawl_source_id: ${j.crawl_source_id}`);
    console.log(`  attachment_url: ${j.attachment_url ? j.attachment_url.substring(0, 100) : 'NULL'}`);
  });
}

checkGuriJobs();

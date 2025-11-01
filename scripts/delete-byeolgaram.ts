import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteByeolgaram() {
  console.log('\n🗑️  별가람중학교 공고 삭제\n');

  // 1. 별가람중학교 공고 찾기
  const { data: jobs, error: searchError } = await supabase
    .from('job_postings')
    .select('id, title, organization, crawl_source_id')
    .ilike('organization', '%별가람%');

  if (searchError) {
    console.error('❌ 검색 실패:', searchError.message);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚪ 별가람중학교 공고 없음');
    return;
  }

  console.log(`📋 별가람중학교: ${jobs.length}개 발견`);
  jobs.forEach(job => {
    console.log(`   - ${job.title}`);
    console.log(`     조직: ${job.organization}`);
    console.log(`     ID: ${job.id}`);
    console.log(`     crawl_source_id: ${job.crawl_source_id}\n`);
  });

  // 2. 삭제
  const { error: deleteError, count } = await supabase
    .from('job_postings')
    .delete({ count: 'exact' })
    .ilike('organization', '%별가람%');

  if (deleteError) {
    console.error(`❌ 삭제 실패:`, deleteError.message);
  } else {
    console.log(`✅ ${count}개 공고 삭제 완료!\n`);
  }

  console.log('✅ 프론트엔드를 새로고침하면 공고가 사라집니다.\n');
}

deleteByeolgaram();

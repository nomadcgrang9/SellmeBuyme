import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function completeReset() {
  console.log('\n🔴 전체 데이터베이스 초기화\n');

  try {
    // 1. job_postings 삭제
    console.log('1️⃣  job_postings 삭제 중...');
    const jp = await supabase.from('job_postings').delete({ count: 'exact' });
    console.log(`   ✅ ${jp.count || 0}개 삭제\n`);

    // 2. crawl_logs 삭제
    console.log('2️⃣  crawl_logs 삭제 중...');
    const cl = await supabase.from('crawl_logs').delete({ count: 'exact' });
    console.log(`   ✅ ${cl.count || 0}개 삭제\n`);

    // 3. dev_board_submissions 삭제
    console.log('3️⃣  dev_board_submissions 삭제 중...');
    const dbs = await supabase.from('dev_board_submissions').delete({ count: 'exact' });
    console.log(`   ✅ ${dbs.count || 0}개 삭제\n`);

    // 4. crawl_boards 삭제
    console.log('4️⃣  crawl_boards 삭제 중...');
    const cb = await supabase.from('crawl_boards').delete({ count: 'exact' });
    console.log(`   ✅ ${cb.count || 0}개 삭제\n`);

    console.log('✅ 완전 초기화 완료!\n');
    console.log('📊 최종 상태:');
    console.log(`   - job_postings: 0개`);
    console.log(`   - crawl_logs: 0개`);
    console.log(`   - dev_board_submissions: 0개`);
    console.log(`   - crawl_boards: 0개\n`);

  } catch (error) {
    console.error('❌ 오류:', error);
  }
}

completeReset();

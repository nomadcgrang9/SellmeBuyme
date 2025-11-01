import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteNamyangjuJobs() {
  console.log('\n🗑️  구리남양주 관련 공고 삭제\n');

  // 삭제할 조직 키워드
  const keywords = [
    '남양주송라초등학교',
    '별내초등학교',
    '남양주다산중학교',
    '구리남양주',
    '동인초등학교병설유치원',
    '다산꽃다비유치원'
  ];

  console.log('🔍 삭제 대상 검색 중...\n');

  let totalDeleted = 0;

  for (const keyword of keywords) {
    // 1. 해당 키워드로 공고 찾기
    const { data: jobs, error: searchError } = await supabase
      .from('job_postings')
      .select('id, title, organization, crawl_source_id')
      .ilike('organization', `%${keyword}%`);

    if (searchError) {
      console.error(`❌ ${keyword} 검색 실패:`, searchError.message);
      continue;
    }

    if (!jobs || jobs.length === 0) {
      console.log(`⚪ ${keyword}: 공고 없음`);
      continue;
    }

    console.log(`📋 ${keyword}: ${jobs.length}개 발견`);
    jobs.forEach(job => {
      console.log(`   - ${job.title} (ID: ${job.id})`);
    });

    // 2. 삭제
    const { error: deleteError, count } = await supabase
      .from('job_postings')
      .delete({ count: 'exact' })
      .ilike('organization', `%${keyword}%`);

    if (deleteError) {
      console.error(`   ❌ 삭제 실패:`, deleteError.message);
    } else {
      console.log(`   ✅ ${count}개 삭제 완료\n`);
      totalDeleted += count || 0;
    }
  }

  console.log(`\n🎯 총 ${totalDeleted}개 공고 삭제 완료!\n`);

  // 3. 구리남양주 게시판의 crawl_logs도 삭제
  console.log('🗑️  crawl_logs 정리 중...\n');

  const { data: boards } = await supabase
    .from('crawl_boards')
    .select('id, name')
    .ilike('name', '%구리남양주%');

  if (boards && boards.length > 0) {
    for (const board of boards) {
      console.log(`📋 ${board.name} (${board.id})`);

      const { error: logsError, count: logsCount } = await supabase
        .from('crawl_logs')
        .delete({ count: 'exact' })
        .eq('board_id', board.id);

      if (logsError) {
        console.error(`   ❌ crawl_logs 삭제 실패:`, logsError.message);
      } else {
        console.log(`   ✅ crawl_logs ${logsCount}개 삭제 완료\n`);
      }
    }
  }

  console.log('✅ 모든 정리 완료! 프론트엔드를 새로고침하면 공고가 사라집니다.\n');
}

deleteNamyangjuJobs();

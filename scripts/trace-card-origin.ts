import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function traceCardOrigin() {
  console.log('\n🔍 스크린샷의 공고 출처 추적\n');

  // 스크린샷에 보이는 2개 공고
  const cards = [
    { title: '특기적성 강사', organization: '초등학교' },
    { title: '교육공무직원(특수교육지도사)', organization: '별가람중학교' }
  ];

  for (const card of cards) {
    console.log(`📋 "${card.title}" - ${card.organization}\n`);

    // 1. job_postings에서 찾기
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('id, title, organization, location, crawl_source_id, created_at, source_url')
      .ilike('title', `%${card.title}%`)
      .ilike('organization', `%${card.organization}%`)
      .limit(5);

    if (error) {
      console.log(`   ❌ 조회 실패: ${error.message}\n`);
      continue;
    }

    if (!jobs || jobs.length === 0) {
      console.log(`   ❌ DB에 존재하지 않음\n`);
      continue;
    }

    for (const job of jobs) {
      console.log(`   ✅ 찾음!`);
      console.log(`      ID: ${job.id}`);
      console.log(`      타이틀: ${job.title}`);
      console.log(`      조직: ${job.organization}`);
      console.log(`      지역: ${job.location}`);
      console.log(`      crawl_source_id: ${job.crawl_source_id}`);
      console.log(`      생성일: ${job.created_at}`);
      console.log(`      출처URL: ${job.source_url}\n`);

      // 2. crawl_source_id로 게시판 정보 찾기
      if (job.crawl_source_id) {
        const { data: board } = await supabase
          .from('crawl_boards')
          .select('id, name, is_active, approved_at')
          .eq('id', job.crawl_source_id)
          .single();

        if (board) {
          console.log(`      📌 소속 게시판: ${board.name}`);
          console.log(`         활성화: ${board.is_active}`);
          console.log(`         승인일: ${board.approved_at || '미승인'}\n`);
        }
      }
    }
  }
}

traceCardOrigin();

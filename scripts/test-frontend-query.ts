import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function testFrontendQuery() {
  console.log('=== 프론트엔드 쿼리 테스트 (남양주 검색) ===\n');

  // 프론트엔드와 동일한 쿼리
  const searchQuery = '남양주';
  const pattern = `%${searchQuery}%`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  console.log(`검색어: "${searchQuery}"`);
  console.log(`오늘 날짜: ${todayIso}\n`);

  let query = supabase
    .from('job_postings')
    .select('id, title, organization, location, deadline, created_at', { count: 'exact' });

  // 검색 조건 추가 (title, organization, location, subject에서 검색)
  query = query.or(
    `title.ilike.${pattern},organization.ilike.${pattern},location.ilike.${pattern},subject.ilike.${pattern}`
  );

  // 마감일 필터 (NULL이거나 오늘 이후)
  query = query.or(`deadline.is.null,deadline.gte.${todayIso}`);

  // 최신순 정렬
  query = query.order('created_at', { ascending: false });

  // 12개 가져오기 (기본 limit)
  query = query.range(0, 11);

  const { data, error, count } = await query;

  if (error) {
    console.log('❌ 쿼리 오류:', error.message);
    return;
  }

  console.log(`✅ 결과: ${count}개\n`);

  if (!data || data.length === 0) {
    console.log('❌ 결과가 없습니다.');
    return;
  }

  data.forEach((job, i) => {
    console.log(`${i + 1}. ${job.title?.substring(0, 60)}`);
    console.log(`   조직: ${job.organization}`);
    console.log(`   위치: ${job.location || 'NULL'}`);
    console.log(`   마감일: ${job.deadline || 'NULL'}`);
    console.log();
  });
}

testFrontendQuery();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyNamyangjuCrawl() {
  const boardId = '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd';

  console.log('=== 구리남양주 크롤링 결과 검증 ===\n');

  // 1. Board 정보 확인
  const { data: board } = await supabase
    .from('crawl_boards')
    .select('id, name, region, is_local_government')
    .eq('id', boardId)
    .single();

  console.log('📋 Board 정보:');
  console.log(`   Name: ${board?.name}`);
  console.log(`   Region: ${board?.region}`);
  console.log(`   Is Local Government: ${board?.is_local_government}\n`);

  // 2. 이번 크롤링으로 생성된 공고 조회 (최근 10분 이내)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: recentJobs, error } = await supabase
    .from('job_postings')
    .select('id, organization, title, location, crawl_board_id, created_at')
    .eq('crawl_board_id', boardId)
    .gte('created_at', tenMinutesAgo)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`🆕 최근 10분 내 생성된 공고: ${recentJobs?.length || 0}개\n`);

  if (!recentJobs || recentJobs.length === 0) {
    console.log('⚠️  최근 생성된 공고가 없습니다.');
    return;
  }

  // 3. 각 공고의 location 확인
  const expectedLocation = board?.region || '구리남양주';
  let correctCount = 0;
  let misungCount = 0;

  for (const job of recentJobs) {
    const locationStatus =
      job.location === expectedLocation ? '✅' :
      job.location === '미상' ? '❌ 미상' :
      `⚠️  ${job.location}`;

    if (job.location === expectedLocation) correctCount++;
    if (job.location === '미상') misungCount++;

    console.log(`${locationStatus} ${job.organization} - ${job.title}`);
    console.log(`   지역: ${job.location}`);
    console.log(`   생성: ${job.created_at}\n`);
  }

  // 4. 결과 요약
  console.log('=== 📊 결과 요약 ===');
  console.log(`총 ${recentJobs.length}개 공고 생성`);
  console.log(`✅ 정상 (location="${expectedLocation}"): ${correctCount}개`);
  console.log(`❌ 미상: ${misungCount}개`);
  console.log(`⚠️  기타: ${recentJobs.length - correctCount - misungCount}개\n`);

  if (correctCount === recentJobs.length) {
    console.log('🎉 모든 공고의 location이 정상적으로 설정되었습니다!');
  } else if (misungCount > 0) {
    console.log('⚠️  일부 공고가 "미상"으로 표시되었습니다. 크롤러 코드 점검이 필요합니다.');
  }

  // 5. 전체 통계
  const { count: totalCount } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .eq('crawl_board_id', boardId);

  console.log(`\n📈 전체 통계: ${totalCount}개 공고`);
}

verifyNamyangjuCrawl();

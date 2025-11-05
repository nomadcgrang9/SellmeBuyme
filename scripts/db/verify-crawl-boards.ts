import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyCrawlBoards() {
  console.log('=== 정밀 진단: 크롤링 게시판 설정 ===\n');

  // 1. GitHub Actions 스케줄 시각
  console.log('1️⃣ GitHub Actions 스케줄 시각');
  console.log('   Cron: 0 1 * * * (UTC)');
  console.log('   한국시간: 매일 오전 10시 (UTC+9)\n');

  // 2. Scheduled matrix 확인
  console.log('2️⃣ Scheduled 크롤링 Matrix 구성');
  const scheduledBoards = [
    { id: 'f4c852f1-f49a-42c5-8823-0edd346f99bb', source: 'gyeonggi', name: '경기도교육청 구인정보조회' },
    { id: '5a94f47d-5feb-4821-99af-f8805cc3d619', source: 'seongnam', name: '성남교육지원청 구인' },
    { id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb', source: 'uijeongbu', name: '의정부교육지원청 구인' },
    { id: '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd', source: 'ai-generated', name: '구리남양주 기간제교사' },
    { id: 'de02eada-6569-45df-9f4d-45a4fcc51879', source: 'ai-generated', name: '가평교육지원청 기간제교원 구인구직' },
  ];

  for (const board of scheduledBoards) {
    console.log(`   ✅ ${board.name}`);
    console.log(`      ID: ${board.id}`);
    console.log(`      Source: ${board.source}`);
  }

  console.log('\n3️⃣ DB에 등록된 승인된 게시판 확인');

  const { data: approvedBoards, error } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url, region, is_local_government, crawler_source_code, is_active, approved_at')
    .eq('is_active', true)
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false });

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`   총 ${approvedBoards?.length || 0}개 게시판 승인됨\n`);

  // 4. 각 게시판 상세 확인
  for (const board of approvedBoards || []) {
    const inSchedule = scheduledBoards.find(s => s.id === board.id);
    const statusIcon = inSchedule ? '✅' : '⚠️';

    console.log(`${statusIcon} ${board.name}`);
    console.log(`   ID: ${board.id}`);
    console.log(`   URL: ${board.board_url}`);
    console.log(`   Region: ${board.region}`);
    console.log(`   Is Local Government: ${board.is_local_government}`);
    console.log(`   Crawler Code: ${board.crawler_source_code ? '있음 (AI 생성)' : 'NULL (Manual)'}`);
    console.log(`   Approved At: ${board.approved_at}`);

    if (inSchedule) {
      console.log(`   ✅ Scheduled Matrix에 포함됨 (source: ${inSchedule.source})`);
    } else {
      console.log(`   ⚠️  Scheduled Matrix에 없음 - 자동 크롤링 안됨!`);
    }
    console.log('');
  }

  // 5. 구리남양주 특별 점검
  console.log('\n4️⃣ 구리남양주 특별 점검');
  const namyangjuBoard = approvedBoards?.find(b => b.id === '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd');

  if (!namyangjuBoard) {
    console.log('   ❌ DB에 구리남양주 게시판이 없음!');
  } else {
    console.log(`   ✅ DB 등록: ${namyangjuBoard.name}`);
    console.log(`   ✅ Region: ${namyangjuBoard.region}`);
    console.log(`   ✅ Crawler Code: ${namyangjuBoard.crawler_source_code ? 'AI 생성 크롤러 있음' : '없음'}`);

    const inSchedule = scheduledBoards.find(s => s.id === '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd');
    if (inSchedule && inSchedule.source === 'ai-generated') {
      console.log(`   ✅ Scheduled Matrix: source=ai-generated (올바름)`);
    } else if (inSchedule) {
      console.log(`   ❌ Scheduled Matrix: source=${inSchedule.source} (잘못됨! ai-generated여야 함)`);
    } else {
      console.log(`   ❌ Scheduled Matrix에 없음`);
    }
  }

  // 6. Manual dispatch 매핑 확인
  console.log('\n5️⃣ Manual Dispatch Board ID 매핑');
  const manualMappings = [
    { id: 'f4c852f1-f49a-42c5-8823-0edd346f99bb', source: 'gyeonggi' },
    { id: '5a94f47d-5feb-4821-99af-f8805cc3d619', source: 'seongnam' },
    { id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb', source: 'uijeongbu' },
    { id: '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd', source: 'ai-generated' },
  ];

  for (const mapping of manualMappings) {
    const board = approvedBoards?.find(b => b.id === mapping.id);
    if (board) {
      const isCorrect =
        (mapping.source === 'ai-generated' && board.crawler_source_code) ||
        (mapping.source !== 'ai-generated' && !board.crawler_source_code);

      const icon = isCorrect ? '✅' : '❌';
      console.log(`   ${icon} ${board.name}: ${mapping.source}`);
    }
  }

  // 7. 최종 요약
  console.log('\n6️⃣ 최종 요약');
  const scheduledBoardIds = scheduledBoards.map(b => b.id);
  const approvedBoardIds = (approvedBoards || []).map(b => b.id);

  const missingInSchedule = approvedBoardIds.filter(id => !scheduledBoardIds.includes(id));
  const missingInDb = scheduledBoardIds.filter(id => !approvedBoardIds.includes(id));

  console.log(`   ✅ 스케줄 등록: ${scheduledBoards.length}개`);
  console.log(`   ✅ DB 승인: ${approvedBoards?.length || 0}개`);

  if (missingInSchedule.length > 0) {
    console.log(`   ⚠️  DB에만 있고 스케줄 없음: ${missingInSchedule.length}개`);
    for (const id of missingInSchedule) {
      const board = approvedBoards?.find(b => b.id === id);
      console.log(`      - ${board?.name} (${id})`);
    }
  }

  if (missingInDb.length > 0) {
    console.log(`   ❌ 스케줄에만 있고 DB 없음: ${missingInDb.length}개`);
    for (const id of missingInDb) {
      const board = scheduledBoards.find(b => b.id === id);
      console.log(`      - ${board?.name} (${id})`);
    }
  }

  if (missingInSchedule.length === 0 && missingInDb.length === 0) {
    console.log(`   🎉 모든 게시판이 정확히 동기화됨!`);
  }
}

verifyCrawlBoards();

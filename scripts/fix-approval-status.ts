import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARDS_TO_APPROVE = [
  {
    id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb',
    name: '의정부교육지원청 구인'
  },
  {
    id: '5a94f47d-5feb-4821-99af-f8805cc3d619',
    name: '성남교육지원청 구인'
  },
  {
    id: 'f4c852f1-f49a-42c5-8823-0edd346f99bb',
    name: '경기도 교육청 구인정보조회'
  }
];

// 관리자 사용자 ID (남양주 게시판을 승인한 사용자와 동일)
const ADMIN_USER_ID = '85823de2-b69b-4829-8e1b-c3764c7d633c';

async function fixApprovalStatus() {
  console.log('✅ 승인 상태 수정 시작...\n');

  for (const board of BOARDS_TO_APPROVE) {
    try {
      console.log(`🔍 [${board.name}]`);
      console.log(`   ID: ${board.id}`);

      // approved_at과 approved_by 설정
      const { data, error } = await supabase
        .from('crawl_boards')
        .update({
          approved_at: new Date().toISOString(),
          approved_by: ADMIN_USER_ID
        })
        .eq('id', board.id)
        .select()
        .single();

      if (error) {
        console.log(`   ❌ 승인 상태 수정 실패:`, error.message);
      } else {
        console.log(`   ✅ 승인 상태 수정 완료`);
        console.log(`   승인 시각: ${new Date(data.approved_at).toLocaleString('ko-KR')}`);
      }

      console.log('');
    } catch (error: any) {
      console.error(`   ❌ 오류 발생:`, error.message);
      console.log('');
    }
  }

  console.log('🎉 모든 게시판 승인 상태 수정 완료!');
}

fixApprovalStatus().catch(err => console.error('Error:', err));

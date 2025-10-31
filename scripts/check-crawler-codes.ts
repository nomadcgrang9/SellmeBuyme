import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARDS = [
  { id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb', name: '의정부교육지원청 구인' },
  { id: '5a94f47d-5feb-4821-99af-f8805cc3d619', name: '성남교육지원청 구인' },
  { id: 'f4c852f1-f49a-42c5-8823-0edd346f99bb', name: '경기도 교육청 구인정보조회' },
  { id: 'f72665d5-eaa1-4f2f-af98-97e27bd441cf', name: '남양주교육지원청 구인구직' },
];

async function checkCrawlerCodes() {
  console.log('🔍 crawler_source_code 확인 중...\n');

  for (const board of BOARDS) {
    const { data, error } = await supabase
      .from('crawl_boards')
      .select('crawler_source_code')
      .eq('id', board.id)
      .single();

    if (error) {
      console.log(`❌ [${board.name}] 조회 실패:`, error.message);
      continue;
    }

    const code = data?.crawler_source_code;
    const codeLength = code?.length || 0;

    console.log(`📋 [${board.name}]`);
    console.log(`   ID: ${board.id}`);

    if (!code) {
      console.log(`   ❌ crawler_source_code: NULL (크롤러 코드 없음)`);
      console.log(`   → AI 크롤러 생성 필요!\n`);
    } else {
      console.log(`   ✅ crawler_source_code: ${codeLength} 글자`);

      // 코드 샘플 확인
      const firstLine = code.split('\n')[0];
      console.log(`   첫 줄: ${firstLine.substring(0, 80)}...`);

      // export 함수 확인
      const hasExport = code.includes('export');
      const hasFunction = code.includes('function');
      console.log(`   export 키워드: ${hasExport ? '✅' : '❌'}`);
      console.log(`   function 키워드: ${hasFunction ? '✅' : '❌'}\n`);
    }
  }

  console.log('🎯 요약:');
  const { data: all } = await supabase
    .from('crawl_boards')
    .select('name, crawler_source_code')
    .in('id', BOARDS.map(b => b.id));

  const withCode = all?.filter(b => b.crawler_source_code != null).length || 0;
  const withoutCode = all?.filter(b => b.crawler_source_code == null).length || 0;

  console.log(`   코드 있음: ${withCode}개`);
  console.log(`   코드 없음: ${withoutCode}개`);
}

checkCrawlerCodes().catch(err => console.error('Error:', err));

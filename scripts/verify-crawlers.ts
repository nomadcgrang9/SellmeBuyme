import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '(존재)' : '(없음)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const LEGACY_CRAWLERS = [
  { id: '5a94f47d-5feb-4821-99af-f8805cc3d619', source: 'seongnam', name: '성남교육지원청' },
  { id: 'f4c852f1-f49a-42c5-8823-0edd346f99bb', source: 'gyeonggi', name: '경기도교육청' },
  { id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb', source: 'uijeongbu', name: '의정부교육지원청' },
  { id: '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd', source: 'namyangju', name: '구리남양주교육지원청' },
];

const AI_CRAWLERS = [
  { id: 'ce968fdd-6fe4-4fb7-8ec8-60d491932c6c', name: '남양주교육지원청-구인구직' },
  { id: 'de02eada-6569-45df-9f4d-45a4fcc51879', name: '가평교육지원청 기간제교원 구인구직' },
];

async function main() {
  console.log('🔍 크롤러 시스템 검증 시작\n');

  console.log('='.repeat(80));
  console.log('✅ Legacy 크롤러 (4개) - sources.json 기반');
  console.log('='.repeat(80));

  for (const crawler of LEGACY_CRAWLERS) {
    const { data, error } = await supabase
      .from('crawl_boards')
      .select('id, name, board_url, region, is_local_government, last_crawled_at')
      .eq('id', crawler.id)
      .single();

    if (error) {
      console.log(`\n❌ ${crawler.name} (${crawler.source})`);
      console.log(`   Board ID: ${crawler.id}`);
      console.log(`   오류: DB에서 찾을 수 없음 - ${error.message}`);
      continue;
    }

    if (!data) {
      console.log(`\n❌ ${crawler.name} (${crawler.source})`);
      console.log(`   Board ID: ${crawler.id}`);
      console.log(`   오류: 데이터 없음`);
      continue;
    }

    console.log(`\n✅ ${crawler.name} (${crawler.source})`);
    console.log(`   Board ID: ${data.id}`);
    console.log(`   Board URL: ${data.board_url}`);
    console.log(`   Region: ${data.region || '(없음)'}`);
    console.log(`   Local Government: ${data.is_local_government ? 'Yes' : 'No'}`);
    console.log(`   Last Crawled: ${data.last_crawled_at || '(없음)'}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🤖 AI 크롤러 (2개) - DB crawler_source_code 기반');
  console.log('='.repeat(80));

  for (const crawler of AI_CRAWLERS) {
    const { data, error } = await supabase
      .from('crawl_boards')
      .select('id, name, board_url, region, is_local_government, crawler_source_code, last_crawled_at')
      .eq('id', crawler.id)
      .single();

    if (error) {
      console.log(`\n❌ ${crawler.name}`);
      console.log(`   Board ID: ${crawler.id}`);
      console.log(`   오류: DB에서 찾을 수 없음 - ${error.message}`);
      continue;
    }

    if (!data) {
      console.log(`\n❌ ${crawler.name}`);
      console.log(`   Board ID: ${crawler.id}`);
      console.log(`   오류: 데이터 없음`);
      continue;
    }

    const hasCode = !!data.crawler_source_code;
    const codeLength = hasCode ? data.crawler_source_code.length : 0;

    console.log(`\n${hasCode ? '✅' : '⚠️ '} ${crawler.name}`);
    console.log(`   Board ID: ${data.id}`);
    console.log(`   Board URL: ${data.board_url}`);
    console.log(`   Region: ${data.region || '(없음)'}`);
    console.log(`   Local Government: ${data.is_local_government ? 'Yes' : 'No'}`);
    console.log(`   Crawler Code: ${hasCode ? `✅ 존재 (${codeLength} chars)` : '❌ NULL'}`);
    console.log(`   Last Crawled: ${data.last_crawled_at || '(없음)'}`);

    if (!hasCode) {
      console.log(`   ⚠️  WARNING: crawler_source_code가 없어 AI 크롤러 실행 불가`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📊 검증 요약');
  console.log('='.repeat(80));

  const legacyResults = await Promise.all(
    LEGACY_CRAWLERS.map(async (c) => {
      const { data } = await supabase.from('crawl_boards').select('id').eq('id', c.id).single();
      return { ...c, exists: !!data };
    })
  );

  const aiResults = await Promise.all(
    AI_CRAWLERS.map(async (c) => {
      const { data } = await supabase
        .from('crawl_boards')
        .select('id, crawler_source_code')
        .eq('id', c.id)
        .single();
      return { ...c, exists: !!data, hasCode: !!data?.crawler_source_code };
    })
  );

  const legacyOk = legacyResults.filter((r) => r.exists).length;
  const aiOk = aiResults.filter((r) => r.exists && r.hasCode).length;
  const aiPartial = aiResults.filter((r) => r.exists && !r.hasCode).length;

  console.log(`\n✅ Legacy 크롤러: ${legacyOk}/${LEGACY_CRAWLERS.length} 정상`);
  console.log(`✅ AI 크롤러 (완전): ${aiOk}/${AI_CRAWLERS.length} 정상`);
  if (aiPartial > 0) {
    console.log(`⚠️  AI 크롤러 (부분): ${aiPartial}/${AI_CRAWLERS.length} (DB 존재하지만 코드 없음)`);
  }

  const totalOk = legacyOk + aiOk;
  const totalExpected = LEGACY_CRAWLERS.length + AI_CRAWLERS.length;

  if (totalOk === totalExpected) {
    console.log(`\n🎉 모든 크롤러 검증 완료 (${totalOk}/${totalExpected})`);
  } else {
    console.log(`\n⚠️  일부 크롤러 문제 발견 (${totalOk}/${totalExpected})`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ 검증 실패:', err);
  process.exit(1);
});

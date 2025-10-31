import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function checkCode() {
  console.log('🔍 남양주 게시판 크롤러 코드 확인\n');

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('id, name, crawler_source_code')
    .ilike('name', '%남양주%')
    .single();

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`게시판: ${data.name}`);
  console.log(`ID: ${data.id}`);

  if (data.crawler_source_code) {
    console.log(`\n✅ crawler_source_code 존재 (${data.crawler_source_code.length} chars)`);
    console.log('\n코드 미리보기 (첫 500자):');
    console.log('─'.repeat(80));
    console.log(data.crawler_source_code.substring(0, 500));
    console.log('─'.repeat(80));

    // AI 관련 키워드 검색
    const hasGemini = data.crawler_source_code.includes('Gemini') || data.crawler_source_code.includes('gemini');
    const hasVision = data.crawler_source_code.includes('Vision') || data.crawler_source_code.includes('vision');
    const hasAI = data.crawler_source_code.includes('AI generated') || data.crawler_source_code.includes('AI minimal');

    console.log('\n📊 코드 분석:');
    console.log(`   Gemini 언급: ${hasGemini ? 'Yes' : 'No'}`);
    console.log(`   Vision API 언급: ${hasVision ? 'Yes' : 'No'}`);
    console.log(`   AI 생성 언급: ${hasAI ? 'Yes' : 'No'}`);

    if (data.crawler_source_code.includes('AI minimal + heuristics')) {
      console.log('\n⚠️  결론: 현재 코드는 **휴리스틱 기반 템플릿**입니다.');
      console.log('   진짜 Gemini Vision API 기반 AI 생성 코드가 아닙니다.');
    }
  } else {
    console.log('\n❌ crawler_source_code가 NULL입니다');
  }
}

checkCode().catch(err => console.error('Error:', err));

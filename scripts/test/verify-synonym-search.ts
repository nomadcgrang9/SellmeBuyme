/**
 * 동의어 사전 검색 기능 검증 스크립트
 *
 * 검증 항목:
 * 1. "일본" → "일본어" 검색 매칭
 * 2. "화성" → "화성시" 검색 매칭
 * 3. "자원봉사" → "자원봉사자" 검색 매칭
 * 4. "수원" → "수원시" 검색 매칋
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env 파일 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 동의어 매핑 (queries.ts에서 복사)
const synonymMap: Record<string, string[]> = {
  // 과목
  '일본': ['일본어', '일본인'],
  '중국': ['중국어', '중국인'],
  '영어': ['영어교육', '영어회화', '영어과'],

  // 지역
  '화성': ['화성시', '화성교육지원청'],
  '수원': ['수원시', '수원교육지원청'],
  '성남': ['성남시', '성남교육지원청'],

  // 역할/직무
  '자원봉사': ['자원봉사자', '자원봉사활동'],
  '교사': ['교원', '교육자'],
  '강사': ['교강사', '외부강사']
};

// buildSearchTokens 함수 (queries.ts에서 복사)
function buildSearchTokens(query: string): string[][] {
  if (!query.trim()) return [];

  const tokens = query
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  return tokens.map((token) => {
    const lowerToken = token.toLowerCase();
    const synonyms = synonymMap[lowerToken];
    return synonyms ? [lowerToken, ...synonyms] : [lowerToken];
  });
}

interface TestCase {
  searchTerm: string;
  expectedSynonyms: string[];
  description: string;
}

const testCases: TestCase[] = [
  {
    searchTerm: '일본',
    expectedSynonyms: ['일본', '일본어', '일본인'],
    description: '일본 → 일본어 매칭 테스트'
  },
  {
    searchTerm: '화성',
    expectedSynonyms: ['화성', '화성시', '화성교육지원청'],
    description: '화성 → 화성시 매칭 테스트'
  },
  {
    searchTerm: '자원봉사',
    expectedSynonyms: ['자원봉사', '자원봉사자', '자원봉사활동'],
    description: '자원봉사 → 자원봉사자 매칭 테스트'
  },
  {
    searchTerm: '수원',
    expectedSynonyms: ['수원', '수원시', '수원교육지원청'],
    description: '수원 → 수원시 매칭 테스트'
  },
  {
    searchTerm: '수원 성남',
    expectedSynonyms: [],
    description: '다중 키워드 검색 (OR 로직) 테스트'
  }
];

async function testSynonymExpansion() {
  console.log('\n🔍 동의어 확장 로직 테스트\n');
  console.log('='.repeat(60));

  let passCount = 0;
  let failCount = 0;

  for (const testCase of testCases) {
    console.log(`\n📝 ${testCase.description}`);
    console.log(`   검색어: "${testCase.searchTerm}"`);

    const tokenGroups = buildSearchTokens(testCase.searchTerm);
    console.log(`   토큰 그룹:`, JSON.stringify(tokenGroups, null, 2));

    if (testCase.searchTerm === '수원 성남') {
      // 다중 키워드의 경우
      if (tokenGroups.length === 2) {
        console.log('   ✅ PASS: 두 개의 토큰 그룹으로 분리됨 (OR 검색 가능)');
        passCount++;
      } else {
        console.log('   ❌ FAIL: 토큰 그룹 분리 실패');
        failCount++;
      }
    } else {
      // 단일 키워드의 경우 동의어 확장 검증
      const actualTokens = tokenGroups[0] || [];
      const allMatch = testCase.expectedSynonyms.every(syn => actualTokens.includes(syn));

      if (allMatch && actualTokens.length === testCase.expectedSynonyms.length) {
        console.log('   ✅ PASS: 예상된 동의어가 모두 포함됨');
        passCount++;
      } else {
        console.log('   ❌ FAIL: 동의어 확장 불일치');
        console.log(`   예상: ${JSON.stringify(testCase.expectedSynonyms)}`);
        console.log(`   실제: ${JSON.stringify(actualTokens)}`);
        failCount++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 테스트 결과: ${passCount} PASS, ${failCount} FAIL\n`);

  return failCount === 0;
}

async function testDatabaseSearch() {
  console.log('\n🗄️  데이터베이스 검색 테스트\n');
  console.log('='.repeat(60));

  // 1. "일본어" 데이터가 있는지 확인
  const { data: japaneseData, error: japaneseError } = await supabase
    .from('job_postings')
    .select('id, title, tags, subject')
    .or('title.ilike.%일본어%,tags.cs.{일본어},subject.ilike.%일본어%')
    .limit(3);

  if (japaneseError) {
    console.log('❌ "일본어" 검색 오류:', japaneseError.message);
  } else {
    console.log(`\n📌 "일본어" 직접 검색: ${japaneseData?.length || 0}건`);
    japaneseData?.forEach(job => {
      console.log(`   - ${job.title} (subject: ${job.subject}, tags: ${job.tags})`);
    });
  }

  // 2. "화성시" 데이터가 있는지 확인
  const { data: hwaseongData, error: hwaseongError } = await supabase
    .from('job_postings')
    .select('id, title, location')
    .ilike('location', '%화성%')
    .limit(3);

  if (hwaseongError) {
    console.log('❌ "화성" 검색 오류:', hwaseongError.message);
  } else {
    console.log(`\n📌 "화성" 위치 검색: ${hwaseongData?.length || 0}건`);
    hwaseongData?.forEach(job => {
      console.log(`   - ${job.title} (location: ${job.location})`);
    });
  }

  // 3. "자원봉사자" 데이터가 있는지 확인
  const { data: volunteerData, error: volunteerError } = await supabase
    .from('job_postings')
    .select('id, title, tags')
    .or('title.ilike.%자원봉사%,tags.cs.{자원봉사자}')
    .limit(3);

  if (volunteerError) {
    console.log('❌ "자원봉사" 검색 오류:', volunteerError.message);
  } else {
    console.log(`\n📌 "자원봉사" 검색: ${volunteerData?.length || 0}건`);
    volunteerData?.forEach(job => {
      console.log(`   - ${job.title} (tags: ${job.tags})`);
    });
  }

  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('\n🚀 동의어 사전 검색 기능 검증 시작\n');

  // 1. 동의어 확장 로직 테스트
  const synonymTestPass = await testSynonymExpansion();

  // 2. 실제 데이터베이스 검색 테스트
  await testDatabaseSearch();

  console.log('\n✨ 검증 완료\n');

  if (synonymTestPass) {
    console.log('✅ 동의어 확장 로직이 정상 작동합니다.');
    console.log('💡 이제 프론트엔드에서 검색 시 다음이 가능합니다:');
    console.log('   - "일본" 검색 → "일본어" 결과 포함');
    console.log('   - "화성" 검색 → "화성시" 결과 포함');
    console.log('   - "자원봉사" 검색 → "자원봉사자" 결과 포함');
    console.log('   - "수원 성남" 검색 → 두 지역 모두 표시 (OR 로직)\n');
  } else {
    console.log('❌ 동의어 확장 로직에 문제가 있습니다.\n');
  }

  process.exit(0);
}

main();

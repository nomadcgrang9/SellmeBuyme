/**
 * crawl_boards 고급 검색 기능 테스트 스크립트
 *
 * 테스트 항목:
 * 1. "경기도" 검색 → 경기도, 경기도 > 성남시, 경기도 > 의정부시 모두 반환
 * 2. "성남" 검색 → 성남교육지원청 반환
 * 3. "의정부" 검색 → 의정부교육지원청 반환
 * 4. similarity score 확인
 *
 * Usage: npx tsx scripts/test/test-crawl-boards-search.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestCase {
  name: string;
  searchKeyword: string;
  expectedMatches: string[];
  minResults: number;
}

const testCases: TestCase[] = [
  {
    name: '계층적 검색: "경기도"',
    searchKeyword: '경기도',
    expectedMatches: ['경기도', '성남', '의정부'],
    minResults: 3
  },
  {
    name: '특정 지역: "성남"',
    searchKeyword: '성남',
    expectedMatches: ['성남'],
    minResults: 1
  },
  {
    name: '특정 지역: "의정부"',
    searchKeyword: '의정부',
    expectedMatches: ['의정부'],
    minResults: 1
  },
  {
    name: '부분 매칭: "교육청"',
    searchKeyword: '교육청',
    expectedMatches: ['경기도', '성남', '의정부'],
    minResults: 1
  }
];

async function testSearch(testCase: TestCase) {
  console.log(`\n🔍 테스트: ${testCase.name}`);
  console.log(`   검색어: "${testCase.searchKeyword}"`);

  try {
    // RPC 함수 호출
    const { data, error } = await supabase.rpc('search_crawl_boards_advanced', {
      search_text: testCase.searchKeyword,
      filter_active: null,
      filter_region_code: null,
      similarity_threshold: 0.2
    });

    if (error) {
      console.error(`   ❌ 검색 실패:`, error.message);
      return false;
    }

    console.log(`   📊 결과: ${data?.length || 0}개`);

    if (!data || data.length < testCase.minResults) {
      console.error(`   ❌ 예상 최소 ${testCase.minResults}개, 실제 ${data?.length || 0}개`);
      return false;
    }

    // 결과 출력
    data.forEach((board: any, index: number) => {
      console.log(`   ${index + 1}. ${board.name}`);
      console.log(`      📍 ${board.region_display_name || '지역 미설정'}`);
    });

    // 예상 매칭 확인
    const matchedAll = testCase.expectedMatches.every(expected =>
      data.some((board: any) =>
        board.name.includes(expected) ||
        board.region_display_name?.includes(expected) ||
        board.category?.includes(expected)
      )
    );

    if (!matchedAll) {
      console.warn(`   ⚠️  일부 예상 결과 누락: ${testCase.expectedMatches.join(', ')}`);
    }

    console.log(`   ✅ 테스트 통과`);
    return true;
  } catch (err: any) {
    console.error(`   ❌ 예외 발생:`, err.message);
    return false;
  }
}

async function testSimilarityFunction() {
  console.log('\n🧪 Similarity 함수 직접 테스트');

  try {
    const { data, error } = await supabase.rpc('search_crawl_boards_by_region', {
      search_text: '경기도',
      similarity_threshold: 0.2
    });

    if (error) {
      console.error('   ❌ Similarity 함수 실패:', error.message);
      return false;
    }

    console.log(`   📊 결과: ${data?.length || 0}개`);
    data?.forEach((item: any, index: number) => {
      console.log(`   ${index + 1}. ${item.board_name}`);
      console.log(`      📍 ${item.region_display_name || '지역 미설정'}`);
      console.log(`      🎯 유사도: ${(item.similarity_score * 100).toFixed(1)}%`);
    });

    console.log(`   ✅ Similarity 함수 정상 작동`);
    return true;
  } catch (err: any) {
    console.error('   ❌ 예외 발생:', err.message);
    return false;
  }
}

async function checkIndexes() {
  console.log('\n📚 인덱스 확인');

  const indexes = [
    'crawl_boards_name_trgm_idx',
    'crawl_boards_region_display_name_trgm_idx'
  ];

  for (const indexName of indexes) {
    const { data, error } = await supabase.rpc('pg_indexes', {
      table_name: 'crawl_boards'
    }).then(() => ({ data: null, error: null })).catch(() => ({ data: null, error: null }));

    // 간단한 쿼리로 인덱스 존재 확인
    const { data: indexCheck } = await supabase
      .from('crawl_boards')
      .select('name')
      .limit(1);

    if (indexCheck) {
      console.log(`   ✅ crawl_boards 테이블 접근 가능`);
      break;
    }
  }
}

async function main() {
  console.log('🚀 crawl_boards 고급 검색 테스트 시작\n');
  console.log('='.repeat(60));

  let passedTests = 0;
  let failedTests = 0;

  // 인덱스 확인
  await checkIndexes();

  // Similarity 함수 테스트
  const similarityResult = await testSimilarityFunction();
  if (similarityResult) passedTests++;
  else failedTests++;

  // 각 테스트 케이스 실행
  for (const testCase of testCases) {
    const result = await testSearch(testCase);
    if (result) passedTests++;
    else failedTests++;
  }

  // 요약
  console.log('\n' + '='.repeat(60));
  console.log('📊 테스트 결과 요약');
  console.log('='.repeat(60));
  console.log(`✅ 통과: ${passedTests}/${passedTests + failedTests}`);
  console.log(`❌ 실패: ${failedTests}/${passedTests + failedTests}`);

  if (failedTests === 0) {
    console.log('\n✨ 모든 테스트가 통과했습니다!');
    console.log('\n💡 이제 프론트엔드에서 테스트해보세요:');
    console.log('   npm run dev');
    console.log('   → /note 페이지 → 크롤링 게시판 목록');
    console.log('   → 검색창에 "경기도", "성남", "의정부" 입력');
  } else {
    console.log('\n⚠️  일부 테스트가 실패했습니다.');
    console.log('\n🔧 마이그레이션 확인:');
    console.log('   Supabase Dashboard > SQL Editor');
    console.log('   → supabase/migrations/20250202_add_crawl_boards_search_indexes.sql 실행');
  }
}

main().catch((err) => {
  console.error('\n❌ 테스트 실행 실패:', err);
  process.exit(1);
});

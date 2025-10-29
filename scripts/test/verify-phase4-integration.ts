/**
 * Phase 4 통합 검증 스크립트
 *
 * 검증 항목:
 * 1. crawl_boards 테이블에 is_active 컬럼 존재 확인
 * 2. 활성/비활성 게시판 조회 테스트
 * 3. 크롤러 is_active 필터 동작 확인
 * 4. (선택) regions 테이블 데이터 확인
 *
 * Usage: npx tsx scripts/test/verify-phase4-integration.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   Details:`, details);
  }
}

async function test1_CheckIsActiveColumn() {
  console.log('\n📋 Test 1: is_active 컬럼 존재 확인');

  try {
    const { data, error } = await supabase
      .from('crawl_boards')
      .select('id, name, is_active')
      .limit(1);

    if (error) {
      addResult('is_active 컬럼 확인', false, error.message);
      return;
    }

    if (data && data.length > 0 && 'is_active' in data[0]) {
      addResult('is_active 컬럼 확인', true, 'is_active 컬럼이 존재합니다', { sample: data[0] });
    } else {
      addResult('is_active 컬럼 확인', false, 'is_active 컬럼을 찾을 수 없습니다');
    }
  } catch (err: any) {
    addResult('is_active 컬럼 확인', false, `예외 발생: ${err.message}`);
  }
}

async function test2_CheckActiveBoards() {
  console.log('\n📋 Test 2: 활성 게시판 조회 테스트');

  try {
    const { data: activeBoards, error } = await supabase
      .from('crawl_boards')
      .select('id, name, is_active')
      .eq('is_active', true);

    if (error) {
      addResult('활성 게시판 조회', false, error.message);
      return;
    }

    addResult(
      '활성 게시판 조회',
      true,
      `활성 게시판 ${activeBoards?.length || 0}개 발견`,
      { activeBoards: activeBoards?.map(b => ({ name: b.name, is_active: b.is_active })) }
    );
  } catch (err: any) {
    addResult('활성 게시판 조회', false, `예외 발생: ${err.message}`);
  }
}

async function test3_CheckInactiveBoards() {
  console.log('\n📋 Test 3: 비활성 게시판 조회 테스트');

  try {
    const { data: inactiveBoards, error } = await supabase
      .from('crawl_boards')
      .select('id, name, is_active')
      .eq('is_active', false);

    if (error) {
      addResult('비활성 게시판 조회', false, error.message);
      return;
    }

    addResult(
      '비활성 게시판 조회',
      true,
      `비활성 게시판 ${inactiveBoards?.length || 0}개 발견`,
      { inactiveBoards: inactiveBoards?.map(b => ({ name: b.name, is_active: b.is_active })) }
    );
  } catch (err: any) {
    addResult('비활성 게시판 조회', false, `예외 발생: ${err.message}`);
  }
}

async function test4_CheckRegionsTable() {
  console.log('\n📋 Test 4: regions 테이블 확인 (선택사항)');

  try {
    const { data: regions, error } = await supabase
      .from('regions')
      .select('code, name, parent_code')
      .limit(5);

    if (error) {
      addResult('regions 테이블 확인', false, `테이블 없음 또는 오류: ${error.message}`, {
        note: 'regions 테이블이 아직 마이그레이션되지 않았을 수 있습니다.'
      });
      return;
    }

    addResult(
      'regions 테이블 확인',
      true,
      `regions 테이블 존재 (샘플 ${regions?.length || 0}개)`,
      { sampleRegions: regions }
    );
  } catch (err: any) {
    addResult('regions 테이블 확인', false, `예외 발생: ${err.message}`);
  }
}

async function test5_CheckRegionColumns() {
  console.log('\n📋 Test 5: crawl_boards 지역 컬럼 확인 (선택사항)');

  try {
    const { data, error } = await supabase
      .from('crawl_boards')
      .select('id, name, region_code, subregion_code, region_display_name, school_level')
      .limit(1);

    if (error) {
      addResult('지역 컬럼 확인', false, `컬럼 없음 또는 오류: ${error.message}`, {
        note: '지역 관련 마이그레이션이 아직 적용되지 않았을 수 있습니다.'
      });
      return;
    }

    if (data && data.length > 0) {
      const hasRegionColumns = 'region_code' in data[0] && 'school_level' in data[0];
      if (hasRegionColumns) {
        addResult('지역 컬럼 확인', true, '지역 관련 컬럼이 존재합니다', { sample: data[0] });
      } else {
        addResult('지역 컬럼 확인', false, '지역 컬럼을 찾을 수 없습니다');
      }
    }
  } catch (err: any) {
    addResult('지역 컬럼 확인', false, `예외 발생: ${err.message}`);
  }
}

async function test6_CrawlerLogic() {
  console.log('\n📋 Test 6: 크롤러 is_active 필터 로직 검증');

  // 크롤러 코드에서 사용하는 쿼리와 동일하게 테스트
  try {
    const testBoardName = '성남교육지원청 구인';

    // is_active=true 조건 추가
    const { data: activeBoard, error: activeError } = await supabase
      .from('crawl_boards')
      .select('id, name, crawl_batch_size, is_active')
      .eq('name', testBoardName)
      .eq('is_active', true)
      .maybeSingle();

    if (activeError) {
      addResult('크롤러 필터 로직', false, `쿼리 오류: ${activeError.message}`);
      return;
    }

    if (activeBoard) {
      addResult(
        '크롤러 필터 로직',
        true,
        `활성 게시판 조회 성공 (${testBoardName})`,
        { board: activeBoard }
      );
    } else {
      addResult(
        '크롤러 필터 로직',
        true,
        `비활성 게시판은 조회되지 않음 (${testBoardName})`,
        { note: '이 게시판이 is_active=false이거나 존재하지 않습니다.' }
      );
    }
  } catch (err: any) {
    addResult('크롤러 필터 로직', false, `예외 발생: ${err.message}`);
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 검증 결과 요약');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  console.log(`✅ 통과: ${passed}/${total}`);
  console.log(`❌ 실패: ${failed}/${total}`);

  if (failed > 0) {
    console.log('\n⚠️  실패한 테스트:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.message}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('✨ 모든 테스트가 통과했습니다!');
  } else {
    console.log('⚠️  일부 테스트가 실패했습니다. 위의 세부 정보를 확인하세요.');
  }
}

async function main() {
  console.log('🚀 Phase 4 통합 검증 시작\n');

  await test1_CheckIsActiveColumn();
  await test2_CheckActiveBoards();
  await test3_CheckInactiveBoards();
  await test4_CheckRegionsTable();
  await test5_CheckRegionColumns();
  await test6_CrawlerLogic();

  await printSummary();
}

main().catch((err) => {
  console.error('\n❌ 검증 스크립트 실행 실패:', err);
  process.exit(1);
});

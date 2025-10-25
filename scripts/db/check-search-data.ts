import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수 누락: VITE_SUPABASE_URL 또는 VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSearchData() {
  console.log('\n=== 검색 기능 팩트체크 ===\n');

  // 1. job_postings 샘플 데이터 조회
  console.log('1. job_postings 테이블 샘플 데이터 (10건):');
  const { data: jobs, error: jobError } = await supabase
    .from('job_postings')
    .select('id, title, organization, location, tags, subject, search_vector')
    .limit(10);

  if (jobError) {
    console.error('❌ 공고 조회 실패:', jobError.message);
  } else {
    console.table(jobs?.map(j => ({
      title: j.title?.substring(0, 30),
      organization: j.organization?.substring(0, 20),
      location: j.location,
      subject: j.subject,
      tags: j.tags?.join(', '),
      has_search_vector: !!j.search_vector
    })));
  }

  // 2. '수원' 검색 테스트
  console.log('\n2. "수원" 검색 결과:');
  const { data: suwonResults, error: suwonError } = await supabase
    .from('job_postings')
    .select('id, title, location')
    .ilike('location', '%수원%')
    .limit(5);

  if (suwonError) {
    console.error('❌ 수원 검색 실패:', suwonError.message);
  } else {
    console.log(`✅ 검색 결과: ${suwonResults?.length}건`);
    console.table(suwonResults?.map(j => ({
      title: j.title?.substring(0, 40),
      location: j.location
    })));
  }

  // 3. '일본어' 검색 테스트
  console.log('\n3. "일본어" 검색 결과:');
  const { data: japanResults1, error: japanError1 } = await supabase
    .from('job_postings')
    .select('id, title, tags, subject')
    .or('title.ilike.%일본어%,tags.cs.{일본어},subject.ilike.%일본어%')
    .limit(5);

  if (japanError1) {
    console.error('❌ 일본어 검색 실패:', japanError1.message);
  } else {
    console.log(`✅ "일본어" 검색 결과: ${japanResults1?.length}건`);
    console.table(japanResults1?.map(j => ({
      title: j.title?.substring(0, 40),
      subject: j.subject,
      tags: j.tags?.join(', ')
    })));
  }

  // 4. '일본' 검색 테스트
  console.log('\n4. "일본" 검색 결과:');
  const { data: japanResults2, error: japanError2 } = await supabase
    .from('job_postings')
    .select('id, title, tags, subject')
    .or('title.ilike.%일본%,tags.cs.{일본},subject.ilike.%일본%')
    .limit(5);

  if (japanError2) {
    console.error('❌ 일본 검색 실패:', japanError2.message);
  } else {
    console.log(`✅ "일본" 검색 결과: ${japanResults2?.length}건`);
    console.table(japanResults2?.map(j => ({
      title: j.title?.substring(0, 40),
      subject: j.subject,
      tags: j.tags?.join(', ')
    })));
  }

  // 5. 지역 필드 일관성 검사
  console.log('\n5. 지역 필드 일관성 검사:');
  const { data: locations, error: locError } = await supabase
    .from('job_postings')
    .select('location')
    .not('location', 'is', null)
    .limit(50);

  if (locError) {
    console.error('❌ 지역 조회 실패:', locError.message);
  } else {
    const locationSet = new Set<string>();
    locations?.forEach(j => {
      if (j.location) locationSet.add(j.location);
    });

    console.log(`총 ${locationSet.size}개의 고유 지역명 발견:`);
    const sortedLocations = Array.from(locationSet).sort();
    sortedLocations.slice(0, 20).forEach(loc => {
      const hasSi = loc.includes('시');
      const hasGun = loc.includes('군');
      const hasGu = loc.includes('구');
      console.log(`  - ${loc} ${hasSi ? '(시 포함)' : ''} ${hasGun ? '(군 포함)' : ''} ${hasGu ? '(구 포함)' : ''}`);
    });
  }

  // 6. FTS 설정 확인
  console.log('\n6. Full-Text Search 설정 확인:');
  const { data: ftsCheck, error: ftsError } = await supabase
    .from('job_postings')
    .select('search_vector')
    .not('search_vector', 'is', null)
    .limit(1);

  if (ftsError) {
    console.error('❌ FTS 확인 실패:', ftsError.message);
  } else {
    if (ftsCheck && ftsCheck.length > 0) {
      console.log('✅ search_vector 컬럼이 존재하고 데이터가 채워져 있습니다');
    } else {
      console.log('⚠️  search_vector 컬럼은 존재하지만 데이터가 비어있습니다');
    }
  }

  console.log('\n=== 팩트체크 완료 ===\n');
}

checkSearchData().catch(console.error);

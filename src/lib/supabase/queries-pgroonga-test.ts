/**
 * PGroonga 검색 테스트 함수
 *
 * 이 파일은 PGroonga가 제대로 작동하는지 테스트하기 위한 간단한 함수입니다.
 */

import { supabase } from './client';

/**
 * PGroonga를 사용한 검색 테스트
 */
export async function testPGroongaSearch(searchText: string) {
  console.log(`🔍 PGroonga 검색 테스트: "${searchText}"`);

  try {
    // Migration에서 만든 search_jobs_pgroonga RPC 함수 호출
    const { data, error } = await supabase
      .rpc('search_jobs_pgroonga', { search_text: searchText });

    if (error) {
      console.error('❌ PGroonga 검색 실패:', error);
      return { success: false, error };
    }

    console.log(`✅ PGroonga 검색 성공: ${data?.length || 0}건`);
    console.log('결과:', data?.slice(0, 3).map((job: any) => ({
      title: job.title,
      location: job.location,
      subject: job.subject
    })));

    return { success: true, data };
  } catch (err) {
    console.error('❌ PGroonga 검색 예외:', err);
    return { success: false, error: err };
  }
}

/**
 * PGroonga vs 기존 검색 비교
 */
export async function comparePGroongaSearch(searchText: string) {
  console.log('\n📊 PGroonga vs 기존 검색 비교\n');

  // 1. PGroonga 검색
  const pgroongaResult = await testPGroongaSearch(searchText);

  // 2. 기존 ilike 검색
  const { data: ilikeData, error: ilikeError } = await supabase
    .from('job_postings')
    .select('title, location, subject')
    .or(`title.ilike.%${searchText}%,location.ilike.%${searchText}%,subject.ilike.%${searchText}%`)
    .limit(10);

  console.log(`\n기존 ilike 검색: ${ilikeData?.length || 0}건`);

  return {
    pgroonga: pgroongaResult,
    ilike: { data: ilikeData, error: ilikeError }
  };
}

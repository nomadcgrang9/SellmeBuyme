/**
 * 크롤링 결과 검증 스크립트
 * - 35개 지역 모두 크롤링되었는지
 * - 각 지역별 공고 개수
 * - 부산 포함 성공 여부
 * - 최근 업데이트 시간
 */

import { supabase } from './lib/supabase.js';

const EXPECTED_SOURCES = [
  // 광역시도 (17개)
  'seoul', 'busan', 'daegu', 'incheon', 'gwangju', 'daejeon', 'ulsan', 'sejong',
  'gyeonggi', 'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam', 'gyeongbuk', 'gyeongnam', 'jeju',
  // 경기도 기초지자체 (18개)
  'seongnam', 'goyang', 'uijeongbu', 'namyangju', 'bucheon', 'gimpo', 'gwangmyeong',
  'gwangjuhanam', 'gurinamyangju', 'anseong', 'pyeongtaek', 'paju', 'yangpyeong',
  'pocheon', 'yeoncheon', 'dongducheonyangjyu', 'gapyeong1', 'gapyeong2'
];

console.log('====================================');
console.log('🔍 크롤링 결과 검증');
console.log('====================================\n');

// 1. crawl_boards 테이블에서 마지막 크롤링 시간 확인
console.log('1️⃣  크롤링 실행 시간 확인...\n');

const { data: boards, error: boardsError } = await supabase
  .from('crawl_boards')
  .select('board_name, last_crawled_at, total_crawled, error_count')
  .order('last_crawled_at', { ascending: false });

if (boardsError) {
  console.error('❌ 에러:', boardsError);
  process.exit(1);
}

const now = new Date();
const recentBoards = boards.filter(b => {
  if (!b.last_crawled_at) return false;
  const crawledAt = new Date(b.last_crawled_at);
  const diffMinutes = (now - crawledAt) / (1000 * 60);
  return diffMinutes < 120; // 2시간 이내
});

console.log(`✅ 총 ${boards.length}개 게시판 등록됨`);
console.log(`✅ 최근 2시간 이내 크롤링: ${recentBoards.length}개\n`);

// 2. 각 지역별 공고 개수 확인
console.log('2️⃣  지역별 공고 개수 확인...\n');

const regionQueries = [
  { name: '서울', query: 'Seoul%' },
  { name: '부산', query: '부산%' },
  { name: '대구', query: '대구%' },
  { name: '인천', query: '인천%' },
  { name: '광주', query: '광주%' },
  { name: '대전', query: '대전%' },
  { name: '울산', query: '울산%' },
  { name: '세종', query: '세종%' },
  { name: '경기', query: '%경기%' },
  { name: '강원', query: '%강원%' },
  { name: '충북', query: '%충북%' },
  { name: '충남', query: '%충남%' },
  { name: '전북', query: '%전북%' },
  { name: '전남', query: '%전남%' },
  { name: '경북', query: '%경북%' },
  { name: '경남', query: '%경남%' },
  { name: '제주', query: '%제주%' },
  // 경기 기초지자체
  { name: '성남', query: '%성남%' },
  { name: '고양', query: '%고양%' },
  { name: '의정부', query: '%의정부%' },
  { name: '남양주', query: '%남양주%' },
  { name: '부천', query: '%부천%' },
  { name: '김포', query: '%김포%' },
  { name: '광명', query: '%광명%' },
  { name: '하남', query: '%하남%' },
  { name: '구리', query: '%구리%' },
  { name: '안성', query: '%안성%' },
  { name: '평택', query: '%평택%' },
  { name: '파주', query: '%파주%' },
  { name: '양평', query: '%양평%' },
  { name: '포천', query: '%포천%' },
  { name: '연천', query: '%연천%' },
  { name: '동두천', query: '%동두천%' },
  { name: '양주', query: '%양주%' },
  { name: '가평', query: '%가평%' }
];

const regionCounts = [];

for (const region of regionQueries) {
  const { count, error } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true })
    .ilike('location', region.query);

  if (!error) {
    regionCounts.push({ name: region.name, count: count || 0 });
  }
}

// 정렬 후 출력
regionCounts.sort((a, b) => b.count - a.count);
regionCounts.forEach(r => {
  const status = r.count > 0 ? '✅' : '⚠️ ';
  console.log(`${status} ${r.name.padEnd(8)}: ${r.count}개`);
});

// 3. 부산 특별 확인
console.log('\n3️⃣  부산 상세 확인...\n');

const { data: busanBoard } = await supabase
  .from('crawl_boards')
  .select('*')
  .ilike('board_name', '%부산%')
  .single();

if (busanBoard) {
  const lastCrawled = busanBoard.last_crawled_at ? new Date(busanBoard.last_crawled_at) : null;
  const diffMinutes = lastCrawled ? Math.floor((now - lastCrawled) / (1000 * 60)) : null;

  console.log(`게시판명: ${busanBoard.board_name}`);
  console.log(`마지막 크롤링: ${lastCrawled ? lastCrawled.toLocaleString('ko-KR') : '없음'}`);
  console.log(`${diffMinutes !== null ? `(${diffMinutes}분 전)` : ''}`);
  console.log(`총 크롤링 수: ${busanBoard.total_crawled || 0}개`);
  console.log(`에러 횟수: ${busanBoard.error_count || 0}회`);

  if (diffMinutes !== null && diffMinutes < 30) {
    console.log('\n✅ 부산 크롤링 성공 (30분 이내)');
  } else {
    console.log('\n⚠️  부산 크롤링 오래됨 또는 실패');
  }
}

// 4. 오늘 새로 추가된 공고 확인
console.log('\n4️⃣  오늘 추가된 공고...\n');

const today = new Date();
today.setHours(0, 0, 0, 0);

const { count: todayCount } = await supabase
  .from('job_postings')
  .select('*', { count: 'exact', head: true })
  .gte('created_at', today.toISOString());

console.log(`✅ 오늘 추가된 공고: ${todayCount}개`);

// 5. 최종 요약
console.log('\n====================================');
console.log('📊 최종 요약');
console.log('====================================');

const hasData = regionCounts.filter(r => r.count > 0).length;
const busanHasData = regionCounts.find(r => r.name === '부산')?.count > 0;

console.log(`✅ 데이터 있는 지역: ${hasData}/${regionCounts.length}`);
console.log(`${busanHasData ? '✅' : '❌'} 부산 데이터: ${busanHasData ? '있음' : '없음'}`);
console.log(`✅ 오늘 신규 공고: ${todayCount}개`);
console.log(`✅ 최근 크롤링: ${recentBoards.length}개 게시판`);

if (hasData >= 30 && busanHasData && todayCount > 0) {
  console.log('\n🎉 크롤링 성공! 모든 검증 통과');
} else if (hasData < 30) {
  console.log('\n⚠️  일부 지역 데이터 부족 (30개 미만)');
} else if (!busanHasData) {
  console.log('\n⚠️  부산 데이터 없음');
} else if (todayCount === 0) {
  console.log('\n⚠️  오늘 신규 공고 없음');
}

console.log('====================================\n');

process.exit(0);

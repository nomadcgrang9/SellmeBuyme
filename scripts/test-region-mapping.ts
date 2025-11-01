import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 크롤러와 동일한 매핑 테이블 (검증용)
const EDUCATION_OFFICE_REGIONS: Record<string, string> = {
  'goegp.kr': '가평군',           // 가평교육지원청
  'goegn.kr': '구리남양주',       // 구리남양주교육지원청
  'goeujb.kr': '의정부',          // 의정부교육지원청
  '222.120.4.134': '의정부',      // 의정부교육지원청 (IP)
  'goesn.kr': '성남',             // 성남교육지원청
  'goesw.kr': '수원',             // 수원교육지원청
  'goeyjp.kr': '양평',            // 양평교육지원청
};

function getRegionFromUrl(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname;

    for (const [domain, region] of Object.entries(EDUCATION_OFFICE_REGIONS)) {
      if (hostname.includes(domain)) {
        return region;
      }
    }

    return null;
  } catch (error) {
    console.error('URL 파싱 실패:', error);
    return null;
  }
}

async function testRegionMapping() {
  console.log('\n🧪 지역 매핑 로직 테스트\n');

  try {
    // 1. crawl_boards에서 가평교육지원청 설정 확인
    console.log('📋 1. 가평교육지원청 크롤러 설정 확인\n');

    const { data: board, error: boardError } = await supabase
      .from('crawl_boards')
      .select('*')
      .ilike('name', '%가평%')
      .single();

    if (boardError || !board) {
      console.error('❌ 가평교육지원청 설정을 찾을 수 없습니다:', boardError?.message);
      return;
    }

    console.log(`✅ 발견: ${board.name}`);
    console.log(`   URL: ${board.board_url}`);

    // 2. URL에서 지역 추출 테스트
    console.log('\n🔍 2. URL 기반 지역 매핑 테스트\n');

    const detectedRegion = getRegionFromUrl(board.board_url);
    console.log(`   입력 URL: ${board.board_url}`);
    console.log(`   감지된 지역: ${detectedRegion || '없음'}`);

    if (detectedRegion === '가평군') {
      console.log('   ✅ 올바른 지역이 감지되었습니다!\n');
    } else {
      console.log(`   ❌ 예상: "가평군", 실제: "${detectedRegion}"\n`);
    }

    // 3. 실제 DB에 저장된 가평 공고 확인
    console.log('📄 3. 현재 DB에 저장된 가평 관련 공고\n');

    const { data: jobs, error: jobsError } = await supabase
      .from('job_postings')
      .select('id, organization, title, location, source_url')
      .or('organization.ilike.%가평%,source_url.ilike.%goegp%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('❌ 공고 조회 실패:', jobsError.message);
      return;
    }

    if (!jobs || jobs.length === 0) {
      console.log('⚠️  가평 관련 공고가 없습니다.\n');
    } else {
      console.log(`✅ 발견된 공고: ${jobs.length}개\n`);
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.organization}`);
        console.log(`   - 제목: ${job.title}`);
        console.log(`   - 현재 지역: ${job.location || '없음'}`);
        console.log(`   - 출처: ${job.source_url}`);

        // URL에서 올바른 지역 추출 시뮬레이션
        if (job.source_url) {
          const correctRegion = getRegionFromUrl(job.source_url);
          if (correctRegion && correctRegion !== job.location) {
            console.log(`   - 수정될 지역: ${correctRegion} ⚠️`);
          }
        }
        console.log();
      });
    }

    // 4. 잘못된 지역 매핑 통계
    console.log('📊 4. 지역 매핑 오류 통계\n');

    const { data: wrongLocationJobs, error: wrongError } = await supabase
      .from('job_postings')
      .select('id, organization, location, source_url')
      .ilike('source_url', '%goegp%')
      .neq('location', '가평군');

    if (wrongError) {
      console.error('❌ 오류 통계 조회 실패:', wrongError.message);
    } else if (wrongLocationJobs && wrongLocationJobs.length > 0) {
      console.log(`⚠️  잘못된 지역으로 저장된 가평 공고: ${wrongLocationJobs.length}개`);
      console.log('   → 이 공고들은 다음 크롤링에서 자동으로 수정됩니다.\n');
    } else {
      console.log('✅ 모든 가평 공고의 지역이 올바르게 설정되어 있습니다.\n');
    }

    // 5. 다른 교육지원청 URL 테스트
    console.log('🌐 5. 다른 교육지원청 URL 매핑 테스트\n');

    const testUrls = [
      'https://goegp.kr/weben/jobOpenInfo/jobPbancList.do?key=7088',  // 가평
      'https://goegn.kr/weben/jobOpenInfo/jobPbancList.do',           // 구리남양주
      'https://goeujb.kr/weben/jobOpenInfo/jobPbancList.do',          // 의정부
      'https://goesn.kr/weben/jobOpenInfo/jobPbancList.do',           // 성남
    ];

    testUrls.forEach(url => {
      const region = getRegionFromUrl(url);
      console.log(`   ${url}`);
      console.log(`   → ${region || '매핑 없음'}\n`);
    });

  } catch (error) {
    console.error('❌ 테스트 실패:', error);
  }
}

testRegionMapping().then(() => {
  console.log('✅ 테스트 완료\n');
  console.log('💡 다음 단계:');
  console.log('   1. 크롤러를 다시 실행하여 가평 공고를 재수집합니다.');
  console.log('   2. source_url이 같으면 기존 레코드가 업데이트됩니다.');
  console.log('   3. location 필드가 "가평군"으로 수정될 것입니다.\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

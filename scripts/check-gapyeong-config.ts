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

async function checkGapyeongConfig() {
  console.log('\n🔍 가평교육지원청 설정 확인 중...\n');

  try {
    // crawl_boards 테이블에서 가평 관련 설정 조회
    const { data: boards, error } = await supabase
      .from('crawl_boards')
      .select('*')
      .or('name.ilike.%가평%,board_url.ilike.%gapyeong%,board_url.ilike.%gp.goe%');

    if (error) {
      console.error('❌ 조회 실패:', error.message);
      return;
    }

    if (!boards || boards.length === 0) {
      console.log('⚠️  가평교육지원청 설정을 찾을 수 없습니다.');
      console.log('\n📋 모든 경기도 크롤러 설정 조회 중...\n');

      // 경기도 관련 모든 설정 조회
      const { data: gyeonggiBoards, error: gyeonggiError } = await supabase
        .from('crawl_boards')
        .select('*')
        .or('name.ilike.%경기%,board_url.ilike.%goe.go.kr%');

      if (gyeonggiError) {
        console.error('❌ 경기도 설정 조회 실패:', gyeonggiError.message);
        return;
      }

      console.log(`✅ 발견된 경기도 크롤러: ${gyeonggiBoards?.length}개\n`);
      gyeonggiBoards?.forEach((board, index) => {
        console.log(`${index + 1}. ${board.name}`);
        console.log(`   - ID: ${board.id}`);
        console.log(`   - URL: ${board.board_url}`);
        console.log(`   - Category: ${board.category || '미지정'}`);
        console.log(`   - Config:`, JSON.stringify(board.crawl_config, null, 2));
        console.log(`   - 마지막 크롤링: ${board.last_crawled_at || '없음'}\n`);
      });
    } else {
      console.log(`✅ 가평교육지원청 설정 발견: ${boards.length}개\n`);
      boards.forEach((board, index) => {
        console.log(`${index + 1}. ${board.name}`);
        console.log(`   - ID: ${board.id}`);
        console.log(`   - URL: ${board.board_url}`);
        console.log(`   - Category: ${board.category || '미지정'}`);
        console.log(`   - Config:`, JSON.stringify(board.crawl_config, null, 2));
        console.log(`   - 마지막 크롤링: ${board.last_crawled_at || '없음'}\n`);
      });
    }

    // 최근 크롤링된 가평 관련 공고 조회
    console.log('\n📄 최근 가평 관련 공고 조회 중...\n');

    const { data: jobs, error: jobsError } = await supabase
      .from('job_postings')
      .select('id, organization, title, location, created_at, source_url')
      .or('organization.ilike.%가평%,location.ilike.%가평%,title.ilike.%가평%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error('❌ 공고 조회 실패:', jobsError.message);
    } else if (!jobs || jobs.length === 0) {
      console.log('⚠️  가평 관련 공고가 없습니다.');
    } else {
      console.log(`✅ 가평 관련 공고: ${jobs.length}개\n`);
      jobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.organization} - ${job.title}`);
        console.log(`   - 지역: ${job.location || '미지정'}`);
        console.log(`   - 등록일: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
        console.log(`   - 출처: ${job.source_url || '미지정'}\n`);
      });
    }

    // "구리남양주"가 표시된 공고 조회
    console.log('\n🔍 "구리남양주"로 표시된 최근 공고 조회 중...\n');

    const { data: guriJobs, error: guriError } = await supabase
      .from('job_postings')
      .select('id, organization, title, location, tags, created_at')
      .contains('tags', ['구리남양주'])
      .order('created_at', { ascending: false })
      .limit(5);

    if (guriError) {
      console.error('❌ 조회 실패:', guriError.message);
    } else if (!guriJobs || guriJobs.length === 0) {
      console.log('⚠️  "구리남양주" 태그를 가진 공고가 없습니다.');
    } else {
      console.log(`✅ "구리남양주" 태그 공고: ${guriJobs.length}개\n`);
      guriJobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.organization} - ${job.title}`);
        console.log(`   - 지역: ${job.location || '미지정'}`);
        console.log(`   - 태그: ${job.tags?.join(', ') || '없음'}`);
        console.log(`   - 등록일: ${new Date(job.created_at).toLocaleString('ko-KR')}\n`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkGapyeongConfig().then(() => {
  console.log('✅ 확인 완료\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

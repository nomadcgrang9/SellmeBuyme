import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl);
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '설정됨' : '없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExperiences() {
  console.log('\n📊 체험 테이블 데이터 확인 중...\n');

  try {
    // 1. 전체 체험 수 확인
    const { count: totalCount, error: countError } = await supabase
      .from('experiences')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ 카운트 조회 실패:', countError.message);
      return;
    }

    console.log(`✅ 전체 체험 수: ${totalCount}개\n`);

    // 2. 최근 5개 체험 조회
    const { data: recentExperiences, error: selectError } = await supabase
      .from('experiences')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (selectError) {
      console.error('❌ 체험 조회 실패:', selectError.message);
      return;
    }

    if (!recentExperiences || recentExperiences.length === 0) {
      console.log('⚠️  등록된 체험이 없습니다.');
      return;
    }

    console.log('📋 최근 등록된 체험 목록:\n');
    recentExperiences.forEach((exp, index) => {
      console.log(`${index + 1}. ${exp.program_title}`);
      console.log(`   - ID: ${exp.id}`);
      console.log(`   - 카테고리: ${exp.categories?.join(', ') || '없음'}`);
      console.log(`   - 대상 학교급: ${exp.target_school_levels?.join(', ') || '없음'}`);
      console.log(`   - 지역(서울): ${exp.region_seoul?.join(', ') || '없음'}`);
      console.log(`   - 지역(경기): ${exp.region_gyeonggi?.join(', ') || '없음'}`);
      console.log(`   - 운영방식: ${exp.operation_types?.join(', ') || '없음'}`);
      console.log(`   - 연락처: ${exp.contact_phone} / ${exp.contact_email}`);
      console.log(`   - 등록일: ${new Date(exp.created_at).toLocaleString('ko-KR')}`);
      console.log(`   - 상태: ${exp.status}\n`);
    });

    // 3. Status별 통계
    const { data: statusStats, error: statsError } = await supabase
      .from('experiences')
      .select('status');

    if (!statsError && statusStats) {
      const activeCount = statusStats.filter(s => s.status === 'active').length;
      const inactiveCount = statusStats.filter(s => s.status !== 'active').length;
      console.log(`📈 상태 통계:`);
      console.log(`   - Active: ${activeCount}개`);
      console.log(`   - Inactive: ${inactiveCount}개\n`);
    }

    // 4. viewType='experience' 검색 테스트
    console.log('🔍 검색 기능 테스트 (viewType=experience):\n');

    const { data: searchResult, error: searchError, count: searchCount } = await supabase
      .from('experiences')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .limit(3);

    if (searchError) {
      console.error('❌ 검색 테스트 실패:', searchError.message);
    } else {
      console.log(`✅ 검색 결과: ${searchCount}개 체험 발견`);
      if (searchResult && searchResult.length > 0) {
        console.log(`   첫 번째 결과: "${searchResult[0].program_title}"\n`);
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkExperiences().then(() => {
  console.log('✅ 체험 데이터 확인 완료\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

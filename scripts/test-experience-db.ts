import { createClient } from '@supabase/supabase-js';

// Supabase 설정
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testExperienceDB() {
  console.log('🔍 체험 데이터베이스 테스트 시작...\n');

  try {
    // 1. 테이블 존재 확인
    console.log('1️⃣  experiences 테이블 확인...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('experiences')
      .select('count', { count: 'exact', head: true });

    if (tableError) {
      console.error('❌ 테이블 조회 실패:', tableError.message);
      console.log('💡 Supabase 대시보드에서 SQL 에디터로 다음을 실행하세요:');
      console.log('   supabase/migrations/20251031_experiences_schema.sql 파일의 내용을 복사해서 실행');
      process.exit(1);
    }

    console.log('✅ experiences 테이블 존재함\n');

    // 2. 현재 사용자 확인
    console.log('2️⃣  현재 로그인 사용자 확인...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('❌ 로그인 필요:', authError?.message || '사용자 없음');
      process.exit(1);
    }

    console.log('✅ 로그인됨:', user.email, `(ID: ${user.id})\n`);

    // 3. 테스트 데이터 삽입
    console.log('3️⃣  테스트 체험 데이터 삽입...');
    const testData = {
      user_id: user.id,
      program_title: '테스트 코딩 로봇 체험',
      categories: ['과학', '기술'],
      target_school_levels: ['초등학교', '중학교'],
      region_seoul: ['강남구', '서초구'],
      region_gyeonggi: [],
      operation_types: ['방문형'],
      capacity: '20~30명',
      introduction: '이것은 테스트 체험 프로그램입니다. 코딩 로봇을 통해 기초 프로그래밍을 배웁니다.',
      contact_phone: '010-1234-5678',
      contact_email: 'test@example.com',
      form_payload: {
        programTitle: '테스트 코딩 로봇 체험',
        category: ['과학', '기술'],
        targetSchoolLevel: ['초등학교', '중학교'],
        location: { seoul: ['강남구', '서초구'], gyeonggi: [] },
        operationType: ['방문형'],
        capacity: '20~30명',
        introduction: '이것은 테스트 체험 프로그램입니다. 코딩 로봇을 통해 기초 프로그래밍을 배웁니다.',
        phone: '010-1234-5678',
        email: 'test@example.com'
      }
    };

    const { data: inserted, error: insertError } = await supabase
      .from('experiences')
      .insert(testData)
      .select('*')
      .single();

    if (insertError) {
      console.error('❌ 삽입 실패:', insertError.message);
      console.error('   상세:', insertError.details);
      process.exit(1);
    }

    console.log('✅ 테스트 데이터 삽입 성공');
    console.log('   ID:', inserted.id);
    console.log('   제목:', inserted.program_title, '\n');

    // 4. 삽입된 데이터 조회
    console.log('4️⃣  삽입된 데이터 조회...');
    const { data: retrieved, error: retrieveError } = await supabase
      .from('experiences')
      .select('*')
      .eq('id', inserted.id)
      .single();

    if (retrieveError) {
      console.error('❌ 조회 실패:', retrieveError.message);
      process.exit(1);
    }

    console.log('✅ 데이터 조회 성공:');
    console.log(JSON.stringify(retrieved, null, 2), '\n');

    // 5. 모든 체험 데이터 조회
    console.log('5️⃣  모든 체험 데이터 조회...');
    const { data: allExperiences, error: allError } = await supabase
      .from('experiences')
      .select('*')
      .eq('status', 'active');

    if (allError) {
      console.error('❌ 조회 실패:', allError.message);
      process.exit(1);
    }

    console.log(`✅ 총 ${allExperiences.length}개의 활성 체험 데이터 존재\n`);

    console.log('✅ 모든 테스트 완료!\n');
    console.log('📝 다음 단계:');
    console.log('   1. 브라우저에서 http://localhost:5175 접속');
    console.log('   2. "체험 등록" 버튼 클릭');
    console.log('   3. 폼 작성 후 "등록하기" 클릭');
    console.log('   4. 브라우저 콘솔에서 DEBUG 로그 확인');
    console.log('   5. 체험 카드가 화면에 나타나는지 확인');

  } catch (error) {
    console.error('❌ 예상치 못한 오류:', error);
    process.exit(1);
  }
}

testExperienceDB();

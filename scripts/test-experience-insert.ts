import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

// Service Role로 RLS 우회
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testExperienceInsert() {
  console.log('\n📝 CLI로 체험 등록 테스트 시작...\n');

  try {
    // 실제 사용자 ID
    const testUserId = '85823de2-b69b-4829-8e1b-c3764c7d633c';

    // 사용자가 등록한 것과 유사한 테스트 데이터
    const testData = {
      user_id: testUserId,
      program_title: 'CLI 테스트 - 인성교육 프로그램',
      categories: ['인성교육', '체험활동'],
      target_school_levels: ['초등', '중등'],
      region_seoul: [],
      region_gyeonggi: ['수원시'],
      operation_types: ['학교방문', '온라인'],
      capacity: '20명',
      introduction: 'CLI로 직접 삽입한 체험 프로그램입니다.',
      contact_phone: '010-1234-5678',
      contact_email: 'test@example.com',
      form_payload: {
        programTitle: 'CLI 테스트 - 인성교육 프로그램',
        category: ['인성교육', '체험활동'],
        targetSchoolLevel: ['초등', '중등'],
        location: {
          seoul: [],
          gyeonggi: ['수원시']
        },
        introduction: 'CLI로 직접 삽입한 체험 프로그램입니다.',
        operationType: ['학교방문', '온라인'],
        capacity: '20명',
        phone: '010-1234-5678',
        email: 'test@example.com'
      },
      status: 'active'
    };

    console.log('💾 데이터 삽입 중...\n');
    console.log('데이터:', JSON.stringify(testData, null, 2));

    const { data, error } = await supabase
      .from('experiences')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('❌ 삽입 실패:', error.message);
      console.error('상세:', error);
      process.exit(1);
    }

    console.log('\n✅ 체험 등록 성공!');
    console.log('ID:', data.id);
    console.log('제목:', data.program_title);
    console.log('생성일:', data.created_at);

    // 삽입된 데이터 조회
    console.log('\n🔍 삽입된 데이터 조회 중...\n');
    const { data: allExperiences, error: fetchError } = await supabase
      .from('experiences')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ 조회 실패:', fetchError.message);
    } else {
      console.log(`✅ 총 ${allExperiences.length}개의 활성 체험 프로그램:`);
      allExperiences.forEach((exp, idx) => {
        console.log(`${idx + 1}. ${exp.program_title} (ID: ${exp.id.substring(0, 8)}...)`);
      });
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

testExperienceInsert().then(() => {
  console.log('\n✨ 테스트 완료!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

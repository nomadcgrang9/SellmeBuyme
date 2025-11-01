import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env 파일 로드
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '설정됨' : '없음');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '설정됨' : '없음');
  process.exit(1);
}

// Service Role로 RLS 우회
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertTestExperience() {
  console.log('\n📝 테스트 체험 데이터 삽입 중 (관리자 모드)...\n');

  try {
    // 실제 사용자 ID 사용
    const testUserId = '85823de2-b69b-4829-8e1b-c3764c7d633c';

    // 테스트 체험 데이터 3개
    const testExperiences = [
      {
        user_id: testUserId,
        program_title: '코딩로봇 체험교실',
        categories: ['코딩', '로봇', '메이커'],
        target_school_levels: ['초등', '중등'],
        region_seoul: ['강남구', '서초구'],
        region_gyeonggi: [],
        operation_types: ['학교방문', '온라인'],
        capacity: '20~30명',
        introduction: '코딩과 로봇을 활용한 창의적 체험학습 프로그램입니다. 학생들이 직접 로봇을 조립하고 코딩하여 움직이는 과정을 경험합니다.',
        contact_phone: '02-1234-5678',
        contact_email: 'coding@example.com',
        form_payload: {
          programTitle: '코딩로봇 체험교실',
          category: ['코딩', '로봇', '메이커'],
          targetSchoolLevel: ['초등', '중등'],
          location: {
            seoul: ['강남구', '서초구'],
            gyeonggi: []
          },
          introduction: '코딩과 로봇을 활용한 창의적 체험학습 프로그램입니다.',
          operationType: ['학교방문', '온라인'],
          capacity: '20~30명',
          phone: '02-1234-5678',
          email: 'coding@example.com'
        },
        status: 'active'
      },
      {
        user_id: testUserId,
        program_title: '천체관측 과학교실',
        categories: ['과학', '천문'],
        target_school_levels: ['초등', '중등', '고등'],
        region_seoul: [],
        region_gyeonggi: ['수원시', '성남시', '용인시'],
        operation_types: ['학교방문'],
        capacity: '학급 단위 (25~35명)',
        introduction: '이동식 천체망원경을 활용한 천체관측 프로그램입니다. 낮에는 태양 흑점 관측, 밤에는 달과 행성 관측이 가능합니다.',
        contact_phone: '031-9876-5432',
        contact_email: 'star@example.com',
        form_payload: {
          programTitle: '천체관측 과학교실',
          category: ['과학', '천문'],
          targetSchoolLevel: ['초등', '중등', '고등'],
          location: {
            seoul: [],
            gyeonggi: ['수원시', '성남시', '용인시']
          },
          introduction: '이동식 천체망원경을 활용한 천체관측 프로그램입니다.',
          operationType: ['학교방문'],
          capacity: '학급 단위 (25~35명)',
          phone: '031-9876-5432',
          email: 'star@example.com'
        },
        status: 'active'
      },
      {
        user_id: testUserId,
        program_title: '전통문화 체험 한마당',
        categories: ['전통문화', '예술', '체험활동'],
        target_school_levels: ['초등', '중등'],
        region_seoul: ['종로구', '중구', '용산구'],
        region_gyeonggi: ['수원시'],
        operation_types: ['학교방문', '기관방문'],
        capacity: '20~50명',
        introduction: '한복 입기, 전통놀이, 서예 체험 등 다양한 전통문화를 체험할 수 있는 프로그램입니다. 학교 방문 또는 문화센터 방문 가능합니다.',
        contact_phone: '02-5555-1234',
        contact_email: 'tradition@example.com',
        form_payload: {
          programTitle: '전통문화 체험 한마당',
          category: ['전통문화', '예술', '체험활동'],
          targetSchoolLevel: ['초등', '중등'],
          location: {
            seoul: ['종로구', '중구', '용산구'],
            gyeonggi: ['수원시']
          },
          introduction: '한복 입기, 전통놀이, 서예 체험 등 다양한 전통문화를 체험할 수 있는 프로그램입니다.',
          operationType: ['학교방문', '기관방문'],
          capacity: '20~50명',
          phone: '02-5555-1234',
          email: 'tradition@example.com'
        },
        status: 'active'
      }
    ];

    console.log('💾 체험 데이터 삽입 중 (RLS 우회)...\n');

    for (let i = 0; i < testExperiences.length; i++) {
      const exp = testExperiences[i];
      const { data, error } = await supabase
        .from('experiences')
        .insert(exp)
        .select()
        .single();

      if (error) {
        console.error(`❌ ${i + 1}번 체험 삽입 실패:`, error.message);
        console.error('   상세:', error);
      } else {
        console.log(`✅ ${i + 1}. "${exp.program_title}" 삽입 완료 (ID: ${data.id})`);
      }
    }

    console.log('\n🎉 테스트 데이터 삽입 완료!');
    console.log('\n✨ 이제 메인페이지에서 체험 뷰로 전환하면 카드가 보일 것입니다.\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

insertTestExperience().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

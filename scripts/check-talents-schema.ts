import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTalentsSchema() {
  console.log('\n🔍 talents 테이블 스키마 확인 중...\n');

  try {
    // 샘플 데이터 하나 조회
    const { data, error } = await supabase
      .from('talents')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ 조회 실패:', error);
      process.exit(1);
    }

    console.log('✅ talents 테이블 컬럼 목록:\n');

    const columns = Object.keys(data);
    columns.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col}: ${typeof data[col]} = ${JSON.stringify(data[col])}`);
    });

    console.log('\n📋 컬럼 개수:', columns.length);
    console.log('\n컬럼 목록:', columns.join(', '));

    // email 컬럼 있는지 확인
    if (columns.includes('email')) {
      console.log('\n✅ email 컬럼 존재함');
    } else {
      console.log('\n❌ email 컬럼 없음!');
      console.log('   phone, contact_email, contact_phone 같은 대체 컬럼 확인:');
      const contactCols = columns.filter(col =>
        col.includes('email') || col.includes('phone') || col.includes('contact')
      );
      console.log('   발견된 연락처 관련 컬럼:', contactCols.join(', ') || '없음');
    }

    console.log('\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

checkTalentsSchema().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

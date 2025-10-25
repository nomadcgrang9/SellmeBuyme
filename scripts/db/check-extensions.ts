import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수 누락');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExtensions() {
  console.log('\n=== PostgreSQL Extensions 확인 ===\n');

  // 설치된 extensions 조회
  const { data, error } = await supabase
    .rpc('exec_sql', {
      sql: 'SELECT extname, extversion FROM pg_extension ORDER BY extname;'
    })
    .catch(() => ({ data: null, error: 'RPC 함수 없음' }));

  if (error) {
    console.log('⚠️  RPC로 조회 불가 - Supabase Dashboard에서 직접 확인 필요');
    console.log('SQL Editor에서 실행:');
    console.log('  SELECT extname, extversion FROM pg_extension;');
  } else if (data) {
    console.table(data);
  }

  // pg_trgm 함수 테스트
  console.log('\n=== pg_trgm 유사도 테스트 ===\n');

  const { data: similarityTest, error: simError } = await supabase
    .rpc('exec_sql', {
      sql: "SELECT similarity('일본', '일본어') as score;"
    })
    .catch(() => ({ data: null, error: 'pg_trgm 없음' }));

  if (simError) {
    console.log('❌ pg_trgm이 설치되지 않았거나 RPC 함수 없음');
  } else {
    console.log('✅ pg_trgm 작동 중');
    console.log('유사도 점수:', similarityTest);
  }

  console.log('\n=== 완료 ===\n');
}

checkExtensions().catch(console.error);

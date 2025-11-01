import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function getFirstUser() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, created_at')
    .limit(1)
    .single();

  if (error) {
    console.error('❌ 사용자 조회 실패:', error.message);
    process.exit(1);
  }

  console.log('✅ 첫 번째 사용자:');
  console.log('   ID:', data.id);
  console.log('   Email:', data.email);
  console.log('   생성일:', data.created_at);
}

getFirstUser();

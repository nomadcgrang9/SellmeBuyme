import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경변수 없음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkGuriBoard() {
  const { data, error } = await supabase
    .from('crawl_boards')
    .select('id, name, board_url')
    .ilike('name', '%구리%');

  if (error) {
    console.error('❌ 에러:', error);
    return;
  }

  console.log('구리 관련 게시판:');
  console.log(JSON.stringify(data, null, 2));
}

checkGuriBoard();

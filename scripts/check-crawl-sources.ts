import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSources() {
  const { data } = await supabase
    .from('crawl_boards')
    .select('id, board_name');

  console.log('전체 crawl_boards:');
  data?.forEach(row => {
    console.log(`  ${row.id}: ${row.board_name}`);
  });
}

checkSources();

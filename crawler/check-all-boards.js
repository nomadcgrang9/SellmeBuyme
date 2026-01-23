import dotenv from 'dotenv';
import { supabase } from './lib/supabase.js';

dotenv.config();

async function checkAllBoards() {
  const { data: boards, error } = await supabase
    .from('crawl_boards')
    .select('id, name, region, is_active')
    .eq('is_active', true)
    .order('region');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('=== 활성화된 모든 crawl_boards ===\n');

  const grouped = {};
  boards.forEach(board => {
    const region = board.region || '미지정';
    if (!grouped[region]) grouped[region] = [];
    grouped[region].push(board);
  });

  Object.entries(grouped).forEach(([region, regionBoards]) => {
    console.log(`${region}:`);
    regionBoards.forEach(board => {
      console.log(`  - ${board.id}  // ${board.name}`);
    });
    console.log('');
  });

  process.exit(0);
}

checkAllBoards();

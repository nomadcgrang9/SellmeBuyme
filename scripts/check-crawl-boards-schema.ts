// Check current schema of crawl_boards table
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

(async () => {
  console.log('🔍 Checking crawl_boards table schema...\n');

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  if (data && data.length > 0) {
    console.log('📊 Sample record:');
    console.log(JSON.stringify(data[0], null, 2));
    console.log('\n✅ Available columns:', Object.keys(data[0]).join(', '));
  } else {
    console.log('ℹ️  No records found in crawl_boards');
  }
})();

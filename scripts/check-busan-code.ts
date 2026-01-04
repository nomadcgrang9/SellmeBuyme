import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_KEY) {
    console.error('Missing Service Role Key');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const BOARD_ID = '1657c5fd-6b82-40ef-b25d-eaa908e94ac5'; // Busan board ID

async function checkBoard() {
    const { data, error } = await supabase
        .from('crawl_boards')
        .select('name, crawler_source_code')
        .eq('id', BOARD_ID)
        .single();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.crawler_source_code) {
        console.log(`✅ Crawler source code found for ${data.name}`);
        console.log(`   Length: ${data.crawler_source_code.length} chars`);
    } else {
        console.log(`❌ No crawler source code found for ${data.name}`);
    }
}

checkBoard();

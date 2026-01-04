import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from root
const envPath = path.resolve(process.cwd(), '.env');
const result = dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const rawAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

function isValidKey(key?: string) {
    if (!key || key.length < 20) return false;
    // Check for non-ascii characters (which indicate placeholder text like "여기에...")
    if (/[^\x00-\x7F]/.test(key)) return false;
    return true;
}

let SUPABASE_KEY = '';

if (isValidKey(rawServiceKey)) {
    SUPABASE_KEY = rawServiceKey!;
    console.log('✅ Using Service Role Key');
} else if (isValidKey(rawAnonKey)) {
    SUPABASE_KEY = rawAnonKey!;
    console.log('⚠️ Service Role Key appears invalid or contains non-ASCII characters.');
    console.log('   Falling back to VITE_SUPABASE_ANON_KEY.');
} else {
    console.error('❌ No valid Supabase API Key found in .env');
    console.error('   Please check VITE_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_KEY);

async function reCrawlBusan() {
    console.log('🔍 Searching for "Busan" crawl board...');

    const { data: boards, error } = await supabase
        .from('crawl_boards')
        .select('id, name, region_display_name, is_active')
        .or('name.ilike.%부산%,region_display_name.ilike.%부산%');

    if (error) {
        console.error('❌ Error fetching boards:', error);
        // If permission denied (401/403), we really need the service role key.
        if (error.code === '42501' || error.message?.includes('permission')) {
            console.error('\n🚫 Permission Denied. Anon Key cannot list crawl boards.');
            console.error('   Please update .env with a valid SUPABASE_SERVICE_ROLE_KEY.');
        }
        return;
    }

    if (!boards || boards.length === 0) {
        console.log('❌ No boards found for "Busan" (부산).');
        return;
    }

    console.log(`✅ Found ${boards.length} board(s):`);
    boards.forEach(b => console.log(`   - [${b.name}] (ID: ${b.id}) Active: ${b.is_active}`));

    // Trigger crawl for each board
    for (const board of boards) {
        console.log(`\n🚀 Triggering crawl for: ${board.name} (${board.id})...`);

        const { data: runData, error: runError } = await supabase.functions.invoke('admin-crawl-run', {
            body: {
                boardId: board.id,
                mode: 'run'
            }
        });

        if (runError) {
            console.error(`❌ Failed to trigger crawl for ${board.name}:`, runError);
        } else {
            console.log(`✅ Crawl Triggered! Run ID:`, runData?.logId);
        }
    }
}

reCrawlBusan().catch(console.error);

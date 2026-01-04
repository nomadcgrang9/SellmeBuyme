import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function list() {
    const { data, error } = await supabase
        .from('crawl_boards')
        .select('id, name, region_display_name, region_code')
        .order('name');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('=== Crawl Boards (Admin) ===');
    data?.forEach(board => {
        console.group(`[${board.name}]`);
        console.log(`ID: ${board.id}`);
        console.log(`Region: ${board.region_display_name} (${board.region_code})`);
        console.groupEnd();
    });
}

list();

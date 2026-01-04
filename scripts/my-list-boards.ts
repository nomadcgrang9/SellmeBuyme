import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://qpwnsvsiduvvqdijyxio.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

async function list() {
    const { data, error } = await supabase
        .from('crawl_boards')
        .select('id, name, region_display_name, is_active')
        .order('name');

    if (error) {
        console.error('Error fetching boards:', error);
        return;
    }

    console.log('=== Active Boards ===');
    data?.forEach(board => {
        console.log(`[${board.name}] (Region: ${board.region_display_name || 'N/A'}) - Active: ${board.is_active}`);
        console.log(`  ID: ${board.id}`);
    });
}

list();

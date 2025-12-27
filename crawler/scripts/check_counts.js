import { supabase } from '../lib/supabase.js';

async function countJobs() {
    console.log("📊 Checking Data Counts...");

    // Get board IDs for the 4 regions
    const targetRegions = ['부산', '대구', '인천', '광주']; // Region keyword to search
    const { data: boards, error: boardError } = await supabase
        .from('crawl_boards')
        .select('id, name, region')
        .in('region', targetRegions);

    if (boardError) {
        console.error("Error fetching boards:", boardError);
        return;
    }

    // console.log("Found Boards:", boards);

    for (const board of boards) {
        // Count jobs for each board
        const { count, error: countError } = await supabase
            .from('job_postings')
            .select('*', { count: 'exact', head: true })
            .eq('crawl_board_id', board.id);

        if (countError) {
            console.error(`Error counting for ${board.name}:`, countError);
        } else {
            console.log(`[${board.region}] ${board.name} (ID: ${board.id}): ${count} items`);
        }
    }

    // Broad search debugging
    console.log("\n🕵️ Broad Search for '인천':");
    const { count: broadCount } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .ilike('location', '%인천%');
    console.log(`Jobs with location '인천': ${broadCount}`);

    // Check by source_url pattern
    const { count: urlCount } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .ilike('source_url', '%ice.go.kr%');
    console.log(`Jobs with URL 'ice.go.kr': ${urlCount}`);

    // Check Gwangju
    const { count: gwangjuUrlCount } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .ilike('source_url', '%gen.go.kr%');
    console.log(`Jobs with URL 'gen.go.kr': ${gwangjuUrlCount}`);
}

countJobs();

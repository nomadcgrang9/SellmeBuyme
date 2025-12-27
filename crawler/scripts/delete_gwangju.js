import { supabase } from '../lib/supabase.js';

async function deleteGwangjuJobs() {
    console.log("🗑️ Deleting Gwangju Job Postings...");

    // 1. Find Gwangju Board ID
    const { data: board } = await supabase
        .from('crawl_boards')
        .select('id')
        .eq('region', '광주')
        .single();

    if (!board) {
        console.error("Gwangju board not found.");
        return;
    }

    // 2. Delete Jobs
    const { error, count } = await supabase
        .from('job_postings')
        .delete({ count: 'exact' })
        .eq('crawl_board_id', board.id);

    if (error) {
        console.error("Error deleting jobs:", error);
        return;
    }

    console.log(`✅ Deleted ${count} jobs for Gwangju.`);
}

deleteGwangjuJobs();

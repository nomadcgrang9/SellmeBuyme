import { supabase } from '../lib/supabase.js';

async function listGwangjuJobs() {
    console.log("🔍 Fetching Gwangju Job Details...");

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

    // 2. Fetch Jobs
    const { data: jobs, error } = await supabase
        .from('job_postings')
        .select('title, organization, location, deadline, source_url')
        .eq('crawl_board_id', board.id);

    if (error) {
        console.error(error);
        return;
    }

    console.log(`\n📋 Gwangju Jobs (${jobs.length} items):`);
    jobs.forEach((job, index) => {
        console.log(`\n[${index + 1}] ${job.title}`);
        console.log(`   - 기관: ${job.organization}`);
        console.log(`   - 지역: ${job.location}`);
        console.log(`   - 마감: ${job.deadline}`);
        console.log(`   - 링크: ${job.source_url}`);
    });
}

listGwangjuJobs();

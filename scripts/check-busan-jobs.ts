import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBusanJobs() {
    console.log('🔍 부산 지역 공고 상세 확인 중...\n');

    const { data, error } = await supabase
        .from('job_postings')
        .select('id, title, organization, location, source_url, created_at')
        .or('location.ilike.%부산%,organization.ilike.%부산%,source_url.ilike.%pen.go.kr%')
        .order('created_at', { ascending: false })
        .limit(30);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    console.log(`✅ 부산 관련 공고: ${data?.length || 0}개\n`);

    data?.forEach((job, i) => {
        // source_url에서 nttSn 추출
        const nttSnMatch = job.source_url?.match(/nttSn=(\d+)/);
        const nttSn = nttSnMatch ? nttSnMatch[1] : 'N/A';

        console.log(`${i + 1}. [${job.organization}] ${job.title}`);
        console.log(`   nttSn: ${nttSn} | URL: ${job.source_url?.substring(0, 60)}...`);
    });
}

checkBusanJobs();

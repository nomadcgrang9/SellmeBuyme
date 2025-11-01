import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function compareJobData() {
  console.log('=== 경기도 크롤링 데이터 샘플 (최근 5개) ===\n');

  const { data: gyeonggiData, error: gyeonggiError } = await supabase
    .from('job_postings')
    .select('id, organization, title, job_type, tags, location, compensation, deadline, crawl_source_id')
    .order('created_at', { ascending: false })
    .limit(5);

  if (gyeonggiError) {
    console.error('경기도 데이터 조회 실패:', gyeonggiError);
  } else {
    gyeonggiData?.forEach((job, idx) => {
      console.log(`[${idx + 1}]`);
      console.log(`  ID: ${job.id}`);
      console.log(`  organization: "${job.organization}"`);
      console.log(`  title: "${job.title}"`);
      console.log(`  job_type: "${job.job_type}"`);
      console.log(`  tags: [${job.tags?.join(', ')}]`);
      console.log(`  location: "${job.location}"`);
      console.log(`  compensation: "${job.compensation}"`);
      console.log(`  deadline: "${job.deadline}"`);
      console.log(`  crawl_source_id: ${job.crawl_source_id}`);
      console.log('');
    });
  }

  console.log('\n=== 남양주 AI 크롤링 데이터 (crawl_source_id 기준) ===\n');

  // 남양주 crawl_source 찾기
  const { data: namyangjuSource } = await supabase
    .from('crawl_boards')
    .select('id, board_name')
    .ilike('board_name', '%남양주%')
    .single();

  if (namyangjuSource) {
    console.log(`남양주 crawl_source_id: ${namyangjuSource.id} (${namyangjuSource.board_name})\n`);

    const { data: namyangjuData, error: namyangjuError } = await supabase
      .from('job_postings')
      .select('id, organization, title, job_type, tags, location, compensation, deadline, crawl_source_id, created_at')
      .eq('crawl_source_id', namyangjuSource.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (namyangjuError) {
      console.error('남양주 데이터 조회 실패:', namyangjuError);
    } else if (namyangjuData && namyangjuData.length > 0) {
      namyangjuData.forEach((job, idx) => {
        console.log(`[${idx + 1}]`);
        console.log(`  ID: ${job.id}`);
        console.log(`  organization: "${job.organization}"`);
        console.log(`  title: "${job.title}"`);
        console.log(`  job_type: "${job.job_type}"`);
        console.log(`  tags: [${job.tags?.join(', ')}]`);
        console.log(`  location: "${job.location}"`);
        console.log(`  compensation: "${job.compensation}"`);
        console.log(`  deadline: "${job.deadline}"`);
        console.log(`  created_at: ${job.created_at}`);
        console.log('');
      });
    } else {
      console.log('남양주 데이터 없음');
    }
  }

  console.log('\n=== 데이터 구조 차이 분석 ===\n');
  console.log('경기도 크롤러:');
  console.log('  - organization: 학교 이름 (예: "위례한빛초등학교")');
  console.log('  - title: 직무/채용분야 (예: "운영인력")');
  console.log('');
  console.log('남양주 AI 크롤러:');
  console.log('  - organization: 게시판 이름 (예: "남양주교육지원청 구인구직")');
  console.log('  - title: 공고 전체 제목 (예: "2026학년도 초1~2 맞춤형...")');
}

compareJobData().catch(console.error);

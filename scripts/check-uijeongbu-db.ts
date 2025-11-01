import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkUijeongbuDB() {
  console.log('\n🔍 의정부 게시판 DB 데이터 확인\n');

  try {
    // 의정부 공고 조회
    const { data: jobs, error } = await supabase
      .from('job_postings')
      .select('id, organization, title, attachment_url, source_url')
      .ilike('organization', '%의정부%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ 조회 실패:', error.message);
      return;
    }

    console.log(`발견된 의정부 공고: ${jobs?.length || 0}개\n`);

    jobs?.forEach((job, i) => {
      console.log(`[${i + 1}] ${job.title}`);
      console.log(`    organization: ${job.organization}`);
      console.log(`    attachment_url: ${job.attachment_url || 'NULL'}`);
      console.log(`    source_url: ${job.source_url}`);
      console.log('');
    });

    // attachment_url이 있는지 확인
    const hasAttachment = jobs?.some(job => job.attachment_url);

    if (hasAttachment) {
      console.log('✅ 의정부 공고에 attachment_url이 존재합니다!');
      console.log('   → HTML에서 추출했거나, Gemini Vision이 추출한 것입니다.');
    } else {
      console.log('⚠️  의정부 공고에도 attachment_url이 NULL입니다.');
      console.log('   → 스크린샷으로 대체하는 방식일 가능성 높음');
    }

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkUijeongbuDB();

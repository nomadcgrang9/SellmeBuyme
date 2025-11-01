import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkLocationFields() {
  console.log('\n🔍 의정부 & 성남 게시판 location 필드 팩트체크\n');

  try {
    // 1. 의정부 공고 조회
    const { data: uijeongbu, error: err1 } = await supabase
      .from('job_postings')
      .select('id, organization, title, location, source_url')
      .ilike('organization', '%의정부%')
      .order('created_at', { ascending: false })
      .limit(3);

    if (err1) {
      console.error('❌ 의정부 조회 실패:', err1.message);
    } else {
      console.log(`\n=== 의정부 공고 (${uijeongbu?.length || 0}개) ===\n`);
      uijeongbu?.forEach((job, i) => {
        console.log(`[${i + 1}] ${job.title}`);
        console.log(`    organization: ${job.organization}`);
        console.log(`    location: ${JSON.stringify(job.location)}`);
        console.log(`    source_url: ${job.source_url}\n`);
      });

      const hasLocation = uijeongbu?.some(job => job.location && job.location.length > 0);
      if (hasLocation) {
        console.log('✅ 의정부: location 필드 존재함!');
      } else {
        console.log('❌ 의정부: location 필드 비어있음 (null 또는 [])');
      }
    }

    // 2. 성남 공고 조회
    const { data: seongnam, error: err2 } = await supabase
      .from('job_postings')
      .select('id, organization, title, location, source_url')
      .ilike('organization', '%성남%')
      .order('created_at', { ascending: false })
      .limit(3);

    if (err2) {
      console.error('❌ 성남 조회 실패:', err2.message);
    } else {
      console.log(`\n\n=== 성남 공고 (${seongnam?.length || 0}개) ===\n`);
      seongnam?.forEach((job, i) => {
        console.log(`[${i + 1}] ${job.title}`);
        console.log(`    organization: ${job.organization}`);
        console.log(`    location: ${JSON.stringify(job.location)}`);
        console.log(`    source_url: ${job.source_url}\n`);
      });

      const hasLocation = seongnam?.some(job => job.location && job.location.length > 0);
      if (hasLocation) {
        console.log('✅ 성남: location 필드 존재함!');
      } else {
        console.log('❌ 성남: location 필드 비어있음 (null 또는 [])');
      }
    }

    // 3. 결론
    console.log('\n\n📊 결론:');
    const uiHasLoc = uijeongbu?.some(job => job.location && job.location.length > 0);
    const snHasLoc = seongnam?.some(job => job.location && job.location.length > 0);

    if (uiHasLoc && snHasLoc) {
      console.log('✅ 의정부, 성남 모두 location 필드가 있습니다.');
      console.log('   → 기존 크롤러들도 location 필드를 생성하고 있었습니다.');
    } else {
      console.log('⚠️  의정부/성남 중 일부 또는 전부가 location 필드가 비어있습니다.');
      console.log('   → AI 템플릿에만 location 추가가 필요했던 것이 맞습니다.');
    }

  } catch (error) {
    console.error('❌ 에러:', error);
  }
}

checkLocationFields();

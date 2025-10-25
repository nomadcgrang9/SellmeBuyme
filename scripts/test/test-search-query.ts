/**
 * 실제 검색 쿼리 동작 테스트
 * 목적: "일본" 검색 시 왜 "일본어" 공고가 안 나오는지 정확히 파악
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSearchQuery() {
  console.log('\n=== 검색 쿼리 동작 테스트 ===\n');

  // 1. 현재 프론트엔드 방식: OR 조건 (title OR organization OR location OR subject) - FIXED!
  console.log('1. 현재 방식 (subject 포함): ilike OR 쿼리');
  const { data: test1, error: err1 } = await supabase
    .from('job_postings')
    .select('id, title, tags, subject')
    .or('title.ilike.%일본%,organization.ilike.%일본%,location.ilike.%일본%,subject.ilike.%일본%')
    .limit(10);

  if (err1) {
    console.error('❌ 에러:', err1.message);
  } else {
    console.log(`✅ 결과: ${test1?.length}건`);
    console.table(test1?.map(j => ({
      title: j.title?.substring(0, 30),
      tags: j.tags?.join(', '),
      subject: j.subject
    })));
  }

  // 2. tags를 포함한 검색
  console.log('\n2. tags 포함 (contains - 정확 매칭):');
  const { data: test2, error: err2 } = await supabase
    .from('job_postings')
    .select('id, title, tags, subject')
    .or('title.ilike.%일본%,tags.cs.{일본}')
    .limit(10);

  if (err2) {
    console.error('❌ 에러:', err2.message);
  } else {
    console.log(`✅ 결과: ${test2?.length}건`);
    console.table(test2?.map(j => ({
      title: j.title?.substring(0, 30),
      tags: j.tags?.join(', ')
    })));
  }

  // 3. 실제 "일본어" 데이터가 어떻게 저장되어 있는지 확인
  console.log('\n3. "일본어" 데이터 실제 저장 상태:');
  const { data: test3 } = await supabase
    .from('job_postings')
    .select('id, title, tags, subject, organization, location')
    .or('title.ilike.%일본%,tags.cs.{일본어},subject.ilike.%일본%')
    .limit(10);

  console.log(`✅ 결과: ${test3?.length}건`);
  console.table(test3?.map(j => ({
    title: j.title,
    tags: j.tags?.join(' | '),
    subject: j.subject,
    organization: j.organization,
    location: j.location
  })));

  // 4. 클라이언트 사이드 필터링 시뮬레이션
  console.log('\n4. 클라이언트 필터링 시뮬레이션:');
  const searchTerm = '일본';
  const filtered = test3?.filter((job) => {
    const title = (job.title ?? '').toLowerCase();
    const organization = (job.organization ?? '').toLowerCase();
    const location = (job.location ?? '').toLowerCase();
    const tags = Array.isArray(job.tags)
      ? job.tags.map((tag: string) => (tag ?? '').toLowerCase())
      : [];
    const subject = (job.subject ?? '').toLowerCase();

    const fields = [title, organization, location, subject, ...tags];

    // 현재 Phase 1 로직 (OR)
    return fields.some((field) => field.includes(searchTerm.toLowerCase()));
  });

  console.log(`필터링 후: ${filtered?.length}건`);
  console.table(filtered?.map(j => ({
    title: j.title?.substring(0, 40),
    matched_reason: [
      j.title?.toLowerCase().includes('일본') ? 'title' : '',
      j.tags?.some((t: string) => t.toLowerCase().includes('일본')) ? 'tags' : '',
      j.subject?.toLowerCase().includes('일본') ? 'subject' : ''
    ].filter(Boolean).join(', ')
  })));

  console.log('\n=== 완료 ===\n');
}

testSearchQuery().catch(console.error);

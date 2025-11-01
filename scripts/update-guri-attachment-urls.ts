import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const downloadFunctionUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/download-attachment`;

function buildAttachmentDownloadUrl(originalUrl: string, filename: string): string {
  const params = new URLSearchParams({ url: originalUrl });
  if (filename) {
    params.set('filename', filename);
  }
  // Edge Function 호출 시 anon key 포함 (Supabase 인증 우회)
  if (anonKey) {
    params.set('apikey', anonKey);
  }
  return `${downloadFunctionUrl}?${params.toString()}`;
}

function sanitizeFilenameComponent(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildAttachmentFilename(organization: string, originalFilename?: string | null): string {
  const sanitizedOrg = sanitizeFilenameComponent(organization || '');
  const baseName = sanitizedOrg.length > 0 ? sanitizedOrg : '공고';
  const extension = (originalFilename?.split('.').pop() || 'hwp').toLowerCase();
  return `${baseName} 공고문.${extension}`;
}

async function updateGuriAttachmentUrls() {
  console.log('🔍 구리남양주 게시판 공고 조회 중...\n');

  // 구리남양주 게시판 ID 조회
  const { data: board } = await supabase
    .from('crawl_boards')
    .select('id, name')
    .eq('name', '구리남양주 기간제교사')
    .single();

  if (!board) {
    console.error('❌ 구리남양주 기간제교사 게시판을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ 게시판 ID: ${board.id}`);
  console.log(`📋 게시판 이름: ${board.name}\n`);

  // 해당 게시판의 모든 공고 조회 (crawl_source_id 사용)
  const { data: jobs, error } = await supabase
    .from('job_postings')
    .select('id, organization, attachment_url, source_url')
    .eq('crawl_source_id', board.id)
    .not('attachment_url', 'is', null);

  if (error) {
    console.error('❌ 공고 조회 실패:', error);
    return;
  }

  if (!jobs || jobs.length === 0) {
    console.log('⚠️  attachment_url이 있는 공고가 없습니다.');
    return;
  }

  console.log(`📊 총 ${jobs.length}개 공고 발견\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const job of jobs) {
    console.log(`\n처리 중: ${job.organization}`);
    console.log(`기존 URL: ${job.attachment_url}`);

    // 이미 apikey가 포함된 경우 스킵
    if (job.attachment_url.includes('apikey=')) {
      console.log('✓ 이미 apikey 포함됨 - 스킵');
      skippedCount++;
      continue;
    }

    // URL에서 원본 URL 추출
    let originalUrl: string;
    try {
      const urlObj = new URL(job.attachment_url);
      originalUrl = urlObj.searchParams.get('url') || job.attachment_url;
    } catch {
      originalUrl = job.attachment_url;
    }

    // 새 URL 생성
    const filename = buildAttachmentFilename(job.organization, originalUrl);
    const newUrl = buildAttachmentDownloadUrl(originalUrl, filename);

    console.log(`새 URL: ${newUrl}`);

    // DB 업데이트
    const { error: updateError } = await supabase
      .from('job_postings')
      .update({ attachment_url: newUrl })
      .eq('id', job.id);

    if (updateError) {
      console.error(`❌ 업데이트 실패 (${job.id}):`, updateError);
    } else {
      console.log('✅ 업데이트 성공');
      updatedCount++;
    }
  }

  console.log('\n\n=== 업데이트 완료 ===');
  console.log(`✅ 업데이트: ${updatedCount}개`);
  console.log(`⏭️  스킵: ${skippedCount}개`);
  console.log(`📊 총: ${jobs.length}개`);
}

updateGuriAttachmentUrls().catch(console.error);

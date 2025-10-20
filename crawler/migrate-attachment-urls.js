import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ SUPABASE_URL이 설정되지 않았습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY가 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

const downloadFunctionUrl = `${supabaseUrl}/functions/v1/download-attachment`;

function sanitizeFilenameComponent(value) {
  if (!value) {
    return '';
  }
  return value
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractExtensionFromUrl(url) {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const filename = pathname.split('/').pop();
    if (filename && filename.includes('.')) {
      const ext = filename.split('.').pop();
      if (ext) {
        return ext.toLowerCase();
      }
    }
  } catch (error) {
    // ignore
  }
  return null;
}

function extractExtensionFromFilename(filename) {
  if (!filename) {
    return null;
  }
  const match = filename.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : null;
}

function buildCanonicalFilename(job) {
  const organization = sanitizeFilenameComponent(job.organization || job.title);
  const baseName = organization ? `${organization} 공고문` : '공고문';

  const extension = extractExtensionFromUrl(job.attachment_url)
    || extractExtensionFromFilename(job.original_filename)
    || 'hwp';

  return `${baseName}.${extension}`;
}

function buildAttachmentDownloadUrl(originalUrl, filename) {
  if (!originalUrl) {
    return null;
  }

  const params = new URLSearchParams({ url: originalUrl });
  if (filename) {
    params.set('filename', filename);
  }

  return `${downloadFunctionUrl}?${params.toString()}`;
}

async function fetchTargetRows() {
  const { data, error } = await supabase
    .from('job_postings')
    .select('id, title, organization, attachment_url')
    .not('attachment_url', 'ilike', '%download-attachment%');

  if (error) {
    throw error;
  }

  return data;
}

async function migrate() {
  try {
    console.log('🚀 첨부파일 URL 마이그레이션 시작');

    const rows = await fetchTargetRows();
    if (!rows || rows.length === 0) {
      console.log('✅ 변환할 레코드가 없습니다.');
      return;
    }

    console.log(`📦 변환 대상 ${rows.length}건`);

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const job of rows) {
      if (!job.attachment_url) {
        skipCount++;
        continue;
      }

      const canonicalFilename = buildCanonicalFilename(job);
      const newUrl = buildAttachmentDownloadUrl(job.attachment_url, canonicalFilename);

      if (!newUrl || newUrl === job.attachment_url) {
        skipCount++;
        continue;
      }

      const { error } = await supabase
        .from('job_postings')
        .update({ attachment_url: newUrl })
        .eq('id', job.id);

      if (error) {
        failCount++;
        console.error(`❌ 업데이트 실패 (${job.id}):`, error.message);
      } else {
        successCount++;
        console.log(`✅ 업데이트 완료 (${job.id}): ${canonicalFilename}`);
      }
    }

    console.log('==================================================');
    console.log('📊 마이그레이션 결과');
    console.log(`✅ 성공: ${successCount}`);
    console.log(`⏭️ 건너뜀: ${skipCount}`);
    console.log(`❌ 실패: ${failCount}`);
    console.log('==================================================');
  } catch (error) {
    console.error('❌ 마이그레이션 도중 오류 발생:', error);
    process.exit(1);
  }
}

migrate();

import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const downloadFunctionUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/download-attachment`
  : null;

function buildAttachmentDownloadUrl(originalUrl, filename) {
  if (!originalUrl) {
    return null;
  }

  if (downloadFunctionUrl) {
    const params = new URLSearchParams({ url: originalUrl });
    if (filename) {
      params.set('filename', filename);
    }
    return `${downloadFunctionUrl}?${params.toString()}`;
  }

  const fallbackName = filename || '공고문.hwp';
  return `${originalUrl}#filename=${encodeURIComponent(fallbackName)}`;
}

function main() {
  const urlWithFilename = buildAttachmentDownloadUrl(
    'https://example.com/file.hwp',
    '테스트 공고문.hwp'
  );

  const urlWithoutFilename = buildAttachmentDownloadUrl(
    'https://example.com/download?id=1234',
    null
  );

  console.log('SUPABASE_URL:', supabaseUrl || '(없음)');
  console.log('Edge Function URL:', downloadFunctionUrl || '(없음)');
  console.log('파일명 포함 테스트:', urlWithFilename);
  console.log('파일명 없음 테스트:', urlWithoutFilename);
}

main();

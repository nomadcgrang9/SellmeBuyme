'use client';

import { supabase } from './client';

const BUCKET_NAME = 'job-posting-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/haansofthwp',
  'application/x-hwp',
  'application/vnd.hancom.hwp',
  'application/x-hwpx',
  'application/octet-stream',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif'
];

const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'hwp',
  'hwpx',
  'txt',
  'jpeg',
  'jpg',
  'png',
  'gif'
];

/**
 * 공고 첨부파일을 Supabase Storage에 업로드
 * @param file 업로드할 파일
 * @param userId 로그인 사용자 ID
 * @returns 업로드된 파일 경로 (예: "user-id/filename-uuid.pdf")
 */
export async function uploadJobAttachment(file: File, userId: string): Promise<string> {
  // 파일 크기 검증
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`파일 크기는 ${MAX_FILE_SIZE / 1024 / 1024}MB 이하여야 합니다.`);
  }

  // MIME 타입 검증
  const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';

  if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(extension)) {
    throw new Error('지원하지 않는 파일 형식입니다. (PDF, HWP, Word, Excel, 이미지 등)');
  }

  // 파일명 생성: user-id/timestamp-uuid.ext
  const timestamp = Date.now();
  const uuid = Math.random().toString(36).substring(2, 15);
  const ext = extension || 'bin';
  const fileName = `${timestamp}-${uuid}.${ext}`;
  const filePath = `${userId}/${fileName}`;

  // Supabase Storage에 업로드
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('파일 업로드 실패:', error);
    throw new Error(`파일 업로드에 실패했습니다: ${error.message}`);
  }

  return data.path;
}

/**
 * 업로드된 첨부파일의 공개 URL 생성 (만료 없음)
 * @param filePath 파일 경로 (uploadJobAttachment 반환값)
 * @returns 공개 URL
 */
export function getJobAttachmentPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * 업로드된 첨부파일의 공개 URL 생성 (서명된 URL - 만료 있음)
 * @param filePath 파일 경로 (uploadJobAttachment 반환값)
 * @param expiresIn 만료 시간 (초, 기본값: 1주일)
 * @returns 공개 URL
 * @deprecated getJobAttachmentPublicUrl 사용 권장 (만료 없음)
 */
export async function getJobAttachmentUrl(
  filePath: string,
  expiresIn: number = 7 * 24 * 60 * 60
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error('서명된 URL 생성 실패:', error);
    throw new Error(`URL 생성에 실패했습니다: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * 첨부파일 삭제
 * @param filePath 파일 경로
 */
export async function deleteJobAttachment(filePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([filePath]);

  if (error) {
    console.error('파일 삭제 실패:', error);
    throw new Error(`파일 삭제에 실패했습니다: ${error.message}`);
  }
}

/**
 * 사용자의 모든 첨부파일 삭제 (계정 삭제 시 등)
 * @param userId 사용자 ID
 */
export async function deleteUserAttachments(userId: string): Promise<void> {
  const { data: files, error: listError } = await supabase.storage
    .from(BUCKET_NAME)
    .list(userId);

  if (listError) {
    console.error('파일 목록 조회 실패:', listError);
    return;
  }

  if (!files || files.length === 0) {
    return;
  }

  const filePaths = files.map((file) => `${userId}/${file.name}`);

  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(filePaths);

  if (deleteError) {
    console.error('사용자 파일 일괄 삭제 실패:', deleteError);
    throw new Error(`파일 삭제에 실패했습니다: ${deleteError.message}`);
  }
}

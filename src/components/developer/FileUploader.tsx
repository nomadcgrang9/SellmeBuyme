/**
 * FileUploader - 통합 파일 업로드 컴포넌트
 * 이미지 (사진촬영/갤러리) + 문서 파일 (PDF, HWP, Word, Excel)
 * 최대 50MB, 30개
 */
import { Camera, Image as ImageIcon, Paperclip, X, FileText, File } from 'lucide-react';
import { useState } from 'react';

interface FileUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const MAX_SIZE_DEFAULT = 50; // MB
const MAX_FILES_DEFAULT = 30;

// 허용 파일 타입
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/haansofthwp',
  'application/hwp',
  'application/x-hwp',
  'application/vnd.hancom.hwp',
  'application/x-hwpx',
  'application/vnd.hancom.hwpx',
  'application/octet-stream', // HWP가 이렇게 올 수 있음
];
const ALLOWED_DOC_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'hwp', 'hwpx'];

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

function isAllowedFile(file: File): boolean {
  // 이미지 타입 체크
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) return true;
  // 문서 타입 체크
  if (ALLOWED_DOC_TYPES.includes(file.type)) return true;
  // 확장자로 체크 (HWP 등은 MIME이 부정확할 수 있음)
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ALLOWED_DOC_EXTENSIONS.includes(ext)) return true;
  return false;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function getFileIcon(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (ext === 'hwp' || ext === 'hwpx') return <FileText className="w-5 h-5 text-blue-600" />;
  if (ext === 'doc' || ext === 'docx') return <FileText className="w-5 h-5 text-blue-500" />;
  if (ext === 'xls' || ext === 'xlsx') return <FileText className="w-5 h-5 text-green-600" />;
  return <File className="w-5 h-5 text-gray-500" />;
}

export default function FileUploader({
  files,
  onChange,
  maxFiles = MAX_FILES_DEFAULT,
  maxSizeMB = MAX_SIZE_DEFAULT,
}: FileUploaderProps) {
  const [previewUrls, setPreviewUrls] = useState<Map<string, string>>(new Map());
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // 파일 추가 공통 로직
  const handleFilesAdded = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const filesArray = Array.from(newFiles);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = filesArray.slice(0, remainingSlots);

    if (filesToAdd.length === 0) {
      alert(`최대 ${maxFiles}개까지 업로드 가능합니다`);
      return;
    }

    // 크기 검증
    const oversizedFiles = filesToAdd.filter((f) => f.size > maxSizeBytes);
    if (oversizedFiles.length > 0) {
      alert(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다`);
      return;
    }

    // 타입 검증
    const invalidFiles = filesToAdd.filter((f) => !isAllowedFile(f));
    if (invalidFiles.length > 0) {
      alert('지원하지 않는 파일 형식입니다\n(이미지, PDF, HWP, Word, Excel만 가능)');
      return;
    }

    // 이미지 미리보기 URL 생성
    const newPreviewUrls = new Map(previewUrls);
    filesToAdd.forEach((file) => {
      if (isImageFile(file)) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        newPreviewUrls.set(key, URL.createObjectURL(file));
      }
    });
    setPreviewUrls(newPreviewUrls);

    onChange([...files, ...filesToAdd]);
  };

  // 카메라 촬영
  const handleCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => handleFilesAdded((e.target as HTMLInputElement).files);
    input.click();
  };

  // 갤러리 (이미지만)
  const handleGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => handleFilesAdded((e.target as HTMLInputElement).files);
    input.click();
  };

  // 파일 첨부 (문서+이미지)
  const handleFiles = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.hwpx';
    input.multiple = true;
    input.onchange = (e) => handleFilesAdded((e.target as HTMLInputElement).files);
    input.click();
  };

  // 파일 제거
  const handleRemove = (index: number) => {
    const fileToRemove = files[index];
    const key = `${fileToRemove.name}-${fileToRemove.size}-${fileToRemove.lastModified}`;

    // 미리보기 URL 해제
    if (previewUrls.has(key)) {
      URL.revokeObjectURL(previewUrls.get(key)!);
      const newPreviewUrls = new Map(previewUrls);
      newPreviewUrls.delete(key);
      setPreviewUrls(newPreviewUrls);
    }

    onChange(files.filter((_, i) => i !== index));
  };

  const getPreviewUrl = (file: File): string | null => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    return previewUrls.get(key) || null;
  };

  const isDisabled = files.length >= maxFiles;

  return (
    <div className="space-y-3">
      {/* 버튼 영역 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCamera}
          disabled={isDisabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Camera className="w-4 h-4" />
          <span>촬영</span>
        </button>

        <button
          type="button"
          onClick={handleGallery}
          disabled={isDisabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          <span>갤러리</span>
        </button>

        <button
          type="button"
          onClick={handleFiles}
          disabled={isDisabled}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Paperclip className="w-4 h-4" />
          <span>파일</span>
        </button>
      </div>

      {/* 파일 목록 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            {files.length}/{maxFiles}개
          </p>

          {/* 이미지 그리드 */}
          {files.some(isImageFile) && (
            <div className="grid grid-cols-4 gap-2">
              {files.map((file, index) => {
                if (!isImageFile(file)) return null;
                const previewUrl = getPreviewUrl(file);
                return (
                  <div key={index} className="relative group aspect-square">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="w-full h-full object-cover rounded border border-gray-200"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 문서 파일 목록 */}
          {files.some((f) => !isImageFile(f)) && (
            <div className="space-y-1">
              {files.map((file, index) => {
                if (isImageFile(file)) return null;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded border border-gray-200 group"
                  >
                    {getFileIcon(file)}
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 안내 */}
      <p className="text-xs text-gray-400">
        {maxSizeMB}MB 이하, 최대 {maxFiles}개
      </p>
    </div>
  );
}

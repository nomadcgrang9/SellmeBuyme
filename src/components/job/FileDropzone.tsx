// 파일 드래그 앤 드롭 업로드 컴포넌트
// 작성일: 2026-01-29

import { useCallback, useState, useRef } from 'react';

interface FileDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  maxSizeMB?: number;
  acceptedExtensions?: string[];
}

export default function FileDropzone({
  file,
  onFileSelect,
  maxSizeMB = 30,
  acceptedExtensions = ['pdf', 'hwp', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif']
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const validateFile = (file: File): string | null => {
    // 확장자 검사
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !acceptedExtensions.includes(extension)) {
      return `허용되지 않는 파일 형식입니다. (허용: ${acceptedExtensions.join(', ')})`;
    }

    // 파일 크기 검사
    if (file.size > maxSizeBytes) {
      return `파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`;
    }

    return null;
  };

  const handleFile = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect(selectedFile);
  }, [acceptedExtensions, maxSizeBytes, onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // 같은 파일 재선택 가능하도록 초기화
    e.target.value = '';
  }, [handleFile]);

  const handleRemoveFile = useCallback(() => {
    onFileSelect(null);
    setError(null);
  }, [onFileSelect]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 파일 크기 포맷
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // 파일 타입별 아이콘
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (ext === 'pdf') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
        </svg>
      );
    }

    if (['hwp', 'doc', 'docx'].includes(ext || '')) {
      return (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    if (['xls', 'xlsx'].includes(ext || '')) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return (
        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    // 기본 아이콘
    return (
      <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedExtensions.map(ext => `.${ext}`).join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* 파일이 없을 때: 드롭존 */}
      {!file && (
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${isDragging
              ? 'border-sky-400 bg-sky-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
            }
          `}
        >
          <svg
            className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-sky-500' : 'text-gray-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className={`text-sm ${isDragging ? 'text-sky-600' : 'text-gray-600'}`}>
            파일을 드래그하거나 클릭하여 업로드
          </p>
          <p className="mt-1 text-xs text-gray-400">
            {acceptedExtensions.map(ext => ext.toUpperCase()).join(', ')}
          </p>
        </div>
      )}

      {/* 파일이 있을 때: 파일 정보 표시 */}
      {file && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            {getFileIcon(file.name)}
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">
                {file.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemoveFile}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
            title="파일 삭제"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

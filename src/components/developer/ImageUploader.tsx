// ImageUploader - 이미지 업로드 컴포넌트 (카메라/갤러리)
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import { useState } from 'react';

interface ImageUploaderProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
}

export default function ImageUploader({
  files,
  onChange,
  maxFiles = 5,
}: ImageUploaderProps) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  // 파일 추가
  const handleFilesAdded = (newFiles: FileList | null) => {
    if (!newFiles) return;

    const filesArray = Array.from(newFiles);
    const remainingSlots = maxFiles - files.length;
    const filesToAdd = filesArray.slice(0, remainingSlots);

    if (filesToAdd.length === 0) {
      alert(`최대 ${maxFiles}개까지만 업로드 가능합니다`);
      return;
    }

    // 파일 크기 검증 (5MB)
    const invalidFiles = filesToAdd.filter(
      (file) => file.size > 5 * 1024 * 1024
    );
    if (invalidFiles.length > 0) {
      alert('파일 크기는 5MB 이하여야 합니다');
      return;
    }

    // 이미지 타입 검증
    const nonImageFiles = filesToAdd.filter(
      (file) => !file.type.startsWith('image/')
    );
    if (nonImageFiles.length > 0) {
      alert('이미지 파일만 업로드 가능합니다');
      return;
    }

    // 미리보기 URL 생성
    const newPreviewUrls = filesToAdd.map((file) =>
      URL.createObjectURL(file)
    );
    setPreviewUrls([...previewUrls, ...newPreviewUrls]);

    onChange([...files, ...filesToAdd]);
  };

  // 카메라 열기
  const handleCamera = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 후면 카메라
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      handleFilesAdded(target.files);
    };
    input.click();
  };

  // 갤러리 열기
  const handleGallery = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      handleFilesAdded(target.files);
    };
    input.click();
  };

  // 파일 제거
  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);

    // 이전 URL 해제
    URL.revokeObjectURL(previewUrls[index]);

    setPreviewUrls(newPreviewUrls);
    onChange(newFiles);
  };

  return (
    <div className="space-y-3">
      {/* 버튼 영역 */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleCamera}
          disabled={files.length >= maxFiles}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Camera className="w-4 h-4" />
          사진 촬영
        </button>

        <button
          type="button"
          onClick={handleGallery}
          disabled={files.length >= maxFiles}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ImageIcon className="w-4 h-4" />
          갤러리
        </button>
      </div>

      {/* 미리보기 영역 */}
      {files.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-2">
            {files.length}/{maxFiles}개 선택됨
          </p>
          <div className="grid grid-cols-3 gap-2">
            {previewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`미리보기 ${index + 1}`}
                  className="w-full aspect-square object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="이미지 제거"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 메시지 */}
      <p className="text-xs text-gray-500">
        최대 {maxFiles}개, 각 5MB 이하 이미지 파일만 업로드 가능합니다
      </p>
    </div>
  );
}

import { useState } from 'react';
import { IconUpload, IconFile, IconX } from '@tabler/icons-react';

interface FileUploadFieldProps {
  value?: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  accept?: string;
  maxSizeMB?: number;
}

export default function FileUploadField({
  value,
  onChange,
  error,
  accept = '.pdf,.doc,.docx,.hwp',
  maxSizeMB = 10,
}: FileUploadFieldProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 검증
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`);
        return;
      }
      onChange(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      // 파일 크기 검증
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`);
        return;
      }
      onChange(file);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-0.5">
      <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
        공고문 첨부 <span className="text-gray-400 font-normal">(선택)</span>
      </label>

      {!value ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg transition-colors ${
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center justify-center py-2.5 px-2">
            <IconUpload size={18} className="text-gray-400 mb-1" />
            <p className="text-[11px] text-gray-600 text-center">
              파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              {accept.split(',').join(', ')} (최대 {maxSizeMB}MB)
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-300 rounded-lg">
          <IconFile size={16} className="text-blue-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-gray-900 truncate">{value.name}</p>
            <p className="text-[10px] text-gray-500">{formatFileSize(value.size)}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors"
          >
            <IconX size={14} className="text-gray-500" />
          </button>
        </div>
      )}

      {error && <p className="text-[11px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}

// AttachmentList - 첨부파일 목록 표시 컴포넌트
import { useState } from 'react';
import { Paperclip, Download, FileText, File, Image as ImageIcon } from 'lucide-react';
import ImageViewer from './ImageViewer';

interface AttachmentListProps {
  attachments: string[];
  className?: string;
}

// 파일 확장자로 이미지 여부 확인
function isImageUrl(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
}

// 파일 확장자로 아이콘 결정
function getFileIcon(url: string) {
  const ext = url.split('.').pop()?.toLowerCase();
  if (isImageUrl(url)) {
    return <ImageIcon className="w-4 h-4 text-blue-500" />;
  }
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (ext === 'hwp' || ext === 'hwpx') return <FileText className="w-4 h-4 text-blue-600" />;
  if (ext === 'doc' || ext === 'docx') return <FileText className="w-4 h-4 text-blue-500" />;
  if (ext === 'xls' || ext === 'xlsx') return <FileText className="w-4 h-4 text-green-600" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

// URL에서 파일명 추출
function getFileName(url: string): string {
  const parts = url.split('/');
  const fullName = parts[parts.length - 1];
  // 타임스탬프-랜덤-원본명.ext 형식에서 원본명.ext 추출
  const match = fullName.match(/^\d+-[a-z0-9]+-(.+)$/);
  if (match) {
    return decodeURIComponent(match[1]);
  }
  return decodeURIComponent(fullName);
}

export default function AttachmentList({ attachments, className = '' }: AttachmentListProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (!attachments || attachments.length === 0) return null;

  // 이미지와 문서 분리
  const images = attachments.filter(isImageUrl);
  const documents = attachments.filter((url) => !isImageUrl(url));

  const handleImageClick = (url: string) => {
    const index = images.indexOf(url);
    setViewerIndex(index >= 0 ? index : 0);
    setViewerOpen(true);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* 헤더 */}
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Paperclip className="w-4 h-4" />
        <span>첨부파일 ({attachments.length})</span>
      </div>

      {/* 이미지 그리드 */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, index) => (
            <button
              key={index}
              onClick={() => handleImageClick(url)}
              className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
            >
              <img
                src={url}
                alt={`첨부 이미지 ${index + 1}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* 문서 파일 목록 */}
      {documents.length > 0 && (
        <div className="space-y-1">
          {documents.map((url, index) => (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="flex items-center gap-3 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              {getFileIcon(url)}
              <span className="flex-1 text-sm text-gray-700 truncate">
                {getFileName(url)}
              </span>
              <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
            </a>
          ))}
        </div>
      )}

      {/* 이미지 뷰어 */}
      <ImageViewer
        images={images}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  );
}

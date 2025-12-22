// NoticeDetailModal - 공지사항 상세 보기 모달
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Calendar, Pin, Megaphone, Bell, Gift, AlertTriangle, Paperclip, Download, FileText, File } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import ImageViewer from './ImageViewer';
import type { DevNotice, NoticeCategory } from '@/types/developer';

// 파일 확장자로 이미지 여부 확인
function isImageUrl(url: string): boolean {
  const ext = url.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
}

// 파일 확장자로 아이콘 결정
function getFileIcon(url: string) {
  const ext = url.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (ext === 'hwp' || ext === 'hwpx') return <FileText className="w-4 h-4 text-blue-600" />;
  if (ext === 'doc' || ext === 'docx') return <FileText className="w-4 h-4 text-blue-500" />;
  if (ext === 'xls' || ext === 'xlsx') return <FileText className="w-4 h-4 text-green-600" />;
  return <File className="w-4 h-4 text-gray-500" />;
}

// URL에서 파일명 추출 (Base64 디코딩)
function getFileName(url: string): string {
  const parts = url.split('/');
  const fullName = parts[parts.length - 1];
  // 패턴: timestamp-randomStr-base64Name.ext
  const match = fullName.match(/^\d+-[a-z0-9]+-(.+)\.([a-z0-9]+)$/i);
  if (match) {
    const base64Part = match[1];
    const ext = match[2];
    try {
      // URL-safe Base64를 표준 Base64로 변환 후 디코딩
      const standardBase64 = base64Part.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = decodeURIComponent(escape(atob(standardBase64)));
      return decoded;
    } catch {
      // Base64 디코딩 실패시 확장자만 반환
      return `파일.${ext}`;
    }
  }
  // 기존 형식 (URL 인코딩) 호환
  try {
    return decodeURIComponent(fullName);
  } catch {
    return fullName;
  }
}

interface NoticeDetailModalProps {
  notice: DevNotice | null;
  isOpen: boolean;
  onClose: () => void;
}

const NOTICE_CATEGORY_ICONS: Record<NoticeCategory, React.ReactNode> = {
  notice: <Megaphone className="w-4 h-4" />,
  update: <Bell className="w-4 h-4" />,
  event: <Gift className="w-4 h-4" />,
  important: <AlertTriangle className="w-4 h-4" />,
};

const NOTICE_CATEGORY_LABELS: Record<NoticeCategory, string> = {
  notice: '공지',
  update: '업데이트',
  event: '이벤트',
  important: '중요',
};

const NOTICE_CATEGORY_COLORS: Record<NoticeCategory, string> = {
  notice: 'bg-blue-100 text-blue-700',
  update: 'bg-green-100 text-green-700',
  event: 'bg-purple-100 text-purple-700',
  important: 'bg-red-100 text-red-700',
};

export default function NoticeDetailModal({
  notice,
  isOpen,
  onClose,
}: NoticeDetailModalProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  if (!notice) return null;

  // 첨부파일 분리
  const attachments = notice.attachments || [];
  const images = attachments.filter(isImageUrl);
  const documents = attachments.filter((url) => !isImageUrl(url));

  const handleImageClick = (url: string) => {
    const index = images.indexOf(url);
    setViewerIndex(index >= 0 ? index : 0);
    setViewerOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* 모달 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl md:max-h-[80vh] bg-white rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#a8c5e0]/10 to-transparent">
              <div className="flex-1">
                {/* 카테고리와 고정 배지 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${NOTICE_CATEGORY_COLORS[notice.category]}`}>
                    {NOTICE_CATEGORY_ICONS[notice.category]}
                    {NOTICE_CATEGORY_LABELS[notice.category]}
                  </span>
                  {notice.isPinned && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <Pin className="w-3 h-3" />
                      고정
                    </span>
                  )}
                </div>

                {/* 제목 */}
                <h2 className="text-xl font-bold text-gray-900 pr-8">
                  {notice.title}
                </h2>

                {/* 메타 정보 */}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>{notice.authorName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(notice.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              <MarkdownRenderer content={notice.content} />

              {/* 첨부파일 목록 */}
              {attachments.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                    <Paperclip className="w-4 h-4" />
                    <span>첨부파일 ({attachments.length})</span>
                  </div>

                  {/* 이미지 갤러리 (클릭 시 확대) */}
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-3">
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
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 문서 파일 목록 */}
                  {documents.length > 0 && (
                    <div className="space-y-2">
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
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={onClose}
                className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                닫기
              </button>
            </div>
          </motion.div>

          {/* 이미지 뷰어 */}
          <ImageViewer
            images={images}
            initialIndex={viewerIndex}
            isOpen={viewerOpen}
            onClose={() => setViewerOpen(false)}
          />
        </>
      )}
    </AnimatePresence>
  );
}

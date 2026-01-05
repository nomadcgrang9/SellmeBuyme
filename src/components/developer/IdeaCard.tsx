// IdeaCard - 아이디어 카드 컴포넌트 (인라인 펼침 방식 + Todo 체크리스트)
import { useState } from 'react';
import { User, Calendar, Trash2, Edit2, ChevronDown, ChevronUp, Paperclip, Download, FileText, File, CheckSquare } from 'lucide-react';
import { CommentSection } from './comments/CommentSection';
import CategoryBadge from './CategoryBadge';
import ImageViewer from './ImageViewer';
import { linkifyText } from '@/lib/utils/linkify.tsx';
import type { DevIdea, IdeaTodo } from '@/types/developer';

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

interface IdeaCardProps {
  idea: DevIdea;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleTodo?: (todoId: string) => void;
}

export default function IdeaCard({
  idea,
  onEdit,
  onDelete,
  onToggleTodo,
}: IdeaCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // 이미지와 문서 분리
  const images = idea.images.filter(isImageUrl);
  const documents = idea.images.filter((url) => !isImageUrl(url));

  // Todo 통계
  const todos = idea.todos || [];
  const completedTodos = todos.filter((t) => t.isCompleted).length;
  const totalTodos = todos.length;
  const hasTodos = totalTodos > 0;

  const handleImageClick = (url: string) => {
    const index = images.indexOf(url);
    setViewerIndex(index >= 0 ? index : 0);
    setViewerOpen(true);
  };

  // 시간 포맷팅
  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDelete = async () => {
    if (confirm('정말 삭제하시겠습니까?')) {
      setIsDeleting(true);
      try {
        await onDelete?.();
      } catch (error) {
        console.error('Failed to delete idea:', error);
        alert('아이디어 삭제에 실패했습니다');
        setIsDeleting(false);
      }
    }
  };

  // 내용이 2줄 이상인지 체크 (대략 80자 기준)
  const isLongContent = idea.content.length > 80;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden transition-shadow">
      {/* 카드 헤더 */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* 카테고리 배지 */}
            <div className="mb-2">
              <CategoryBadge category={idea.category} />
            </div>

            {/* 내용 미리보기 (접힌 상태) */}
            {!isExpanded && (
              <p className="text-sm text-gray-700 line-clamp-2 break-words">
                {linkifyText(idea.content)}
              </p>
            )}
          </div>

          {/* 우측 상단 버튼 (수정 + 삭제) - 프로젝트로 보내기 버튼 제거됨 */}
          <div className="flex gap-1 flex-shrink-0">
            <button
              onClick={onEdit}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="수정"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 메타데이터 + 펼침 버튼 */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>{idea.authorName}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatTimeAgo(idea.createdAt)}</span>
            </div>
          </div>

          {/* 펼침/접기 버튼 */}
          {(isLongContent || idea.images.length > 0) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title={isExpanded ? '접기' : '펼치기'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 펼쳐진 전체 내용 */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50">
          <div className="pt-4 space-y-4">
            {/* 전체 내용 */}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed break-words">
                {linkifyText(idea.content)}
              </div>
            </div>

            {/* 이미지 갤러리 (클릭 시 확대) */}
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
                  </button>
                ))}
              </div>
            )}

            {/* 문서 파일 목록 */}
            {documents.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                  <Paperclip className="w-3.5 h-3.5" />
                  <span>첨부파일 ({documents.length})</span>
                </div>
                {documents.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors group"
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
        </div>
      )}

      {/* 대표 이미지 미리보기 (접힌 상태에서만, 클릭 시 확대) */}
      {!isExpanded && images.length > 0 && (
        <button
          onClick={() => handleImageClick(images[0])}
          className="relative w-full"
        >
          <img
            src={images[0]}
            alt="아이디어 이미지"
            className="w-full h-32 object-cover hover:opacity-90 transition-opacity"
          />
          {images.length > 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
              +{images.length - 1}장
            </div>
          )}
        </button>
      )}

      {/* 문서 첨부 표시 (접힌 상태) */}
      {!isExpanded && documents.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Paperclip className="w-3 h-3" />
            <span>첨부파일 {documents.length}개</span>
          </div>
        </div>
      )}

      {/* Todo 체크리스트 (Todo가 있을 때만 표시) */}
      {hasTodos && (
        <div className="px-4 py-3 border-t border-gray-100 bg-blue-50/30">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-700 mb-2">
            <CheckSquare className="w-3.5 h-3.5 text-[#7aa3cc]" />
            <span>할 일 ({completedTodos}/{totalTodos})</span>
          </div>
          <div className="space-y-1.5">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start gap-2"
              >
                <button
                  onClick={() => onToggleTodo?.(todo.id)}
                  className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
                    todo.isCompleted
                      ? 'bg-[#a8c5e0] border-[#a8c5e0] text-white'
                      : 'border-gray-300 hover:border-[#a8c5e0]'
                  }`}
                >
                  {todo.isCompleted && (
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span
                  className={`text-sm leading-tight ${
                    todo.isCompleted ? 'line-through text-gray-400' : 'text-gray-700'
                  }`}
                >
                  {todo.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 댓글 섹션 */}
      <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
        <CommentSection targetType="idea" targetId={idea.id} />
      </div>

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

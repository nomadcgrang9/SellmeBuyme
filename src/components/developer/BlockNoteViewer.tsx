/**
 * BlockNoteViewer - BlockNote 콘텐츠 읽기 전용 뷰어
 * JSON 블록 데이터를 렌더링, 기존 텍스트 데이터는 MarkdownRenderer로 fallback
 */
import { useMemo } from 'react';
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  PartialBlock,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import MarkdownRenderer from './MarkdownRenderer';

interface BlockNoteViewerProps {
  content: string;
  className?: string;
}

// 콘텐츠가 BlockNote JSON인지 확인
function isBlockNoteJson(content: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    // BlockNote JSON은 배열이고 각 요소에 type 속성이 있음
    return (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed[0].type !== undefined
    );
  } catch {
    return false;
  }
}

// 커스텀 스키마
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
  },
});

// BlockNote JSON 뷰어 컴포넌트
function BlockNoteJsonViewer({ content }: { content: string }) {
  const parsedContent = useMemo(() => {
    try {
      return JSON.parse(content) as PartialBlock[];
    } catch {
      return [{ type: 'paragraph' as const, content: content }];
    }
  }, [content]);

  const editor = useCreateBlockNote({
    schema,
    initialContent: parsedContent,
  });

  return (
    <div className="blocknote-viewer">
      <BlockNoteView
        editor={editor}
        theme="light"
        editable={false}
      />

      {/* 읽기 전용 스타일 */}
      <style>{`
        .blocknote-viewer .bn-editor {
          padding: 0;
          background: transparent;
        }
        .blocknote-viewer .bn-block-content {
          font-size: 14px;
          line-height: 1.6;
        }
        .blocknote-viewer .bn-side-menu {
          display: none !important;
        }
        .blocknote-viewer .bn-drag-handle-menu {
          display: none !important;
        }
        /* 토글 블록 스타일 */
        .blocknote-viewer [data-content-type="toggleListItem"] {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 8px 12px;
          margin: 4px 0;
        }
        .blocknote-viewer [data-content-type="toggleListItem"] summary {
          cursor: pointer;
          font-weight: 500;
        }
        /* 제목 스타일 */
        .blocknote-viewer [data-content-type="heading"][data-level="1"] {
          font-size: 1.25rem;
          font-weight: 700;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        .blocknote-viewer [data-content-type="heading"][data-level="2"] {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 0.75rem;
          margin-bottom: 0.375rem;
        }
        .blocknote-viewer [data-content-type="heading"][data-level="3"] {
          font-size: 1rem;
          font-weight: 600;
          margin-top: 0.5rem;
          margin-bottom: 0.25rem;
        }
        /* 불릿/번호 리스트 */
        .blocknote-viewer [data-content-type="bulletListItem"],
        .blocknote-viewer [data-content-type="numberedListItem"] {
          padding-left: 1.5rem;
        }
      `}</style>
    </div>
  );
}

export default function BlockNoteViewer({ content, className = '' }: BlockNoteViewerProps) {
  // BlockNote JSON인지 확인하여 적절한 렌더러 선택
  const isJson = useMemo(() => isBlockNoteJson(content), [content]);

  if (isJson) {
    return (
      <div className={className}>
        <BlockNoteJsonViewer content={content} />
      </div>
    );
  }

  // 기존 텍스트/마크다운 데이터는 MarkdownRenderer로 fallback
  return <MarkdownRenderer content={content} className={className} />;
}

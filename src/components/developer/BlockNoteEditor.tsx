/**
 * BlockNoteEditor - BlockNote 기반 블록 에디터
 * 노션 스타일 블록 편집, > 입력 시 토글 블록 생성
 *
 * Uncontrolled 패턴: 에디터 내부 상태 관리, 외부에서는 ref로 값 추출
 */
import { useEffect, useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { PartialBlock } from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';

// 외부에서 에디터 값을 가져올 수 있는 ref 인터페이스
export interface BlockNoteEditorRef {
  getContent: () => string;
  isEmpty: () => boolean;
}

interface BlockNoteEditorProps {
  initialContent?: string; // JSON string or plain text (최초 1회만 사용)
}

const BlockNoteEditorComponent = forwardRef<BlockNoteEditorRef, BlockNoteEditorProps>(
  ({ initialContent }, ref) => {
    const editorContainerRef = useRef<HTMLDivElement>(null);

    // 초기 콘텐츠 파싱 (최초 1회만)
    const parsedInitialContent = useMemo(() => {
      if (!initialContent) return undefined;
      try {
        const parsed = JSON.parse(initialContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed as PartialBlock[];
        }
      } catch {
        // JSON이 아닌 경우 텍스트로 처리
        if (initialContent.trim()) {
          return [
            {
              type: 'paragraph' as const,
              content: initialContent,
            },
          ];
        }
      }
      return undefined;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // 의도적으로 deps 비움 - 최초 1회만 파싱

    // 에디터 생성
    const editor = useCreateBlockNote({
      initialContent: parsedInitialContent,
    });

    // 외부에서 접근할 수 있는 메서드 노출
    useImperativeHandle(ref, () => ({
      getContent: () => {
        const blocks = editor.document;
        return JSON.stringify(blocks);
      },
      isEmpty: () => {
        const blocks = editor.document;
        // 블록이 1개이고, paragraph 타입이며, content가 비어있으면 empty
        if (blocks.length === 0) return true;
        if (blocks.length === 1) {
          const block = blocks[0];
          if (block.type === 'paragraph') {
            const content = block.content;
            if (!content || (Array.isArray(content) && content.length === 0)) {
              return true;
            }
            // content가 빈 텍스트인 경우
            if (Array.isArray(content) && content.length === 1) {
              const firstItem = content[0] as { type: string; text?: string };
              if (firstItem.type === 'text' && (!firstItem.text || firstItem.text.trim() === '')) {
                return true;
              }
            }
          }
        }
        return false;
      },
    }), [editor]);

    // ">" + 스페이스로 토글 블록 변환 처리
    useEffect(() => {
      const container = editorContainerRef.current;
      if (!container) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === ' ') {
          try {
            const currentBlock = editor.getTextCursorPosition().block;
            const content = currentBlock.content;

            // content가 배열이고 첫 번째 요소가 텍스트인 경우
            if (Array.isArray(content) && content.length > 0) {
              const firstItem = content[0] as { type: string; text?: string };
              if (firstItem.type === 'text' && firstItem.text === '>') {
                event.preventDefault();
                event.stopPropagation();

                // 토글 블록으로 변환
                editor.updateBlock(currentBlock, {
                  type: 'toggleListItem',
                  content: [],
                });
              }
            }
          } catch {
            // 에러 무시 (에디터가 아직 준비되지 않은 경우)
          }
        }
      };

      // 컨테이너 내부의 에디터 요소에 이벤트 리스너 추가
      const editorElement = container.querySelector('.bn-editor');
      if (editorElement) {
        editorElement.addEventListener('keydown', handleKeyDown as EventListener, true);
      }

      return () => {
        if (editorElement) {
          editorElement.removeEventListener('keydown', handleKeyDown as EventListener, true);
        }
      };
    }, [editor]);

    return (
      <div
        ref={editorContainerRef}
        className="blocknote-editor-wrapper border border-gray-300 rounded-lg overflow-hidden"
      >
        <BlockNoteView
          editor={editor}
          theme="light"
        />

        {/* 커스텀 스타일 */}
        <style>{`
          .blocknote-editor-wrapper {
            min-height: 200px;
          }
          .blocknote-editor-wrapper .bn-editor {
            padding: 12px;
            min-height: 180px;
          }
          .blocknote-editor-wrapper .bn-block-content {
            font-size: 14px;
          }
          /* 토글 블록 스타일 */
          .blocknote-editor-wrapper [data-content-type="toggleListItem"] {
            background: #f8fafc;
            border-radius: 6px;
            margin: 4px 0;
          }
        `}</style>
      </div>
    );
  }
);

BlockNoteEditorComponent.displayName = 'BlockNoteEditorComponent';

export default BlockNoteEditorComponent;

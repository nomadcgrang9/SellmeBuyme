/**
 * RichTextEditor - 공지사항용 리치 텍스트 에디터
 * 툴바: B(굵게), H1, H2, H3, 글머리 목록, 색상
 * 슬래시 커맨드: / 입력 시 토글 블록 생성
 */
import { useState, useRef, useEffect } from 'react';
import { Bold, Heading1, Heading2, Heading3, List, ChevronDown, Palette } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

const COLORS = [
  { name: '빨강', value: 'red', bg: 'bg-red-500' },
  { name: '파랑', value: 'blue', bg: 'bg-blue-500' },
  { name: '초록', value: 'green', bg: 'bg-green-500' },
  { name: '노랑', value: 'yellow', bg: 'bg-yellow-500' },
  { name: '회색', value: 'gray', bg: 'bg-gray-500' },
];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '내용을 입력하세요...',
  rows = 8,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showToggleMenu, setShowToggleMenu] = useState(false);
  const [toggleMenuPosition, setToggleMenuPosition] = useState({ top: 0, left: 0 });
  const [slashPosition, setSlashPosition] = useState<number | null>(null);

  // 선택된 텍스트 가져오기
  const getSelection = () => {
    const textarea = textareaRef.current;
    if (!textarea) return { start: 0, end: 0, text: '' };
    return {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      text: value.substring(textarea.selectionStart, textarea.selectionEnd),
    };
  };

  // 텍스트 감싸기 (굵게, 색상 등)
  const wrapSelection = (before: string, after: string) => {
    const { start, end, text } = getSelection();
    const newValue = value.substring(0, start) + before + text + after + value.substring(end);
    onChange(newValue);

    // 커서 위치 조정
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newPosition = start + before.length + text.length + after.length;
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // 줄 앞에 prefix 추가 (제목, 목록)
  const addLinePrefix = (prefix: string) => {
    const { start } = getSelection();

    // 현재 줄의 시작 위치 찾기
    let lineStart = start;
    while (lineStart > 0 && value[lineStart - 1] !== '\n') {
      lineStart--;
    }

    // 현재 줄의 끝 위치 찾기
    let lineEnd = start;
    while (lineEnd < value.length && value[lineEnd] !== '\n') {
      lineEnd++;
    }

    // 현재 줄 내용
    const currentLine = value.substring(lineStart, lineEnd);

    // 기존 prefix 제거 (# 또는 - 로 시작하는 경우)
    const cleanedLine = currentLine.replace(/^(#{1,3}\s*|-\s*)/, '');

    // 새 prefix 추가
    const newLine = prefix + cleanedLine;
    const newValue = value.substring(0, lineStart) + newLine + value.substring(lineEnd);
    onChange(newValue);

    // 커서 위치 조정
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const newPosition = lineStart + newLine.length;
        textarea.focus();
        textarea.setSelectionRange(newPosition, newPosition);
      }
    }, 0);
  };

  // 토글 블록 삽입
  const insertToggle = () => {
    const position = slashPosition ?? getSelection().start;

    // / 문자 제거하고 토글 삽입
    let insertPosition = position;
    let newValue = value;

    if (slashPosition !== null) {
      // / 문자 제거
      newValue = value.substring(0, slashPosition) + value.substring(slashPosition + 1);
      insertPosition = slashPosition;
    }

    const toggleTemplate = `<details>\n<summary>토글 제목</summary>\n\n토글 내용을 입력하세요...\n\n</details>`;
    newValue = newValue.substring(0, insertPosition) + toggleTemplate + newValue.substring(insertPosition);
    onChange(newValue);

    setShowToggleMenu(false);
    setSlashPosition(null);

    // 커서를 "토글 제목" 위치로
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const summaryStart = insertPosition + '<details>\n<summary>'.length;
        const summaryEnd = summaryStart + '토글 제목'.length;
        textarea.focus();
        textarea.setSelectionRange(summaryStart, summaryEnd);
      }
    }, 0);
  };

  // 키 입력 감지 (/ 입력 시 토글 메뉴)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // ESC로 메뉴 닫기
    if (e.key === 'Escape' && showToggleMenu) {
      setShowToggleMenu(false);
      setSlashPosition(null);
      return;
    }

    // Enter로 토글 선택
    if (e.key === 'Enter' && showToggleMenu) {
      e.preventDefault();
      insertToggle();
      return;
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;

    onChange(newValue);

    // / 입력 감지 (새 줄 시작이거나 공백 뒤)
    if (cursorPosition > 0) {
      const charBefore = newValue[cursorPosition - 1];
      const charBeforeThat = cursorPosition > 1 ? newValue[cursorPosition - 2] : '\n';

      if (charBefore === '/' && (charBeforeThat === '\n' || charBeforeThat === ' ' || cursorPosition === 1)) {
        // 토글 메뉴 표시
        const textarea = textareaRef.current;
        if (textarea) {
          // 대략적인 메뉴 위치 계산
          const lineHeight = 24;
          const lines = newValue.substring(0, cursorPosition).split('\n').length;
          setToggleMenuPosition({
            top: Math.min(lines * lineHeight, textarea.offsetHeight - 50),
            left: 20,
          });
          setShowToggleMenu(true);
          setSlashPosition(cursorPosition - 1);
        }
      } else if (showToggleMenu && charBefore !== '/') {
        // 다른 문자 입력 시 메뉴 닫기
        setShowToggleMenu(false);
        setSlashPosition(null);
      }
    }
  };

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = () => {
      setShowColorMenu(false);
      setShowToggleMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#a8c5e0] focus-within:border-transparent">
      {/* 툴바 */}
      <div className="flex items-center gap-1 p-2 bg-gray-50 border-b border-gray-200">
        {/* 굵게 */}
        <button
          type="button"
          onClick={() => wrapSelection('**', '**')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          title="굵게 (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* H1 큰 제목 */}
        <button
          type="button"
          onClick={() => addLinePrefix('# ')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          title="큰 제목"
        >
          <Heading1 className="w-4 h-4" />
        </button>

        {/* H2 중간 제목 */}
        <button
          type="button"
          onClick={() => addLinePrefix('## ')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          title="중간 제목"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        {/* H3 작은 제목 */}
        <button
          type="button"
          onClick={() => addLinePrefix('### ')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          title="작은 제목"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* 글머리 목록 */}
        <button
          type="button"
          onClick={() => addLinePrefix('- ')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
          title="글머리 목록"
        >
          <List className="w-4 h-4" />
        </button>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* 색상 */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowColorMenu(!showColorMenu);
            }}
            className="flex items-center gap-1 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded transition-colors"
            title="텍스트 색상"
          >
            <Palette className="w-4 h-4" />
            <ChevronDown className="w-3 h-3" />
          </button>

          {showColorMenu && (
            <div
              className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1"
              onClick={(e) => e.stopPropagation()}
            >
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => {
                    wrapSelection(`::${color.value}::`, '::');
                    setShowColorMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100"
                >
                  <span className={`w-3 h-3 rounded-full ${color.bg}`} />
                  {color.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 토글 안내 */}
        <span className="ml-auto text-xs text-gray-400">
          / 입력 → 토글 블록
        </span>
      </div>

      {/* 텍스트 영역 */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 resize-none focus:outline-none"
        />

        {/* 토글 메뉴 (/ 입력 시) */}
        {showToggleMenu && (
          <div
            className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1"
            style={{ top: toggleMenuPosition.top, left: toggleMenuPosition.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={insertToggle}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-blue-50 hover:text-blue-700"
            >
              <ChevronDown className="w-4 h-4" />
              <span>토글 블록</span>
              <span className="ml-auto text-xs text-gray-400">접기/펼치기</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

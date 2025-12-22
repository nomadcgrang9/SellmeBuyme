/**
 * MarkdownRenderer - 마크다운 + 커스텀 문법 렌더러
 * 지원: 제목(H1~H3), 굵게, 글머리 목록, 토글(details), 색상(::color::)
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// 빈 줄 보존하면서 마크다운 블록 요소는 유지
// 마크다운 블록 요소(제목, 목록, URL, HTML태그) 앞의 빈줄은 그대로 두고
// 일반 텍스트 사이 빈줄만 <br>로 변환
function preserveEmptyLines(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];

    // 현재 줄이 빈 줄이고, 다음 줄이 마크다운 블록 요소가 아닌 경우만 <br> 삽입
    if (line.trim() === '' && nextLine !== undefined) {
      const isNextBlockElement =
        /^#{1,6}\s/.test(nextLine) ||           // 제목 (#, ##, ### 등)
        /^-\s/.test(nextLine) ||                 // 목록
        /^https?:\/\//.test(nextLine.trim()) ||  // URL
        /^</.test(nextLine.trim()) ||            // HTML 태그
        nextLine.trim() === '';                  // 연속 빈줄

      if (isNextBlockElement) {
        result.push('');  // 빈 줄 유지
      } else {
        result.push('<br>');  // 일반 텍스트 앞은 <br>
      }
    } else {
      result.push(line);
    }
  }

  return result.join('\n');
}

// 커스텀 색상 문법 처리: ::red::텍스트:: → <span style="color:red">텍스트</span>
// 빈 텍스트 처리 추가: ::red:::: 같은 경우도 처리
function processCustomSyntax(content: string): string {
  // 색상 문법: ::color::텍스트:: (텍스트가 있는 경우)
  const colorPattern = /::(\w+)::([^:]+)::/g;
  let processed = content.replace(colorPattern, (_, color, text) => {
    const colorMap: Record<string, string> = {
      red: '#ef4444',
      blue: '#3b82f6',
      green: '#22c55e',
      yellow: '#eab308',
      gray: '#6b7280',
    };
    const hexColor = colorMap[color] || color;
    return `<span style="color:${hexColor}">${text}</span>`;
  });

  // 잘못된 색상 문법 제거: ::color:::: 또는 ::color:: 만 있는 경우
  processed = processed.replace(/::(\w+)::::/g, '');
  processed = processed.replace(/::(\w+)::/g, '');

  return processed;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // 1. 빈 줄 보존 (블록 요소 앞은 유지, 일반 텍스트 앞은 <br>)
  // 2. 커스텀 문법 처리 (색상 등)
  const withPreservedLines = preserveEmptyLines(content);
  const processedContent = processCustomSyntax(withPreservedLines);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={{
          // 제목 스타일
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-gray-900 mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-gray-800 mt-3 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-gray-700 mt-2 mb-1 first:mt-0">{children}</h3>
          ),
          // 굵은 텍스트
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900">{children}</strong>
          ),
          // 목록
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="text-gray-700">{children}</li>
          ),
          // 링크
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              {children}
            </a>
          ),
          // 코드 블록
          code: ({ children, className }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block p-3 bg-gray-100 text-gray-800 rounded-lg text-sm font-mono overflow-x-auto my-2">
                {children}
              </code>
            );
          },
          // 단락
          p: ({ children }) => (
            <p className="text-gray-700 my-1 leading-relaxed">{children}</p>
          ),
        }}
        // HTML 태그 렌더링 (details, summary, span 등)
        rehypePlugins={[rehypeRaw]}
      >
        {processedContent}
      </ReactMarkdown>

      {/* details/summary 스타일 (CSS로 처리) */}
      <style>{`
        .markdown-content details {
          margin: 0.5rem 0;
          padding: 0.75rem;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
        }
        .markdown-content details summary {
          cursor: pointer;
          font-weight: 600;
          color: #374151;
          list-style: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .markdown-content details summary::-webkit-details-marker {
          display: none;
        }
        .markdown-content details summary::before {
          content: '▶';
          font-size: 0.75rem;
          transition: transform 0.2s;
        }
        .markdown-content details[open] summary::before {
          transform: rotate(90deg);
        }
        .markdown-content details[open] > *:not(summary) {
          margin-top: 0.75rem;
          padding-left: 1.25rem;
          border-left: 2px solid #e2e8f0;
        }
      `}</style>
    </div>
  );
}

/**
 * MarkdownRenderer - 마크다운 + 커스텀 문법 렌더러
 * 지원: 제목(H1~H3), 굵게, 글머리 목록, 토글(details), 색상(::color::)
 */
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// 커스텀 색상 문법 처리: ::red::텍스트:: → <span style="color:red">텍스트</span>
function processCustomSyntax(content: string): string {
  // 색상 문법: ::color::텍스트::
  const colorPattern = /::(\w+)::([^:]+)::/g;
  return content.replace(colorPattern, (_, color, text) => {
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
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // 커스텀 문법 먼저 처리
  const processedContent = processCustomSyntax(content);

  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
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
        // HTML 태그 허용 (details, summary, span 등)
        rehypePlugins={[]}
        skipHtml={false}
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

import { ReactNode } from 'react';

/**
 * 텍스트에서 URL을 감지하여 클릭 가능한 링크로 변환합니다.
 * @param text - 변환할 텍스트
 * @returns React 노드 배열 (텍스트와 링크 혼합)
 */
export function linkifyText(text: string): ReactNode[] {
  if (!text) return [];

  // URL 정규식: http:// 또는 https://로 시작하는 URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  // 모든 URL 매치 찾기
  while ((match = urlRegex.exec(text)) !== null) {
    const url = match[0];
    const startIndex = match.index;

    // URL 이전의 텍스트 추가
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    // URL을 링크로 추가
    parts.push(
      <a
        key={`link-${startIndex}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-700 hover:underline break-all"
        title={url}
      >
        {url}
      </a>
    );

    lastIndex = startIndex + url.length;
  }

  // 마지막 URL 이후의 텍스트 추가
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  // URL이 없으면 원본 텍스트 반환
  return parts.length === 0 ? [text] : parts;
}

/**
 * 텍스트에서 URL을 감지하여 마크업 형식으로 변환합니다.
 * @param text - 변환할 텍스트
 * @returns 마크업이 적용된 문자열
 */
export function linkifyTextToHtml(text: string): string {
  if (!text) return '';

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 hover:underline">$1</a>'
  );
}

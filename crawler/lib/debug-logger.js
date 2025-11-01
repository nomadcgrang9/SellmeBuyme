/**
 * 디버깅용 상세 로그 함수
 */
export function debugLog(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[DEBUG][${timestamp}] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

export function logDetailContent(title, content) {
  console.log(`\n========== 본문 내용 디버깅 ==========`);
  console.log(`제목: ${title}`);
  console.log(`본문 길이: ${content?.length || 0}자`);
  console.log(`본문 앞 500자:\n${content?.substring(0, 500) || '(없음)'}`);
  console.log(`본문 뒤 500자:\n${content?.substring(content.length - 500) || '(없음)'}`);
  console.log(`=======================================\n`);
}

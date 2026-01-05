/**
 * PWA 환경 감지 유틸리티
 * 개발자노트(/note) 전용
 */

// 카카오톡 인앱 브라우저 감지
export function isKakaoTalk(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('kakaotalk');
}

// iOS 감지
export function isIOS(): boolean {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

// Android 감지
export function isAndroid(): boolean {
  return /android/.test(navigator.userAgent.toLowerCase());
}

// PWA로 이미 실행 중인지 확인
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// 최초 방문 여부 (개발자노트 전용)
const VISITED_KEY = 'devnote_pwa_visited';

export function isFirstVisit(): boolean {
  return !localStorage.getItem(VISITED_KEY);
}

export function markVisited(): void {
  localStorage.setItem(VISITED_KEY, 'true');
}

// "다시 보지 않기" 설정
const DISMISSED_KEY = 'devnote_pwa_dismissed';

export function isDismissed(): boolean {
  return localStorage.getItem(DISMISSED_KEY) === 'true';
}

export function setDismissed(): void {
  localStorage.setItem(DISMISSED_KEY, 'true');
}

// 현재 브라우저 이름 반환
export function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (isKakaoTalk()) return '카카오톡';
  if (/CriOS/i.test(ua)) return 'Chrome (iOS)';
  if (/FxiOS/i.test(ua)) return 'Firefox (iOS)';
  if (/EdgiOS/i.test(ua)) return 'Edge (iOS)';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
  if (/Chrome/i.test(ua)) return 'Chrome';
  if (/Firefox/i.test(ua)) return 'Firefox';
  if (/Edge/i.test(ua)) return 'Edge';
  return '브라우저';
}

// Android에서 Chrome으로 열기 (Intent 스킴)
export function openInChrome(url: string): void {
  const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
  window.location.href = intentUrl;
}

// URL을 클립보드에 복사
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const result = document.execCommand('copy');
    document.body.removeChild(textarea);
    return result;
  }
}

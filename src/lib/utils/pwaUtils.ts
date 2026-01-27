/**
 * PWA 환경 감지 유틸리티
 * 메인 서비스(학교일자리)와 개발자노트(/note) 모두 지원
 * 참조: LID 프로젝트 (frontend/src/utils/pwaUtils.js)
 */

// ============================================
// 환경 감지 함수
// ============================================

// 카카오톡 인앱 브라우저 감지
export function isKakaoTalk(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('kakaotalk');
}

// 카카오톡 브라우저인지 확인 (별칭)
export function isKakaoTalkBrowser(): boolean {
  return isKakaoTalk();
}

// iOS 감지
export function isIOS(): boolean {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

// Android 감지
export function isAndroid(): boolean {
  return /android/.test(navigator.userAgent.toLowerCase());
}

// 모바일 기기인지 확인
export function isMobile(): boolean {
  return isIOS() || isAndroid() || window.innerWidth <= 768;
}

// PWA로 이미 실행 중인지 확인
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// PWA가 이미 설치되었는지 확인 (별칭)
export function isPWAInstalled(): boolean {
  return isStandalone();
}

// ============================================
// 경로 감지 함수
// ============================================

// 현재 경로가 개발자노트인지 확인
export function isDevNotePath(): boolean {
  return window.location.pathname.startsWith('/note');
}

// 현재 URL 가져오기
export function getCurrentURL(): string {
  return window.location.href;
}

// ============================================
// 방문 기록 관리 (경로별 분리)
// ============================================

// 개발자노트용 키
const DEVNOTE_VISITED_KEY = 'devnote_pwa_visited';
const DEVNOTE_DISMISSED_KEY = 'devnote_pwa_dismissed';

// 메인 서비스용 키
const MAIN_VISITED_KEY = 'main_pwa_visited';
const MAIN_DISMISSED_KEY = 'main_pwa_dismissed';

// 현재 경로에 맞는 키 반환
function getVisitedKey(): string {
  return isDevNotePath() ? DEVNOTE_VISITED_KEY : MAIN_VISITED_KEY;
}

function getDismissedKey(): string {
  return isDevNotePath() ? DEVNOTE_DISMISSED_KEY : MAIN_DISMISSED_KEY;
}

// 최초 방문 여부 (경로별)
export function isFirstVisit(): boolean {
  return !localStorage.getItem(getVisitedKey());
}

// 진짜 최초 방문인지 확인 (localStorage + sessionStorage)
export function isTrueFirstVisit(): boolean {
  const key = getVisitedKey();
  const hasVisited = localStorage.getItem(key);
  const currentSession = sessionStorage.getItem(`${key}_session`);
  return hasVisited === null && currentSession === null;
}

export function markVisited(): void {
  const key = getVisitedKey();
  localStorage.setItem(key, 'true');
  sessionStorage.setItem(`${key}_session`, 'true');
}

// "다시 보지 않기" 설정
export function isDismissed(): boolean {
  return localStorage.getItem(getDismissedKey()) === 'true';
}

export function setDismissed(): void {
  localStorage.setItem(getDismissedKey(), 'true');
}

// ============================================
// 브라우저 정보
// ============================================

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

// ============================================
// 외부 브라우저 열기 (카카오톡 대응)
// ============================================

// Android에서 Chrome으로 열기 (Intent 스킴)
export function openInChrome(url: string): void {
  const intentUrl = `intent://${url.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
  window.location.href = intentUrl;
}

// 외부 브라우저로 열기 시도 (LID 패턴)
export function openInExternalBrowser(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (isIOS()) {
      // iOS: 클립보드 복사 후 Safari 검색창 열기 시도
      navigator.clipboard
        .writeText(url)
        .then(() => {
          window.location.href = 'x-web-search://';
          resolve('clipboard_success');
        })
        .catch(() => {
          reject('clipboard_denied');
        });
    } else if (isAndroid()) {
      // Android: Intent로 외부 브라우저 열기
      const cleanUrl = url.replace(/^https?:\/\//, '');
      const intent =
        `intent://${cleanUrl}#Intent;` +
        `scheme=https;` +
        `action=android.intent.action.VIEW;` +
        `category=android.intent.category.BROWSABLE;` +
        `end;`;

      window.location.href = intent;

      // 2초 후 확인 (페이지가 숨겨졌으면 성공)
      setTimeout(() => {
        if (document.hidden) {
          resolve('success');
        } else {
          reject('fallback_needed');
        }
      }, 2000);
    } else {
      reject('not_mobile');
    }
  });
}

// ============================================
// 클립보드
// ============================================

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

// ============================================
// PWA 설치 프롬프트 관리
// ============================================

/**
 * PWA 설치 프롬프트 이벤트 타입
 */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * beforeinstallprompt 이벤트 저장용 전역 변수
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Window 타입 확장 (index.html에서 조기 캐치한 이벤트용)
declare global {
  interface Window {
    __PWA_DEFERRED_PROMPT__: BeforeInstallPromptEvent | null;
    __PWA_PROMPT_CAPTURED__: boolean;
  }
}

/**
 * beforeinstallprompt 이벤트 저장
 */
export function setDeferredPrompt(event: BeforeInstallPromptEvent | null): void {
  deferredPrompt = event;
  // 전역에도 저장 (동기화)
  if (typeof window !== 'undefined') {
    window.__PWA_DEFERRED_PROMPT__ = event;
  }
}

/**
 * 저장된 beforeinstallprompt 이벤트 가져오기
 * index.html에서 조기 캐치한 이벤트도 확인
 */
export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  // 먼저 로컬 변수 확인
  if (deferredPrompt) {
    return deferredPrompt;
  }
  // 전역 변수 확인 (index.html에서 조기 캐치)
  if (typeof window !== 'undefined' && window.__PWA_DEFERRED_PROMPT__) {
    deferredPrompt = window.__PWA_DEFERRED_PROMPT__;
    return deferredPrompt;
  }
  return null;
}

/**
 * PWA 설치 가능 여부 확인
 */
export function canInstallPWA(): boolean {
  return getDeferredPrompt() !== null;
}

/**
 * PWA 설치 프롬프트 표시
 */
export async function showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = getDeferredPrompt();
  if (!prompt) {
    return 'unavailable';
  }

  // 설치 프롬프트 표시
  prompt.prompt();

  // 사용자 선택 대기
  const { outcome } = await prompt.userChoice;

  // 사용된 프롬프트 초기화 (재사용 불가)
  deferredPrompt = null;
  if (typeof window !== 'undefined') {
    window.__PWA_DEFERRED_PROMPT__ = null;
  }

  return outcome;
}

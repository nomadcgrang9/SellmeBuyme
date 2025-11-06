/**
 * 원격 에러 로깅 유틸리티
 * 모바일에서 발생하는 오류를 추적하기 위한 로거
 */

interface ErrorLog {
  timestamp: string;
  userAgent: string;
  url: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  deviceInfo: {
    isMobile: boolean;
    platform: string;
    screenSize: string;
    connection?: string;
  };
}

/**
 * 에러를 로컬스토리지에 저장 (서버 전송 실패 시 백업)
 */
function saveErrorToLocalStorage(errorLog: ErrorLog) {
  try {
    const existingLogs = localStorage.getItem('error_logs');
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    logs.push(errorLog);
    
    // 최대 50개까지만 저장
    if (logs.length > 50) {
      logs.shift();
    }
    
    localStorage.setItem('error_logs', JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save error to localStorage:', e);
  }
}

/**
 * 디바이스 정보 수집
 */
function getDeviceInfo() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  return {
    isMobile,
    platform: navigator.platform,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    connection: connection ? connection.effectiveType : 'unknown',
  };
}

/**
 * 에러를 Supabase에 저장 (원격 로깅)
 */
async function sendErrorToSupabase(errorLog: ErrorLog) {
  try {
    const response = await fetch('https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/error_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(errorLog),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send error log: ${response.status}`);
    }
  } catch (e) {
    console.error('Failed to send error to Supabase:', e);
    // 서버 전송 실패 시 로컬스토리지에 저장
    saveErrorToLocalStorage(errorLog);
  }
}

/**
 * 에러 로깅 메인 함수
 */
export function logError(error: Error | string, errorType: string = 'runtime') {
  const errorLog: ErrorLog = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    errorType,
    errorMessage: typeof error === 'string' ? error : error.message,
    stackTrace: typeof error === 'string' ? undefined : error.stack,
    deviceInfo: getDeviceInfo(),
  };
  
  // 콘솔에도 출력 (개발 환경)
  console.error('[ERROR LOG]', errorLog);
  
  // Supabase에 전송
  sendErrorToSupabase(errorLog);
}

/**
 * 네트워크 오류 로깅
 */
export function logNetworkError(url: string, status: number, statusText: string) {
  logError(
    `Network Error: ${status} ${statusText} at ${url}`,
    'network'
  );
}

/**
 * 페이지 로드 실패 로깅
 */
export function logPageLoadError() {
  logError(
    'Page failed to load completely',
    'page_load'
  );
}

/**
 * Service Worker 오류 로깅
 */
export function logServiceWorkerError(error: Error) {
  logError(error, 'service_worker');
}

/**
 * 로컬스토리지에 저장된 에러 로그 조회
 */
export function getLocalErrorLogs(): ErrorLog[] {
  try {
    const logs = localStorage.getItem('error_logs');
    return logs ? JSON.parse(logs) : [];
  } catch {
    return [];
  }
}

/**
 * 로컬스토리지 에러 로그 삭제
 */
export function clearLocalErrorLogs() {
  localStorage.removeItem('error_logs');
}

/**
 * Service Worker 에러 핸들러
 * PWA 환경에서 발생하는 네트워크 오류를 추적
 */

// Service Worker 에러 로깅
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
  logErrorToSupabase({
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: self.location.href,
    errorType: 'service_worker',
    errorMessage: event.error?.message || 'Service Worker error',
    stackTrace: event.error?.stack,
    deviceInfo: {
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      platform: 'Service Worker',
      screenSize: 'N/A',
      connection: 'unknown',
    },
  });
});

// Fetch 실패 로깅
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch((error) => {
      console.error('[SW] Fetch failed:', event.request.url, error);
      logErrorToSupabase({
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: event.request.url,
        errorType: 'network',
        errorMessage: `Fetch failed: ${error.message}`,
        stackTrace: error.stack,
        deviceInfo: {
          isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
          platform: 'Service Worker',
          screenSize: 'N/A',
          connection: 'unknown',
        },
      });
      throw error;
    })
  );
});

// Supabase에 에러 로그 전송
async function logErrorToSupabase(errorLog) {
  try {
    await fetch('https://qpwnsvsiduvvqdijyxio.supabase.co/rest/v1/error_logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'YOUR_SUPABASE_ANON_KEY', // 환경변수로 대체 필요
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(errorLog),
    });
  } catch (e) {
    console.error('[SW] Failed to log error:', e);
  }
}

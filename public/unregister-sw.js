// Service Worker Unregister Script
// 이 파일은 오래된 Service Worker를 강제로 제거하고 캐시를 삭제합니다.

(async function unregisterServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return;
  }

  try {
    // 1. 등록된 모든 Service Worker 가져오기
    const registrations = await navigator.serviceWorker.getRegistrations();

    console.log(`🔧 Found ${registrations.length} service worker(s)`);

    // 2. 모든 Service Worker 언레지스터
    for (const registration of registrations) {
      const success = await registration.unregister();
      console.log(`${success ? '✅' : '❌'} Unregistered SW: ${registration.scope}`);
    }

    // 3. 모든 캐시 삭제
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log(`🗑️ Found ${cacheNames.length} cache(s): ${cacheNames.join(', ')}`);

      for (const cacheName of cacheNames) {
        const deleted = await caches.delete(cacheName);
        console.log(`${deleted ? '✅' : '❌'} Deleted cache: ${cacheName}`);
      }
    }

    // 4. 페이지 새로고침
    console.log('🔄 Service Worker unregistered and caches cleared. Reloading...');

    // 5초 후 새로고침 (콘솔 로그 확인 시간 제공)
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    console.error('❌ Failed to unregister service worker:', error);
  }
})();

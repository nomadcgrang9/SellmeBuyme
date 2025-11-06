// Environment Snapshot - 에러 발생 순간의 전체 환경 정보 캡처

export interface EnvironmentSnapshot {
  // 디바이스
  userAgent: string;
  platform: string;
  screenSize: string;
  deviceMemory?: number;
  hardwareConcurrency?: number;

  // 네트워크
  networkType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  online: boolean;

  // 브라우저
  cookiesEnabled: boolean;
  language: string;
  languages: readonly string[];

  // 성능
  timeOrigin: number;
  loadTime?: number;
  domContentLoaded?: number;

  // Service Worker
  serviceWorkerStatus?: 'none' | 'installing' | 'installed' | 'activating' | 'activated' | 'redundant';
  serviceWorkerVersion?: string;

  // Cloudflare (응답 헤더에서 추출)
  cfRay?: string;
  cfCacheStatus?: string;

  // 시간
  timestamp: number;
  timezone: string;

  // 배터리
  batteryLevel?: number;
  charging?: boolean;

  // 추가 정보
  devicePixelRatio: number;
  touchSupport: boolean;
  maxTouchPoints: number;
}

export async function captureEnvironment(): Promise<EnvironmentSnapshot> {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const serviceWorker = navigator.serviceWorker?.controller;

  // 배터리 정보 (지원되는 경우)
  let batteryInfo: { batteryLevel?: number; charging?: boolean } = {};
  try {
    const battery = await (navigator as any).getBattery?.();
    if (battery) {
      batteryInfo = {
        batteryLevel: Math.round(battery.level * 100),
        charging: battery.charging,
      };
    }
  } catch {
    // 배터리 API 미지원
  }

  // 성능 메트릭
  let performanceInfo: { loadTime?: number; domContentLoaded?: number } = {};
  try {
    const timing = performance.timing;
    if (timing && timing.loadEventEnd > 0) {
      performanceInfo = {
        loadTime: timing.loadEventEnd - timing.navigationStart,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
      };
    }
  } catch {
    // 성능 API 미지원
  }

  return {
    // 디바이스
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    deviceMemory: (navigator as any).deviceMemory,
    hardwareConcurrency: navigator.hardwareConcurrency,

    // 네트워크
    networkType: connection?.type,
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: connection?.saveData,
    online: navigator.onLine,

    // 브라우저
    cookiesEnabled: navigator.cookieEnabled,
    language: navigator.language,
    languages: navigator.languages,

    // 성능
    timeOrigin: performance.timeOrigin,
    ...performanceInfo,

    // Service Worker
    serviceWorkerStatus: (serviceWorker?.state as 'installing' | 'installed' | 'activating' | 'activated' | 'redundant') || 'none',

    // 시간
    timestamp: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

    // 배터리
    ...batteryInfo,

    // 추가 정보
    devicePixelRatio: window.devicePixelRatio,
    touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    maxTouchPoints: navigator.maxTouchPoints,
  };
}

// 성능 메트릭 수집 (Web Vitals)
export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  ttfb?: number; // Time to First Byte
}

export function capturePerformanceMetrics(): PerformanceMetrics {
  const metrics: PerformanceMetrics = {};

  try {
    // TTFB
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationTiming) {
      metrics.ttfb = navigationTiming.responseStart - navigationTiming.requestStart;
    }

    // FCP
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      metrics.fcp = fcpEntry.startTime;
    }

    // LCP (PerformanceObserver가 이미 수집했다면)
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    if (lcpEntries.length > 0) {
      const lcpEntry = lcpEntries[lcpEntries.length - 1] as any;
      metrics.lcp = lcpEntry.startTime;
    }

    // CLS (PerformanceObserver가 이미 수집했다면)
    const layoutShiftEntries = performance.getEntriesByType('layout-shift') as any[];
    if (layoutShiftEntries.length > 0) {
      metrics.cls = layoutShiftEntries
        .filter((entry) => !entry.hadRecentInput)
        .reduce((sum, entry) => sum + entry.value, 0);
    }
  } catch (err) {
    console.error('Performance metrics capture failed:', err);
  }

  return metrics;
}

// 디바이스 타입 감지
export function getDeviceType(): 'mobile' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /iphone|ipad|ipod|android|blackberry|windows phone|webos/i.test(ua);
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua);
  const isSmallScreen = window.innerWidth < 768;

  return isMobile || isTablet || isSmallScreen ? 'mobile' : 'desktop';
}

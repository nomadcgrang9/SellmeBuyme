// Breadcrumb Tracker - 사용자 행동 추적 시스템

export interface Breadcrumb {
  timestamp: number;
  type: 'navigation' | 'network' | 'user_action' | 'lifecycle' | 'cache' | 'error';
  message: string;
  data?: Record<string, any>;
}

class BreadcrumbTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50; // 최근 50개만 유지

  add(type: Breadcrumb['type'], message: string, data?: any) {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      type,
      message,
      data,
    });

    // 최대 개수 초과 시 오래된 것 삭제
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  getRecentBreadcrumbs(count: number = 10): Breadcrumb[] {
    return this.breadcrumbs.slice(-count);
  }

  clear() {
    this.breadcrumbs = [];
  }

  // 특정 타입만 가져오기
  getBreadcrumbsByType(type: Breadcrumb['type']): Breadcrumb[] {
    return this.breadcrumbs.filter((bc) => bc.type === type);
  }

  // 특정 시간 이후의 breadcrumbs
  getBreadcrumbsSince(timestamp: number): Breadcrumb[] {
    return this.breadcrumbs.filter((bc) => bc.timestamp >= timestamp);
  }
}

export const breadcrumb = new BreadcrumbTracker();

// 자동 추적 설정
export function setupBreadcrumbTracking() {
  // 1. 페이지 이동 추적 (React Router)
  if (typeof window !== 'undefined') {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      breadcrumb.add('navigation', `Navigated to ${args[2] || location.pathname}`);
      return originalPushState.apply(this, args);
    };

    history.replaceState = function (...args) {
      breadcrumb.add('navigation', `Replaced state to ${args[2] || location.pathname}`);
      return originalReplaceState.apply(this, args);
    };

    window.addEventListener('popstate', () => {
      breadcrumb.add('navigation', `Back/Forward to ${location.pathname}`);
    });
  }

  // 2. 앱 생명주기 추적
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', () => {
      breadcrumb.add('lifecycle', 'App returned to foreground');
    });

    window.addEventListener('blur', () => {
      breadcrumb.add('lifecycle', 'App went to background');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        breadcrumb.add('lifecycle', 'Page hidden');
      } else {
        breadcrumb.add('lifecycle', 'Page visible');
      }
    });

    // 페이지 로드
    window.addEventListener('load', () => {
      breadcrumb.add('lifecycle', 'Page loaded');
    });

    // 페이지 언로드
    window.addEventListener('beforeunload', () => {
      breadcrumb.add('lifecycle', 'Page unloading');
    });
  }

  // 3. 네트워크 상태 변화
  if (typeof navigator !== 'undefined' && 'connection' in navigator) {
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', () => {
        breadcrumb.add('network', `Network changed to ${connection.effectiveType}`, {
          type: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
        });
      });
    }
  }

  // 4. 온라인/오프라인 상태
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      breadcrumb.add('network', 'Network online');
    });

    window.addEventListener('offline', () => {
      breadcrumb.add('network', 'Network offline');
    });
  }

  console.log('✅ Breadcrumb tracking enabled');
}

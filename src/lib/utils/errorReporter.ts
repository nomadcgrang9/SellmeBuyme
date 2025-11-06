// Error Reporter - 통합 에러 리포트 생성 및 저장

import { storageManager } from './storageManager';
import { breadcrumb } from './breadcrumb';
import { networkMonitor } from './networkMonitor';
import { captureEnvironment, capturePerformanceMetrics, getDeviceType } from './environmentSnapshot';

export interface ComprehensiveErrorReport {
  // 기본 에러 정보
  errorType: 'network' | 'script' | 'page_load' | 'service_worker' | 'app_lifecycle' | 'unknown';
  errorMessage: string;
  errorStack?: string;

  // 환경 정보
  environment: any;

  // Breadcrumbs (최근 행동)
  breadcrumbs: any[];

  // 성능 메트릭
  performanceMetrics: any;

  // 네트워크 로그 (최근 20개)
  recentNetworkLogs: any[];

  // 현재 상태
  currentUrl: string;
  currentRoute?: string;

  // 추가 메타데이터
  timestamp: number;
  deviceType: 'mobile' | 'desktop';
  userAgent: string;
  screenSize: string;
  networkType?: string;
}

class ErrorReporter {
  private isInitialized = false;

  // 초기화
  async initialize() {
    if (this.isInitialized) return;

    console.log('🔧 Initializing Error Reporter...');

    // Breadcrumb 추적 시작
    const { setupBreadcrumbTracking } = await import('./breadcrumb');
    setupBreadcrumbTracking();

    // 네트워크 모니터링 시작
    networkMonitor.setup();

    // 앱 시작 시 백업 로그 재업로드
    await storageManager.retryUpload();

    this.isInitialized = true;
    console.log('✅ Error Reporter initialized');
  }

  // 에러 리포트 생성
  async createErrorReport(
    errorType: ComprehensiveErrorReport['errorType'],
    errorMessage: string,
    errorStack?: string,
    additionalData?: Record<string, any>
  ): Promise<ComprehensiveErrorReport> {
    const environment = await captureEnvironment();
    const performanceMetrics = capturePerformanceMetrics();

    return {
      errorType,
      errorMessage,
      errorStack,
      environment,
      breadcrumbs: breadcrumb.getRecentBreadcrumbs(20),
      performanceMetrics,
      recentNetworkLogs: networkMonitor.getRecentLogs(20),
      currentUrl: window.location.href,
      currentRoute: window.location.pathname,
      timestamp: Date.now(),
      deviceType: getDeviceType(),
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      networkType: (navigator as any).connection?.effectiveType,
      ...additionalData,
    };
  }

  // 에러 리포트 및 저장
  async reportError(
    errorType: ComprehensiveErrorReport['errorType'],
    errorMessage: string,
    errorStack?: string,
    additionalData?: Record<string, any>
  ) {
    try {
      const report = await this.createErrorReport(errorType, errorMessage, errorStack, additionalData);

      // 🚫 모바일이 아니면 저장하지 않음 (데스크톱은 콘솔에서 디버깅)
      if (report.deviceType !== 'mobile') {
        console.log('⏭️ Desktop error ignored (not saved):', errorMessage);
        return;
      }

      console.error('📱 Mobile Error Report:', {
        type: errorType,
        message: errorMessage,
        breadcrumbs: report.breadcrumbs.length,
        networkLogs: report.recentNetworkLogs.length,
      });

      // StorageManager를 통해 저장 (Supabase → LocalStorage → IndexedDB)
      await storageManager.saveError({
        errorType: report.errorType,
        errorMessage: report.errorMessage,
        errorStack: report.errorStack,
        url: report.currentUrl,
        userAgent: report.userAgent,
        deviceType: report.deviceType,
        screenSize: report.screenSize,
        networkType: report.networkType,
        environment: report.environment,
        breadcrumbs: report.breadcrumbs,
        networkLogs: report.recentNetworkLogs,
        performanceMetrics: report.performanceMetrics,
        timestamp: report.timestamp,
      });

      // Breadcrumb에도 기록
      breadcrumb.add('error', `Error reported: ${errorMessage}`);
    } catch (err) {
      console.error('Failed to report error:', err);
    }
  }

  // 전역 에러 핸들러 설정
  setupGlobalHandlers() {
    if (typeof window === 'undefined') return;

    // 1. JavaScript 에러
    window.addEventListener('error', (event) => {
      this.reportError(
        'script',
        event.message,
        event.error?.stack,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        }
      );
    });

    // 2. Promise Rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(
        'script',
        event.reason?.message || 'Unhandled Promise Rejection',
        event.reason?.stack
      );
    });

    // 3. 페이지 로드 타임아웃 감지
    let pageLoadTimeout: NodeJS.Timeout | null = null;
    const clearPageLoadTimeout = () => {
      if (pageLoadTimeout) {
        clearTimeout(pageLoadTimeout);
        pageLoadTimeout = null;
      }
    };

    window.addEventListener('DOMContentLoaded', clearPageLoadTimeout);
    window.addEventListener('load', clearPageLoadTimeout);

    // 5초 후에도 로드 안되면 에러
    pageLoadTimeout = setTimeout(() => {
      if (document.readyState !== 'complete') {
        this.reportError('page_load', 'Page load timeout (5s)');
      }
    }, 5000);

    console.log('✅ Global error handlers installed');
  }
}

export const errorReporter = new ErrorReporter();

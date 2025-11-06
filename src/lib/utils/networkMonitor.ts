// Network Monitor - 모든 네트워크 요청 추적

import { breadcrumb } from './breadcrumb';

export interface NetworkLog {
  url: string;
  method: string;
  status?: number;
  duration: number;
  success: boolean;
  error?: string;
  headers?: Record<string, string>;
  responseSize?: number;
  fromCache?: boolean;
  timestamp: number;
}

class NetworkMonitor {
  private networkLogs: NetworkLog[] = [];
  private maxLogs = 30; // 최근 30개만 유지
  private originalFetch?: typeof fetch;

  // fetch 래핑 시작
  setup() {
    if (typeof window === 'undefined' || this.originalFetch) {
      return; // 이미 설정됨 or 서버 환경
    }

    this.originalFetch = window.fetch;

    window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
      const startTime = performance.now();
      const url = typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : args[0].toString();
      const method = args[1]?.method || 'GET';

      breadcrumb.add('network', `Request: ${method} ${url}`);

      try {
        const response = await this.originalFetch!(...args);
        const duration = performance.now() - startTime;

        // 응답 헤더 추출
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });

        const networkLog: NetworkLog = {
          url,
          method,
          status: response.status,
          duration: Math.round(duration),
          success: response.ok,
          headers,
          fromCache: headers['cf-cache-status'] === 'HIT',
          timestamp: Date.now(),
        };

        this.addLog(networkLog);

        breadcrumb.add('network', `Response: ${method} ${url} (${response.status})`, {
          duration: Math.round(duration),
          status: response.status,
          cached: networkLog.fromCache,
        });

        return response;
      } catch (error) {
        const duration = performance.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        const networkLog: NetworkLog = {
          url,
          method,
          duration: Math.round(duration),
          success: false,
          error: errorMessage,
          timestamp: Date.now(),
        };

        this.addLog(networkLog);

        breadcrumb.add('network', `Failed: ${method} ${url}`, {
          error: errorMessage,
          duration: Math.round(duration),
        });

        throw error;
      }
    };

    console.log('✅ Network monitoring enabled');
  }

  // 로그 추가
  private addLog(log: NetworkLog) {
    this.networkLogs.push(log);

    // 최대 개수 초과 시 오래된 것 삭제
    if (this.networkLogs.length > this.maxLogs) {
      this.networkLogs.shift();
    }
  }

  // 모든 로그 가져오기
  getLogs(): NetworkLog[] {
    return [...this.networkLogs];
  }

  // 최근 N개 로그 가져오기
  getRecentLogs(count: number = 10): NetworkLog[] {
    return this.networkLogs.slice(-count);
  }

  // 실패한 요청만
  getFailedLogs(): NetworkLog[] {
    return this.networkLogs.filter((log) => !log.success);
  }

  // 특정 URL 패턴 로그
  getLogsByUrl(urlPattern: string): NetworkLog[] {
    return this.networkLogs.filter((log) => log.url.includes(urlPattern));
  }

  // 통계
  getStats() {
    const total = this.networkLogs.length;
    const failed = this.getFailedLogs().length;
    const avgDuration =
      this.networkLogs.reduce((sum, log) => sum + log.duration, 0) / total || 0;

    return {
      total,
      failed,
      success: total - failed,
      avgDuration: Math.round(avgDuration),
      successRate: total > 0 ? Math.round(((total - failed) / total) * 100) : 100,
    };
  }

  // 로그 초기화
  clear() {
    this.networkLogs = [];
  }

  // 원본 fetch 복원
  restore() {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = undefined;
      console.log('✅ Network monitoring disabled');
    }
  }
}

export const networkMonitor = new NetworkMonitor();

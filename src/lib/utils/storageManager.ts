// Storage Manager - 다중 백업 시스템
// 1차: Supabase → 2차: LocalStorage → 3차: IndexedDB

import { supabase } from '@/lib/supabase/client';

export interface ErrorReport {
  id: string;
  timestamp: number;
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  url: string;
  userAgent: string;
  deviceType: 'mobile' | 'desktop';
  screenSize: string;
  networkType?: string;
  environment?: any;
  breadcrumbs?: any[];
  networkLogs?: any[];
  performanceMetrics?: any;
  uploaded: boolean;
}

class StorageManager {
  private LOCALSTORAGE_KEY = 'sellmebuyme_error_logs';
  private INDEXEDDB_NAME = 'sellmebuyme_errors';
  private INDEXEDDB_VERSION = 1;
  private MAX_LOCALSTORAGE_ITEMS = 20;

  // 1차: Supabase에 저장
  async saveToSupabase(report: Omit<ErrorReport, 'id' | 'uploaded'>): Promise<boolean> {
    try {
      const { error } = await supabase.from('error_logs').insert({
        error_type: report.errorType,
        error_message: report.errorMessage,
        stack_trace: report.errorStack,
        url: report.url,
        user_agent: report.userAgent,
        device_info: {
          deviceType: report.deviceType,
          screenSize: report.screenSize,
        },
      });

      if (!error) {
        console.log('✅ Supabase 저장 성공');
        return true;
      } else {
        console.error('❌ Supabase 저장 실패:', error);
      }
    } catch (err) {
      console.error('❌ Supabase 저장 실패:', err);
    }
    return false;
  }

  // 2차: LocalStorage에 백업
  saveToLocalStorage(report: Omit<ErrorReport, 'uploaded'>): boolean {
    try {
      const stored = this.getLocalStorageLogs();
      const newReport: ErrorReport = {
        ...report,
        uploaded: false,
      };

      stored.push(newReport);

      // 최대 개수 초과 시 오래된 것 삭제
      if (stored.length > this.MAX_LOCALSTORAGE_ITEMS) {
        stored.shift();
      }

      localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(stored));
      console.log('✅ LocalStorage 백업 성공');
      return true;
    } catch (err) {
      console.error('❌ LocalStorage 저장 실패:', err);
      return false;
    }
  }

  // 3차: IndexedDB에 백업
  async saveToIndexedDB(report: Omit<ErrorReport, 'uploaded'>): Promise<boolean> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['errors'], 'readwrite');
      const store = transaction.objectStore('errors');

      const newReport: ErrorReport = {
        ...report,
        uploaded: false,
      };

      await new Promise((resolve, reject) => {
        const request = store.add(newReport);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      console.log('✅ IndexedDB 백업 성공');
      return true;
    } catch (err) {
      console.error('❌ IndexedDB 저장 실패:', err);
      return false;
    }
  }

  // IndexedDB 열기
  private openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.INDEXEDDB_NAME, this.INDEXEDDB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('errors')) {
          const objectStore = db.createObjectStore('errors', { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          objectStore.createIndex('uploaded', 'uploaded', { unique: false });
        }
      };
    });
  }

  // 통합 저장 (3단계 폴백)
  async saveError(report: Omit<ErrorReport, 'id' | 'uploaded'>): Promise<void> {
    const reportWithId = {
      ...report,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    // 1차: Supabase
    const supabaseSuccess = await this.saveToSupabase(reportWithId);

    if (supabaseSuccess) {
      return;
    }

    // 2차: LocalStorage
    const localSuccess = this.saveToLocalStorage(reportWithId);

    if (!localSuccess) {
      // 3차: IndexedDB
      await this.saveToIndexedDB(reportWithId);
    }
  }

  // LocalStorage에서 읽기
  getLocalStorageLogs(): ErrorReport[] {
    try {
      const stored = localStorage.getItem(this.LOCALSTORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  // IndexedDB에서 읽기
  async getIndexedDBLogs(): Promise<ErrorReport[]> {
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['errors'], 'readonly');
      const store = transaction.objectStore('errors');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }

  // 모든 로그 가져오기 (LocalStorage + IndexedDB)
  async getAllLogs(): Promise<ErrorReport[]> {
    const localLogs = this.getLocalStorageLogs();
    const indexedLogs = await this.getIndexedDBLogs();

    // 중복 제거 (id 기준)
    const allLogs = [...localLogs, ...indexedLogs];
    const uniqueLogs = Array.from(
      new Map(allLogs.map((log) => [log.id, log])).values()
    );

    // 최신순 정렬
    return uniqueLogs.sort((a, b) => b.timestamp - a.timestamp);
  }

  // 재업로드 (다음 접속 시 실행)
  async retryUpload(): Promise<void> {
    const localLogs = this.getLocalStorageLogs();
    const indexedLogs = await this.getIndexedDBLogs();

    const allPendingLogs = [...localLogs, ...indexedLogs].filter(
      (log) => !log.uploaded
    );

    console.log(`🔄 재업로드 시도: ${allPendingLogs.length}건`);

    for (const log of allPendingLogs) {
      const success = await this.saveToSupabase(log);
      if (success) {
        // LocalStorage/IndexedDB에서 삭제 또는 uploaded 플래그 변경
        this.markAsUploaded(log.id);
      }
    }
  }

  // 업로드 완료 표시
  private markAsUploaded(logId: string): void {
    // LocalStorage 업데이트
    const localLogs = this.getLocalStorageLogs();
    const updatedLogs = localLogs.map((log) =>
      log.id === logId ? { ...log, uploaded: true } : log
    );
    localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(updatedLogs));

    // IndexedDB 업데이트
    this.openIndexedDB().then((db) => {
      const transaction = db.transaction(['errors'], 'readwrite');
      const store = transaction.objectStore('errors');
      const request = store.get(logId);

      request.onsuccess = () => {
        const log = request.result;
        if (log) {
          log.uploaded = true;
          store.put(log);
        }
      };
    });
  }

  // 로그 삭제
  async clearLogs(): Promise<void> {
    // LocalStorage 삭제
    localStorage.removeItem(this.LOCALSTORAGE_KEY);

    // IndexedDB 삭제
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['errors'], 'readwrite');
      const store = transaction.objectStore('errors');
      store.clear();
      console.log('✅ 로그 삭제 완료');
    } catch (err) {
      console.error('❌ IndexedDB 삭제 실패:', err);
    }
  }

  // 업로드된 로그만 삭제
  async clearUploadedLogs(): Promise<void> {
    const allLogs = await this.getAllLogs();
    const uploadedLogs = allLogs.filter((log) => log.uploaded);

    // LocalStorage에서 삭제
    const localLogs = this.getLocalStorageLogs().filter((log) => !log.uploaded);
    localStorage.setItem(this.LOCALSTORAGE_KEY, JSON.stringify(localLogs));

    // IndexedDB에서 삭제
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(['errors'], 'readwrite');
      const store = transaction.objectStore('errors');

      for (const log of uploadedLogs) {
        store.delete(log.id);
      }

      console.log(`✅ 업로드된 로그 ${uploadedLogs.length}건 삭제`);
    } catch (err) {
      console.error('❌ IndexedDB 삭제 실패:', err);
    }
  }
}

export const storageManager = new StorageManager();

import { useState, useEffect } from 'react';

const EARLY_ACCESS_PATH = '/earlyteacher2026';
const EARLY_ACCESS_STORAGE_KEY = 'earlyAccess';

interface UseEarlyAccessReturn {
  /** Early Access 권한이 있는지 여부 */
  hasEarlyAccess: boolean;
  /** Early Access 경로로 접속했는지 (현재 세션) */
  isEarlyAccessPath: boolean;
  /** Early Access 권한 수동 설정 (테스트용) */
  setEarlyAccess: (value: boolean) => void;
}

/**
 * Early Access 권한을 관리하는 훅
 *
 * 사용 방법:
 * - `/earlyteacher2026` 경로로 접속하면 localStorage에 저장
 * - 이후 일반 경로(`/`)로 접속해도 등록 기능 사용 가능
 *
 * @returns {UseEarlyAccessReturn} Early Access 상태와 설정 함수
 */
export function useEarlyAccess(): UseEarlyAccessReturn {
  const [hasEarlyAccess, setHasEarlyAccess] = useState<boolean>(false);

  // 현재 경로가 Early Access 경로인지 확인
  const isEarlyAccessPath = window.location.pathname === EARLY_ACCESS_PATH;

  // 초기화: localStorage에서 Early Access 상태 로드
  useEffect(() => {
    const storedValue = localStorage.getItem(EARLY_ACCESS_STORAGE_KEY);
    if (storedValue === 'true') {
      setHasEarlyAccess(true);
    }
  }, []);

  // Early Access 경로 접속 시 localStorage에 저장
  useEffect(() => {
    if (isEarlyAccessPath) {
      localStorage.setItem(EARLY_ACCESS_STORAGE_KEY, 'true');
      setHasEarlyAccess(true);
      console.log('[Early Access] 활성화됨 - localStorage에 저장');
    }
  }, [isEarlyAccessPath]);

  // 수동 설정 함수 (테스트/디버깅용)
  const setEarlyAccess = (value: boolean) => {
    if (value) {
      localStorage.setItem(EARLY_ACCESS_STORAGE_KEY, 'true');
    } else {
      localStorage.removeItem(EARLY_ACCESS_STORAGE_KEY);
    }
    setHasEarlyAccess(value);
  };

  return {
    hasEarlyAccess,
    isEarlyAccessPath,
    setEarlyAccess,
  };
}

/**
 * Early Access 권한 확인 (컴포넌트 외부에서 사용)
 * 훅을 사용할 수 없는 상황에서 권한 확인용
 */
export function checkEarlyAccess(): boolean {
  return localStorage.getItem(EARLY_ACCESS_STORAGE_KEY) === 'true';
}

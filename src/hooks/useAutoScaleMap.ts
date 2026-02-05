/**
 * 자동 스케일업 훅
 *
 * 목적: 필터 결과가 부족할 때 자동으로 지도 범위를 확장하여
 *       사용자에게 충분한 검색 결과를 제공
 */

import { useState, useCallback, useRef } from 'react';
import {
  AUTO_SCALE_CONFIG,
  KOREA_CENTER,
  isRareCategory,
  shouldExpandToNational,
  getNextExpansionZoom,
  getExpansionMessage,
  type AutoScaleResult,
} from '@/lib/constants/autoScaleConfig';

interface MapState {
  zoom: number;
  center: { lat: number; lng: number };
}

interface UseAutoScaleMapProps {
  /** 현재 지도 상태 */
  currentMapState: MapState;
  /** 현재 뷰포트 내 필터된 공고 수 */
  viewportFilteredCount: number;
  /** 전체 공고 중 필터된 공고 수 (뷰포트 무관) */
  totalFilteredCount: number;
  /** 1차 카테고리 */
  primaryCategory: string | null;
  /** 2차 카테고리 */
  secondaryCategory: string | null;
  /** 지도 상태 변경 콜백 */
  onMapStateChange: (zoom: number, center: { lat: number; lng: number }) => void;
  /** 토스트 메시지 표시 콜백 */
  onShowToast?: (message: string, type?: 'info' | 'success' | 'warning') => void;
}

interface UseAutoScaleMapReturn {
  /** 자동 스케일업 실행 */
  checkAndExpand: () => AutoScaleResult;
  /** 원래 위치로 복귀 */
  restoreOriginalPosition: () => void;
  /** 확장 상태 */
  isExpanded: boolean;
  /** 확장 메시지 */
  expansionMessage: string | null;
  /** 원래 위치로 복귀 가능 여부 */
  canRestore: boolean;
  /** 수동으로 확장 상태 리셋 */
  resetExpansionState: () => void;
}

/**
 * 자동 스케일업 훅
 */
export function useAutoScaleMap({
  currentMapState,
  viewportFilteredCount,
  totalFilteredCount,
  primaryCategory,
  secondaryCategory,
  onMapStateChange,
  onShowToast,
}: UseAutoScaleMapProps): UseAutoScaleMapReturn {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expansionMessage, setExpansionMessage] = useState<string | null>(null);
  const [originalState, setOriginalState] = useState<MapState | null>(null);

  const expansionAttemptRef = useRef(0);

  /**
   * 자동 스케일업 체크 및 실행
   */
  const checkAndExpand = useCallback((): AutoScaleResult => {
    console.log('[useAutoScaleMap] checkAndExpand 호출:', {
      viewportFilteredCount,
      totalFilteredCount,
      isExpanded,
      attempts: expansionAttemptRef.current,
      currentZoom: currentMapState.zoom,
      primaryCategory,
      secondaryCategory,
    });

    // 이미 확장된 상태면 스킵
    if (isExpanded && expansionAttemptRef.current >= AUTO_SCALE_CONFIG.MAX_EXPANSION_ATTEMPTS) {
      console.log('[useAutoScaleMap] 최대 확장 횟수 도달, 스킵');
      return {
        expanded: false,
        newZoom: null,
        newCenter: null,
        message: null,
        originalState: null,
      };
    }

    // 뷰포트 내 결과가 충분하면 스킵 (사용자가 충분히 볼 수 있음)
    if (viewportFilteredCount >= AUTO_SCALE_CONFIG.MIN_RESULTS_THRESHOLD) {
      console.log('[useAutoScaleMap] 뷰포트 내 결과 충분 (', viewportFilteredCount, '>=', AUTO_SCALE_CONFIG.MIN_RESULTS_THRESHOLD, '), 스킵');
      // 확장 상태 리셋
      if (isExpanded) {
        setIsExpanded(false);
        setExpansionMessage(null);
        expansionAttemptRef.current = 0;
      }
      return {
        expanded: false,
        newZoom: null,
        newCenter: null,
        message: null,
        originalState: null,
      };
    }

    console.log('[useAutoScaleMap] 뷰포트 내 결과 부족! 확장 시작:', viewportFilteredCount, '개 (전체:', totalFilteredCount, '개)');

    // 첫 확장 시 원래 상태 저장
    if (!isExpanded) {
      console.log('[useAutoScaleMap] 원래 상태 저장:', currentMapState);
      setOriginalState({ ...currentMapState });
    }

    // 희귀 카테고리인 경우 또는 전체 공고도 부족한 경우 즉시 전국 검색
    const goNational = shouldExpandToNational(primaryCategory, secondaryCategory) ||
                       totalFilteredCount < AUTO_SCALE_CONFIG.MIN_RESULTS_THRESHOLD;
    console.log('[useAutoScaleMap] 전국 검색 필요 여부:', goNational, '(희귀:', shouldExpandToNational(primaryCategory, secondaryCategory), ', 전체부족:', totalFilteredCount < AUTO_SCALE_CONFIG.MIN_RESULTS_THRESHOLD, ')');

    // Kakao Maps: level이 높을수록 넓은 영역 → 이미 충분히 넓으면 전국 검색
    if (goNational || currentMapState.zoom >= AUTO_SCALE_CONFIG.NATIONAL_SEARCH_ZOOM) {
      console.log('[useAutoScaleMap] 전국 검색으로 이동!');
      const message = getExpansionMessage(
        secondaryCategory || primaryCategory,
        viewportFilteredCount,
        true
      );

      setIsExpanded(true);
      setExpansionMessage(message);
      expansionAttemptRef.current = AUTO_SCALE_CONFIG.MAX_EXPANSION_ATTEMPTS;

      // 전국 검색으로 이동
      onMapStateChange(AUTO_SCALE_CONFIG.NATIONAL_ZOOM, KOREA_CENTER);

      if (onShowToast) {
        onShowToast(message, 'info');
      }

      return {
        expanded: true,
        newZoom: AUTO_SCALE_CONFIG.NATIONAL_ZOOM,
        newCenter: KOREA_CENTER,
        message,
        originalState: isExpanded ? null : { ...currentMapState },
      };
    }

    // 단계별 확장 (Kakao Maps: level 증가 = 줌 아웃)
    const newZoom = getNextExpansionZoom(currentMapState.zoom, expansionAttemptRef.current);
    const isNational = newZoom >= AUTO_SCALE_CONFIG.NATIONAL_ZOOM;

    console.log('[useAutoScaleMap] 단계별 확장:', {
      currentZoom: currentMapState.zoom,
      newZoom,
      attempt: expansionAttemptRef.current,
      isNational,
    });

    const message = getExpansionMessage(
      secondaryCategory || primaryCategory,
      viewportFilteredCount,
      isNational
    );

    setIsExpanded(true);
    setExpansionMessage(message);
    expansionAttemptRef.current += 1;

    // 지도 줌 변경 (중심 유지 또는 전국 중심으로 이동)
    if (isNational) {
      console.log('[useAutoScaleMap] 전국 줌으로 이동:', AUTO_SCALE_CONFIG.NATIONAL_ZOOM);
      onMapStateChange(AUTO_SCALE_CONFIG.NATIONAL_ZOOM, KOREA_CENTER);
    } else {
      console.log('[useAutoScaleMap] 줌 레벨 변경:', newZoom);
      onMapStateChange(newZoom, currentMapState.center);
    }

    if (onShowToast) {
      onShowToast(message, 'info');
    }

    return {
      expanded: true,
      newZoom,
      newCenter: isNational ? KOREA_CENTER : currentMapState.center,
      message,
      originalState: expansionAttemptRef.current === 1 ? { ...currentMapState } : null,
    };
  }, [
    isExpanded,
    viewportFilteredCount,
    totalFilteredCount,
    primaryCategory,
    secondaryCategory,
    currentMapState,
    onMapStateChange,
    onShowToast,
  ]);

  /**
   * 원래 위치로 복귀
   */
  const restoreOriginalPosition = useCallback(() => {
    if (!originalState) return;

    onMapStateChange(originalState.zoom, originalState.center);

    setIsExpanded(false);
    setExpansionMessage(null);
    setOriginalState(null);
    expansionAttemptRef.current = 0;

    if (onShowToast) {
      onShowToast('원래 위치로 돌아왔습니다', 'success');
    }
  }, [originalState, onMapStateChange, onShowToast]);

  /**
   * 확장 상태 리셋 (필터 변경 시 호출)
   */
  const resetExpansionState = useCallback(() => {
    setIsExpanded(false);
    setExpansionMessage(null);
    setOriginalState(null);
    expansionAttemptRef.current = 0;
  }, []);

  return {
    checkAndExpand,
    restoreOriginalPosition,
    isExpanded,
    expansionMessage,
    canRestore: !!originalState,
    resetExpansionState,
  };
}

export default useAutoScaleMap;

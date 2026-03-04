/**
 * 사이드 패널 통합 관리 스토어
 * 등록 3버튼(구직/공고/연수강사) + 채팅/즐겨찾기/와글와글 상호 배타 관리
 * + 패널 z-order 관리 (가장 최근 열린 패널이 항상 앞에)
 */

import { create } from 'zustand';
import { useChatStore } from './chatStore';
import { useWagleStore } from './wagleStore';

export type RegistrationPanel = 'register' | 'jobPost' | 'instructor';

/** 모든 사이드 패널 종류 */
export type PanelType = 'chat' | 'favorites' | 'wagle' | RegistrationPanel;

let _zCounter = 30;

interface SidePanelState {
  /** 현재 열린 등록 패널 */
  activePanel: RegistrationPanel | null;

  /** 각 패널의 z-index (최근 열린 패널일수록 높은 값) */
  panelZ: Record<string, number>;

  /** 패널을 최상위로 올리기 */
  bringToFront: (panel: PanelType) => void;

  /** 패널 열기 (다른 모든 패널 닫기) */
  openPanel: (panel: RegistrationPanel) => void;

  /** 패널 닫기 */
  closePanel: () => void;

  /** 토글 (같은 패널 재클릭 시 닫기) */
  togglePanel: (panel: RegistrationPanel) => void;

  /** 외부에서 호출: 다른 패널(채팅/와글/즐겨찾기)이 열릴 때 등록 패널 닫기 */
  closeRegistrationPanels: () => void;
}

export const useSidePanelStore = create<SidePanelState>((set, get) => ({
  activePanel: null,
  panelZ: {},

  bringToFront: (panel) => {
    _zCounter += 1;
    set({ panelZ: { ...get().panelZ, [panel]: _zCounter } });
  },

  openPanel: (panel) => {
    // 채팅/와글와글 패널 닫기
    useChatStore.getState().closePanel();
    useWagleStore.getState().setDesktopPanelOpen(false);
    _zCounter += 1;
    set({ activePanel: panel, panelZ: { ...get().panelZ, [panel]: _zCounter } });
  },

  closePanel: () => {
    set({ activePanel: null });
  },

  togglePanel: (panel) => {
    const current = get().activePanel;
    if (current === panel) {
      set({ activePanel: null });
    } else {
      // 채팅/와글와글 패널 닫기
      useChatStore.getState().closePanel();
      useWagleStore.getState().setDesktopPanelOpen(false);
      _zCounter += 1;
      set({ activePanel: panel, panelZ: { ...get().panelZ, [panel]: _zCounter } });
    }
  },

  closeRegistrationPanels: () => {
    set({ activePanel: null });
  },
}));

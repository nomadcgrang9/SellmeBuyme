/**
 * Survey tracking utilities using localStorage
 * 베타 기간 설문조사 추적 관리
 */

const STORAGE_KEYS = {
  WELCOME_SHOWN: 'survey_welcome_shown',
  NEVER_SHOW: 'survey_never_show',
  LINK_CLICKED: 'survey_link_clicked',
  COMPLETED: 'survey_completed',
} as const;

export const SurveyTracker = {
  /**
   * Welcome 모달이 이미 표시되었는지 확인
   */
  hasWelcomeShown(): boolean {
    return localStorage.getItem(STORAGE_KEYS.WELCOME_SHOWN) === 'true';
  },

  /**
   * Welcome 모달을 표시했다고 기록
   */
  markWelcomeShown(): void {
    localStorage.setItem(STORAGE_KEYS.WELCOME_SHOWN, 'true');
  },

  /**
   * "다시 보지 않기"가 체크되었는지 확인
   */
  hasNeverShow(): boolean {
    return localStorage.getItem(STORAGE_KEYS.NEVER_SHOW) === 'true';
  },

  /**
   * "다시 보지 않기" 설정 저장
   */
  markNeverShow(): void {
    localStorage.setItem(STORAGE_KEYS.NEVER_SHOW, 'true');
  },

  /**
   * 설문 링크 클릭 시간 기록
   */
  markLinkClicked(): void {
    localStorage.setItem(STORAGE_KEYS.LINK_CLICKED, new Date().toISOString());
  },

  /**
   * 설문 링크 클릭 시간 가져오기
   */
  getLinkClickedTime(): string | null {
    return localStorage.getItem(STORAGE_KEYS.LINK_CLICKED);
  },

  /**
   * Welcome 모달 표시 여부 판단
   * - "다시 보지 않기"를 체크했으면 표시 안 함
   * - 이미 표시했으면 표시 안 함
   */
  shouldShowWelcome(): boolean {
    if (this.hasNeverShow()) return false;
    if (this.hasWelcomeShown()) return false;
    return true;
  },

  /**
   * 모든 설문 관련 localStorage 초기화 (테스트용)
   */
  clear(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },
};

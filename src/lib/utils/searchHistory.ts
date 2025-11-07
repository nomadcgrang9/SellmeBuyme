// 최근 검색어 관리 유틸리티

const SEARCH_HISTORY_KEY = 'sellmebuyme_search_history';
const MAX_HISTORY_ITEMS = 10;

export interface SearchHistoryItem {
  keyword: string;
  timestamp: number;
}

/**
 * 최근 검색어 목록 가져오기
 */
export function getSearchHistory(): SearchHistoryItem[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return [];

    const history = JSON.parse(stored) as SearchHistoryItem[];
    return history.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Failed to load search history:', error);
    return [];
  }
}

/**
 * 검색어 추가 (중복 제거, 최신순 정렬, 최대 개수 제한)
 */
export function addSearchHistory(keyword: string): void {
  if (!keyword.trim()) return;

  try {
    const history = getSearchHistory();

    // 중복 제거
    const filtered = history.filter(item => item.keyword !== keyword);

    // 새 항목 추가
    const newHistory = [
      { keyword, timestamp: Date.now() },
      ...filtered
    ].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}

/**
 * 특정 검색어 삭제
 */
export function removeSearchHistory(keyword: string): void {
  try {
    const history = getSearchHistory();
    const filtered = history.filter(item => item.keyword !== keyword);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove search history:', error);
  }
}

/**
 * 전체 검색어 삭제
 */
export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear search history:', error);
  }
}

/**
 * 인기 검색어 (임시 더미 데이터 - 추후 API로 대체 가능)
 */
export function getPopularKeywords(): string[] {
  return [
    '중등 수학',
    '서울 강남',
    '초등 교사',
    '고등 영어',
    '과학실험',
    '유치원',
    '특수교육',
    '방과후',
    '경기도',
    '음악'
  ];
}

/**
 * 추천 검색어 카테고리별
 */
export const RECOMMENDED_KEYWORDS = {
  schoolLevel: ['초등', '중등', '고등', '유치원'],
  regions: ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산'],
  subjects: ['국어', '수학', '영어', '과학', '사회', '역사', '체육', '음악', '미술'],
  jobTypes: ['정규직', '기간제', '시간강사', '방과후', '돌봄']
};

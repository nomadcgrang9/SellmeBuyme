# PR 통합 작업 히스토리 (2026-01)

## 개요
3개의 feature 브랜치를 main에 통합하는 과정에서 발생한 충돌을 해결하고 성공적으로 머지 완료.

---

## 통합된 PR 목록

### PR #3: kimwoody2
- **브랜치**: `kimwoody2`
- **주요 변경사항**:
  - 광주/전북/전남/제주 크롤러 추가
  - 새 크롤러 소스: `gwangju`, `jeonbuk`, `jeonnam`, `jeju`
- **충돌 파일** (6개):
  - `.github/workflows/run-crawler.yml`
  - `.github/workflows/deploy-edge.yml`
  - `crawler/index.js`
  - `crawler/config/sources.json`
  - `src/lib/constants/filters.ts`
  - `src/lib/supabase/queries.ts`
- **해결 방식**:
  - 강원 크롤러와 광주/전북/전남/제주 크롤러 병합
  - `crawler/index.js`에 모든 import 통합
  - `sources.json`에 모든 소스 설정 통합
- **상태**: ✅ 머지 완료

---

### PR #4: feature/region-search-hierarchy
- **브랜치**: `feature/region-search-hierarchy`
- **주요 변경사항**:
  - 경기도/강원도 계층적 지역 필터 구조 추가
  - `GYEONGGI_SUBREGIONS`, `GANGWON_SUBREGIONS` 상수 추가
  - 도 단위 검색 시 하위 시/군 자동 확장 기능
- **충돌 파일** (2개):
  - `src/lib/constants/filters.ts`
  - `src/lib/supabase/queries.ts`
- **해결 방식**:
  - PR #3 머지 후 최신 main 반영
  - `filters.ts`: 강원 서브지역 배열 추가
  - `queries.ts`: 도 단위 검색 로직 (`isProvinceWideSearch`, `expandProvinceToAllCities`) 통합
- **상태**: ✅ 머지 완료

---

### PR #5: fix/region-search-word-boundary
- **브랜치**: `fix/region-search-word-boundary`
- **주요 변경사항**:
  - 지역 검색 단어 경계 개선
  - 강원 크롤러 (`gangwon_v2`) 추가
- **충돌 파일** (3개):
  - `.github/workflows/deploy-edge.yml`
  - `.github/workflows/run-crawler.yml`
  - `crawler/config/sources.json`
- **해결 방식**:
  - `deploy-edge.yml`: main 버전의 포맷팅 적용
  - `run-crawler.yml`: 단순화된 `source` 드롭다운 방식 사용 (11개 소스)
  - `sources.json`: `gangwon_v2` 키 유지 (기존 `gangwon`과 별도)
- **상태**: ✅ 머지 완료

---

## 주요 기술적 결정사항

### 1. 크롤러 소스 통합
**최종 활성 크롤러 목록** (run-crawler.yml):
- `gyeonggi` - 경기도교육청
- `seongnam` - 성남교육지원청
- `uijeongbu` - 의정부교육지원청
- `namyangju` - 구리남양주교육지원청
- `gwangju` - 광주광역시교육청
- `jeonbuk` - 전북특별자치도교육청
- `jeonnam` - 전라남도교육청
- `jeju` - 제주특별자치도교육청
- `incheon` - 인천광역시교육청
- `seoul` - 서울교육일자리포털
- `gangwon` - 강원특별자치도교육청

### 2. 지역 필터 계층 구조
```typescript
// filters.ts
export const GYEONGGI_SUBREGIONS = ['수원시', '성남시', '고양시', ...];
export const GANGWON_SUBREGIONS = ['춘천시', '원주시', '강릉시', ...];
```

### 3. 지역 검색 쿼리 로직
```typescript
// queries.ts
if (isProvinceWideSearch(region)) {
  const allLocations = expandProvinceToAllCities(region);
  // 도 전체 검색 시 모든 하위 지역으로 확장
}
```

### 4. GitHub Actions Workflow
- **수동 실행**: `workflow_dispatch`에서 `source` 선택 (choice 타입)
- **스케줄 실행**: 매일 01:00 UTC, matrix 전략으로 11개 소스 병렬 실행

---

## 충돌 해결 패턴

### 공통 전략
1. **최신 main 기준**: PR 순서대로 main에 머지하면서 이전 PR 변경사항 포함
2. **기능 병합**: 여러 브랜치의 독립적인 기능은 모두 유지
3. **코드 통합**: import, export, 배열 요소는 합집합으로 통합

### 특정 파일별 해결
- **crawler/index.js**: 모든 크롤러 import를 병합 (gangwon + gwangju/jeonbuk/jeonnam/jeju)
- **sources.json**: 모든 크롤러 설정 통합 (gangwon_v2, gwangju_v2, jeonnam_v2, jeju_v2 등)
- **filters.ts**: 계층적 지역 배열 추가 (GYEONGGI + GANGWON)
- **queries.ts**: 배열 기반 지역 필터 + 도 단위 확장 로직 병합

---

## 머지 순서 및 커밋

1. **PR #3** (kimwoody2): `cd4ecd5` - 광주/전북/전남/제주 크롤러 추가
2. **PR #4** (feature/region-search-hierarchy): `f84e860` - 계층적 지역 필터
3. **PR #5** (fix/region-search-word-boundary): `ffb5c42` - 단어 경계 개선 + 강원 v2

---

## 다음 단계 (팀원 가이드)

### 로컬 환경 최신화
```bash
# 현재 브랜치에서 최신 main 반영
git fetch origin
git merge origin/main

# 또는 새 작업 시작
git checkout main
git pull origin main
git checkout -b feature/새기능명
```

### 주의사항
- 모든 팀원은 최신 main 브랜치를 기준으로 작업 시작
- 충돌 발생 시 팀 리더에게 문의
- 크롤러 추가 시 `sources.json`, `index.js`, `run-crawler.yml` 3곳 모두 수정 필요

---

## 참고 파일
- `.github/workflows/run-crawler.yml` - 크롤러 실행 워크플로우
- `crawler/config/sources.json` - 크롤러 소스 설정
- `src/lib/constants/filters.ts` - 지역 필터 상수
- `src/lib/supabase/queries.ts` - 검색 쿼리 로직

---

**작성일**: 2026-01-04
**작성자**: AI 기반 머지 작업 (Claude Code)

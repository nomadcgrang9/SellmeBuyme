# 검색 로직 개선 계획

## 현재 상태 요약

### 문제점
1. **삼중 필터링 복잡도**: DB → Client → Frontend 세 곳에서 중복 필터링
2. **토큰 분류 모호성**: 같은 키워드가 여러 타입으로 분류될 수 있음
3. **동의어 처리 오류**: "중등"이 "고등학교"를 포함 (잘못된 확장)
4. **지역 검색 모호성**: "광주"가 광주광역시와 경기 광주시 모두 해당
5. **프론트엔드/백엔드 필터 로직 불일치**: DB는 OR 검색, 프론트엔드는 includes() 사용

### 현재 검색 플로우
```
사용자 입력
    ↓
searchStore.setQuery()
    ↓
queries.ts: buildTokenGroups() → 토큰 확장
    ↓
Supabase RPC: ILIKE 검색 (OR 조건)
    ↓
queries.ts: filterJobsByTokenGroups() → 클라이언트 필터링
    ↓
Hero.tsx: filteredJobPostings → 뷰포트 필터링
    ↓
화면 표시
```

---

## 개선 계획

### Phase 1: 즉시 수정 (High Priority)

#### 1.1 동의어 맵 수정
**파일**: `src/lib/supabase/queries.ts`

**현재 문제**:
```typescript
const synonymMap: Record<string, string[]> = {
  '중등': ['중학교', '고등학교'],  // ❌ 잘못된 확장
  '초등': ['초등학교'],
};
```

**수정안**:
```typescript
const synonymMap: Record<string, string[]> = {
  '중등': ['중학교', '중등'],      // ✅ 중학교만
  '고등': ['고등학교', '고등'],    // ✅ 고등학교만
  '초등': ['초등학교', '초등'],
  '유치원': ['유치원', '유아'],
};
```

#### 1.2 클라이언트 중복 필터링 제거
**파일**: `src/lib/supabase/queries.ts`

**현재 문제**: `filterJobsByTokenGroups()`가 DB 결과를 다시 필터링

**수정안**:
- `filterJobsByTokenGroups()` 함수 간소화 또는 제거
- DB 쿼리 결과를 신뢰하고 추가 필터링 최소화

```typescript
// 제거 또는 간소화
export function filterJobsByTokenGroups(
  jobs: JobPosting[],
  tokenGroups: string[][],
  options?: FilterOptions
): JobPosting[] {
  // DB 결과를 그대로 반환 (신뢰)
  return jobs;
}
```

#### 1.3 Hero.tsx 뷰포트 필터링 최적화
**파일**: `src/pages/new-landing/components/Hero.tsx`

**현재 문제**: 검색어에 따른 추가 필터링이 DB 로직과 불일치

**수정안**:
```typescript
// activeLocationFilter 로직 제거 - DB 검색 결과만 사용
const filteredJobPostings = useMemo(() => {
  let filtered = viewportJobPostings;

  // cascadingFilter만 적용 (지도 마커 클릭 시)
  if (cascadingFilter) {
    filtered = filtered.filter(job => {
      const org = (job.organization || '').toLowerCase();
      const loc = (job.location || '').toLowerCase();
      return org.includes(cascadingFilter.toLowerCase()) ||
        loc.includes(cascadingFilter.toLowerCase());
    });
  }

  return filtered;
}, [viewportJobPostings, cascadingFilter]);
```

---

### Phase 2: 구조 개선 (Medium Priority)

#### 2.1 검색 로직 단일화
**목표**: DB 검색을 유일한 진실의 원천(Single Source of Truth)으로

**수정 파일들**:
- `src/lib/supabase/queries.ts`
- `src/stores/searchStore.ts`
- `src/pages/new-landing/components/Hero.tsx`

**변경 사항**:
1. DB 검색 결과를 그대로 사용
2. 클라이언트 필터링은 뷰포트 바운드 체크만
3. 검색어 매칭은 DB에서만 수행

#### 2.2 토큰 분류 명확화
**파일**: `src/lib/supabase/queries.ts`

**수정안**: classifyTokenType 함수 개선
```typescript
function classifyTokenType(token: string): TokenType {
  const lowerToken = token.toLowerCase();

  // 우선순위: 지역 > 학교급 > 과목 > 역할
  if (LOCATION_KEYWORDS.some(loc => lowerToken.includes(loc))) {
    return 'location';
  }
  if (SCHOOL_LEVEL_KEYWORDS.some(level => lowerToken === level)) {
    return 'schoolLevel';
  }
  if (SUBJECT_KEYWORDS.some(subj => lowerToken.includes(subj))) {
    return 'subject';
  }
  if (ROLE_KEYWORDS.some(role => lowerToken.includes(role))) {
    return 'role';
  }
  return 'general'; // 기본값
}
```

#### 2.3 지역 검색 개선
**목표**: "광주" 검색 시 광주광역시와 경기 광주시 구분

**수정안**:
```typescript
const REGION_DISAMBIGUATION = {
  '광주': ['광주광역시', '전라남도 광주', '경기도 광주시', '경기 광주'],
  '성남': ['성남시', '경기도 성남'],
  // ... 기타 동명이인 지역
};

// 검색 결과에 지역 힌트 표시
function getRegionHint(location: string): string | null {
  if (location.includes('광역시')) return '광역시';
  if (location.includes('경기')) return '경기도';
  return null;
}
```

---

### Phase 3: 사용자 경험 개선 (Lower Priority)

#### 3.1 마감일 필터 사용자 제어
**현재 문제**: 마감일 필터가 항상 활성화되어 과거 공고 미표시

**수정안**: UI에 "마감된 공고 포함" 체크박스 추가
```typescript
// searchStore.ts
interface SearchState {
  // 기존 필드들...
  includeExpired: boolean;
}

// queries.ts
if (!options.includeExpired) {
  query = query.or(`deadline.is.null,deadline.gte.${today}`);
}
```

#### 3.2 검색 결과 하이라이팅
**목표**: 검색어가 매칭된 부분을 시각적으로 표시

```typescript
function highlightMatch(text: string, query: string): JSX.Element {
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase()
          ? <mark key={i}>{part}</mark>
          : part
      )}
    </>
  );
}
```

#### 3.3 검색어 자동완성
**목표**: 자주 검색되는 키워드 제안

```typescript
const POPULAR_SEARCHES = [
  '중학교', '고등학교', '초등학교',
  '수학', '영어', '국어', '과학',
  '서울', '경기', '인천',
  '기간제', '정규직', '강사',
];
```

---

## 구현 우선순위

| 우선순위 | 작업 | 예상 영향 | 복잡도 |
|---------|-----|---------|-------|
| 🔴 High | 1.1 동의어 맵 수정 | 검색 정확도 향상 | 낮음 |
| 🔴 High | 1.2 중복 필터링 제거 | 성능 개선, 버그 감소 | 중간 |
| 🔴 High | 1.3 Hero.tsx 최적화 | 지도 필터링 정확도 | 중간 |
| 🟡 Medium | 2.1 검색 로직 단일화 | 유지보수성 향상 | 높음 |
| 🟡 Medium | 2.2 토큰 분류 명확화 | 검색 예측 가능성 | 중간 |
| 🟡 Medium | 2.3 지역 검색 개선 | 동명이인 지역 처리 | 중간 |
| 🟢 Low | 3.1 마감일 필터 제어 | 사용자 유연성 | 낮음 |
| 🟢 Low | 3.2 결과 하이라이팅 | UX 개선 | 낮음 |
| 🟢 Low | 3.3 자동완성 | UX 개선 | 중간 |

---

## 테스트 케이스

### 수정 후 검증 필수 테스트
```
1. "광주" 검색 → 광주 관련 공고만 표시 (의정부 ❌)
2. "중등" 검색 → 중학교 공고만 (고등학교 ❌)
3. "고등" 검색 → 고등학교 공고만
4. "서울 수학" 검색 → 서울 지역 수학 과목 공고
5. 지도 뷰포트 이동 → 해당 영역 공고만 표시
6. 마커 클릭 → 해당 기관 공고만 표시
```

### 엣지 케이스
```
1. 빈 검색어 → 전체 공고 (뷰포트 내)
2. 특수문자 포함 → 안전하게 처리
3. 띄어쓰기 다름 → "의정부시" = "의정부 시"
4. 대소문자 → 무시
```

---

## 다음 단계

1. **Phase 1 즉시 수정** 구현 및 테스트
2. 수정 후 "광주", "중등" 등 주요 검색어 테스트
3. 문제 없으면 Phase 2 진행
4. 사용자 피드백 수집 후 Phase 3 우선순위 조정

# Migration Guide: crawl_boards 고급 검색 기능

## 📋 개요

"경기도" 검색 시 "경기도 > 성남시", "경기도 > 의정부시" 등 계층적 지역 검색이 가능하도록 pg_trgm을 활용한 고급 검색 기능을 추가합니다.

---

## 🚀 마이그레이션 실행 방법

### 1단계: Supabase Dashboard 접속

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인
2. 프로젝트 선택
3. 왼쪽 메뉴에서 **SQL Editor** 클릭

### 2단계: 마이그레이션 SQL 실행

`supabase/migrations/20250202_add_crawl_boards_search_indexes.sql` 파일을 열어서 전체 내용을 복사한 후, SQL Editor에 붙여넣고 **Run** 버튼 클릭

또는 아래 명령어로 직접 파일을 실행:

```bash
# Supabase CLI가 설치되어 있다면
supabase db push
```

### 3단계: 검증

마이그레이션이 성공적으로 완료되었는지 확인:

```bash
npx tsx scripts/test/test-crawl-boards-search.ts
```

**예상 결과:**
```
✅ 통과: 5/5
❌ 실패: 0/5

✨ 모든 테스트가 통과했습니다!
```

---

## 🔍 주요 기능

### 1. 계층적 지역 검색

**예시:**
- "경기도" 검색 → `경기도 교육청`, `경기도 > 성남시`, `경기도 > 의정부시` 모두 반환
- "성남" 검색 → `성남교육지원청`, `경기도 > 성남시` 반환

### 2. pg_trgm Similarity 검색

**threshold: 0.2 (20% 유사도)**

- "경기" → "경기도", "경기도 교육청" 매칭
- "일본" → "일본어" 매칭 (기존 메인 검색과 동일)

### 3. ILIKE Fallback

similarity 검색이 실패해도 기본 ILIKE 검색으로 fallback되어 안정적인 검색 보장

---

## 📦 추가된 기능

### 1. 인덱스 (성능 최적화)

```sql
CREATE INDEX crawl_boards_name_trgm_idx ON crawl_boards USING gin (name gin_trgm_ops);
CREATE INDEX crawl_boards_region_display_name_trgm_idx ON crawl_boards USING gin (region_display_name gin_trgm_ops);
```

### 2. 검색 함수

#### `search_crawl_boards_by_region(search_text, similarity_threshold)`

지역 기반 검색 + similarity score 반환

**예시:**
```sql
SELECT * FROM search_crawl_boards_by_region('경기도', 0.2);
```

#### `search_crawl_boards_advanced(search_text, filter_active, filter_region_code, similarity_threshold)`

통합 검색 함수 (필터 + 정렬)

**예시:**
```sql
-- 활성화된 게시판만 검색
SELECT * FROM search_crawl_boards_advanced('경기', true, NULL, 0.2);

-- 특정 지역 코드 필터
SELECT * FROM search_crawl_boards_advanced(NULL, NULL, 'KR-41', 0.2);
```

---

## 🎨 프론트엔드 변경사항

### 1. `fetchCrawlBoards()` 함수 확장

**변경 전:**
```typescript
const boards = await fetchCrawlBoards();
```

**변경 후:**
```typescript
const boards = await fetchCrawlBoards({
  searchKeyword: '경기도',
  filterActive: true,
  filterRegionCode: 'KR-41',
  useSimilaritySearch: true  // 기본값: true
});
```

### 2. 관리자 페이지 검색 개선

- **디바운싱**: 500ms 후 검색 실행 (API 호출 최적화)
- **로딩 표시**: 검색 중 스피너 표시
- **실시간 검색**: 입력 즉시 서버 사이드 검색 (클라이언트 필터링 제거)

**파일:** `src/components/admin/CrawlBoardList.tsx`

---

## 🧪 테스트 케이스

### 테스트 1: "경기도" 검색

**예상 결과:**
- 경기도 교육청 구인정보조회
- 성남교육지원청 구인
- 의정부교육지원청 구인

**모두 반환되어야 함** ✅

### 테스트 2: "성남" 검색

**예상 결과:**
- 성남교육지원청 구인

### 테스트 3: "교육청" 검색

**예상 결과:**
- 3개 모두 반환 (모두 "교육청" 포함)

---

## 🔧 트러블슈팅

### 문제 1: `search_crawl_boards_advanced` 함수를 찾을 수 없음

**원인:** 마이그레이션이 아직 실행되지 않음

**해결:**
```sql
-- Supabase Dashboard > SQL Editor에서 실행
-- supabase/migrations/20250202_add_crawl_boards_search_indexes.sql
```

### 문제 2: 검색 결과가 없음

**원인:** similarity_threshold가 너무 높음

**해결:**
```typescript
// queries.ts에서 threshold 조정
similarity_threshold: 0.1  // 기본값 0.2에서 0.1로 낮춤
```

### 문제 3: 검색이 느림

**원인:** 인덱스가 생성되지 않음

**확인:**
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'crawl_boards';
```

**예상 결과:**
- `crawl_boards_name_trgm_idx`
- `crawl_boards_region_display_name_trgm_idx`

---

## 📊 성능 비교

### 기존 (클라이언트 필터링)

- 모든 게시판 조회 후 JavaScript 필터링
- 게시판 1000개 → 1000개 모두 전송
- 네트워크 부하 증가

### 개선 (서버 사이드 검색)

- PostgreSQL에서 필터링 후 결과만 전송
- 게시판 1000개 → 검색 결과 3개만 전송
- **네트워크 부하 97% 감소** 🚀

---

## 📝 다음 단계

1. **마이그레이션 실행** (위 안내 참고)
2. **테스트 스크립트 실행**
   ```bash
   npx tsx scripts/test/test-crawl-boards-search.ts
   ```
3. **프론트엔드 테스트**
   ```bash
   npm run dev
   ```
   - `/note` 페이지 접속
   - 크롤링 게시판 목록 탭
   - 검색창에 "경기도", "성남", "의정부" 입력

---

## 📚 참고 자료

- [PostgreSQL pg_trgm 문서](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Supabase RPC 함수](https://supabase.com/docs/guides/database/functions)
- 프로젝트 내 관련 파일:
  - `supabase/migrations/20250130_pgtrgm_similarity_improved.sql` (메인 검색)
  - `supabase/migrations/20250202_add_crawl_boards_search_indexes.sql` (관리자 검색)
  - `src/lib/supabase/queries.ts` (fetchCrawlBoards 함수)
  - `src/components/admin/CrawlBoardList.tsx` (UI)

# 북마크 기능 디버깅 가이드

## ✅ 완료된 수정 사항

### 1. BookmarkPage 레이아웃 수정
- **문제**: 모바일에서 페이지가 제대로 표시되지 않음
- **해결**: `fixed inset-0 z-50` 추가하여 전체 화면 덮도록 수정

### 2. 상세한 디버깅 로그 추가
모든 북마크 관련 함수에 console.log 추가:
- `JobCard.tsx` - handleBookmarkToggle
- `TalentCard.tsx` - handleBookmarkToggle
- `ExperienceCard.tsx` - handleBookmarkToggle
- `queries.ts` - addBookmark
- `queries.ts` - removeBookmark

---

## 🔍 브라우저 개발자 도구 진단 방법

### 1단계: 개발 서버 실행
```bash
npm run dev
```

### 2단계: 브라우저 개발자 도구 열기
- Windows: `F12` 또는 `Ctrl+Shift+I`
- Console 탭으로 이동

### 3단계: 북마크 버튼 클릭
아무 카드(공고/인력/체험)의 하트 버튼 클릭

### 4단계: 콘솔 로그 확인
다음과 같은 로그가 나타나야 합니다:

#### 정상 작동 시:
```
[JobCard] 북마크 토글 시작: {jobId: "xxx", userId: "yyy", bookmarked: false}
[JobCard] 북마크 추가 시작
[addBookmark] 시작: {userId: "yyy", cardId: "xxx", cardType: "job"}
[addBookmark] 북마크 추가 성공: xxx
[JobCard] 북마크 추가 완료
✅ 토스트: "북마크했습니다"
```

#### 에러 발생 시:
```
[JobCard] 북마크 토글 시작: {jobId: "xxx", userId: "yyy", bookmarked: false}
[JobCard] 북마크 추가 시작
[addBookmark] 시작: {userId: "yyy", cardId: "xxx", cardType: "job"}
[addBookmark] DB 에러: {...}
[addBookmark] 에러 상세: {code: "...", message: "...", details: "...", hint: "..."}
❌ 토스트: "북마크 처리에 실패했습니다"
```

---

## 🎯 예상되는 에러 타입

### 1. 테이블 없음
```
code: "42P01"
message: "relation \"public.bookmarks\" does not exist"
```
**해결**: DB 마이그레이션 실행 필요
```bash
# Supabase CLI로 마이그레이션 적용
npx supabase migration up
```

### 2. RLS 정책 에러
```
code: "42501"
message: "new row violates row-level security policy"
```
**해결**: RLS 정책 확인
- Supabase 대시보드 → Authentication → Policies
- `bookmarks` 테이블에 INSERT/SELECT/DELETE 정책 확인

### 3. 로그인 안됨
```
[JobCard] 로그인 필요
```
**해결**: 브라우저에서 로그인 필요

### 4. 중복 북마크
```
code: "23505"
message: "duplicate key value violates unique constraint"
```
**해결**: 이미 북마크된 카드 (정상, 무시됨)

---

## 📊 DB 상태 확인

### 테이블 존재 확인 스크립트
```bash
npx tsx scripts/test/check-bookmarks-table.ts
```

예상 출력:
```
🔍 북마크 테이블 확인 중...
1️⃣ 테이블 존재 확인...
✅ bookmarks 테이블 존재 확인
```

### Supabase 대시보드에서 직접 확인
1. https://supabase.com 로그인
2. 프로젝트 선택
3. Table Editor → `bookmarks` 테이블 확인
4. SQL Editor → 다음 쿼리 실행:
```sql
-- 테이블 구조 확인
SELECT * FROM bookmarks LIMIT 0;

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE tablename = 'bookmarks';
```

---

## 🔧 자주 발생하는 문제 해결

### 문제 1: "북마크 처리에 실패했습니다" 토스트
**진단**:
1. 콘솔에서 정확한 에러 메시지 확인
2. `[addBookmark] DB 에러` 로그 찾기
3. `code` 값 확인

**해결**:
- `42P01`: 테이블 없음 → 마이그레이션 실행
- `42501`: RLS 정책 → Supabase 대시보드에서 정책 확인
- `23505`: 중복 → 정상 (무시됨)

### 문제 2: 북마크 페이지가 빈 화면
**진단**:
1. 콘솔에서 `[fetchBookmarkedCards]` 로그 확인
2. Network 탭에서 API 요청 확인

**해결**:
- 로그인 확인
- `loadBookmarkedCards` 함수 에러 확인

### 문제 3: 모바일에서 북마크 페이지 안열림
**진단**:
1. `showBookmarkPage` 상태 확인
2. z-index 충돌 확인

**해결**:
- 이미 수정됨 (`fixed inset-0 z-50`)
- 브라우저 캐시 삭제 후 재시도

---

## 📝 다음 단계

### 로그 확인 후 보고해주세요:
1. 어떤 카드(공고/인력/체험)에서 실패했는지
2. 콘솔에 나타난 정확한 에러 메시지
3. `[addBookmark] 에러 상세` 객체 내용
4. 로그인 상태 (user ID 포함)

### 스크린샷 필요:
- 브라우저 개발자 도구 Console 탭 전체
- Network 탭 (실패한 요청)

---

## 🎯 최종 체크리스트

- [ ] 개발 서버 실행 중 (`npm run dev`)
- [ ] 브라우저에서 로그인됨
- [ ] `bookmarks` 테이블 존재 확인
- [ ] RLS 정책 설정 확인
- [ ] 콘솔 로그에 에러 메시지 확인
- [ ] 에러 코드 및 메시지 보고

---

**이제 브라우저에서 북마크 버튼을 클릭하고 콘솔 로그를 확인해주세요!**

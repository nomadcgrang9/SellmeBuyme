# 개발자 제출 → 관리자 승인 워크플로우 테스트 가이드

## 🎯 워크플로우 개요

```
개발자 노트 (/note)
    ↓ 팀원이 게시판 제출
개발자 제출 내역 저장 (dev_board_submissions)
    ↓
관리자 페이지 (/admin-page)
"개발자 제출 승인" 탭
    ↓ 관리자 승인 버튼 클릭
자동으로 crawl_boards에 등록
    ↓
"크롤링 게시판 목록" 탭에 표시
```

---

## 📋 테스트 단계

### 1단계: 개발자 노트에서 게시판 제출

1. **개발자 페이지 접속**
   ```
   http://localhost:5173/note
   ```

2. **게시판 등록 제출 섹션 확장**
   - "게시판 등록 제출" 아코디언 클릭

3. **새 게시판 등록**
   - 플로팅 버튼 (+ 아이콘) 클릭
   - "게시판 등록" 선택

4. **제출 폼 작성**
   ```
   게시판 이름: 남양주교육지원청 구인직
   게시판 URL: http://example.com/namyangju
   지역:
     - 광역자치단체: 경기도
     - 시군구: 남양주시
   학교급: 혼합/전체
   설명: 남양주 지역 교육청 공고 게시판
   ```

5. **제출 버튼 클릭**
   - ✅ "제출이 완료되었습니다" 메시지 확인
   - ✅ 제출 목록에 새 항목 표시 확인 (노란색 "대기" 뱃지)

---

### 2단계: 관리자 페이지에서 승인

1. **관리자 페이지 접속**
   ```
   http://localhost:5173/admin-page
   ```

2. **"개발자 제출 승인" 탭 선택**
   - 왼쪽 사이드바 햄버거 메뉴 클릭
   - "개발자 제출 승인" (NEW 뱃지) 클릭

3. **제출 목록 확인**
   - ✅ 1단계에서 제출한 "남양주교육지원청 구인직" 확인
   - ✅ 지역: "경기도 > 남양주시" 표시
   - ✅ 학교급: "혼합/전체" 표시
   - ✅ 제출자 정보 표시

4. **승인 버튼 클릭**
   - 녹색 "승인" 버튼 클릭

5. **승인 모달 확인**
   - ✅ 게시판 정보 표시 확인
   - ✅ "승인하시겠습니까?" 확인 메시지
   - ✅ "승인 시 자동으로 크롤링 게시판 목록에 등록..." 안내 문구

6. **최종 승인**
   - 녹색 "승인하기" 버튼 클릭
   - ✅ "게시판이 승인되어 크롤링 목록에 추가되었습니다" 성공 메시지

---

### 3단계: 크롤링 게시판 목록 확인

1. **"크롤링 게시판 목록" 탭으로 이동**
   - 사이드바에서 "크롤링 게시판 목록" 클릭

2. **승인된 게시판 확인**
   - ✅ "남양주교육지원청 구인직" 카드 표시
   - ✅ 상태: active
   - ✅ 활성화: 사용 (YES)
   - ✅ 지역 정보 반영 확인 (DB에 저장됨)

3. **검색 테스트**
   - 검색창에 "남양주" 입력
   - ✅ 해당 게시판 필터링되어 표시

4. **계층적 검색 테스트**
   - 검색창에 "경기도" 입력
   - ✅ 경기도, 경기도 > 성남시, 경기도 > 의정부시, **경기도 > 남양주시** 모두 표시

---

## 🗄️ 데이터베이스 검증

### dev_board_submissions 테이블 확인

```sql
SELECT
  id,
  board_name,
  board_url,
  status,
  region_code,
  subregion_code,
  school_level,
  approved_at,
  crawl_board_id
FROM dev_board_submissions
WHERE board_name = '남양주교육지원청 구인직';
```

**예상 결과:**
```
status: approved
region_code: KR-41
subregion_code: 4136025
school_level: mixed
approved_at: (현재 시각)
crawl_board_id: (UUID - crawl_boards와 연결)
```

---

### crawl_boards 테이블 확인

```sql
SELECT
  id,
  name,
  board_url,
  is_active,
  region_code,
  subregion_code,
  region_display_name,
  school_level
FROM crawl_boards
WHERE name LIKE '%남양주%';
```

**예상 결과:**
```
name: 남양주교육지원청 구인직
board_url: http://example.com/namyangju
is_active: true
region_code: KR-41
subregion_code: 4136025
region_display_name: 경기도 > 남양주시
school_level: mixed
```

---

## ✅ 체크리스트

### 개발자 노트 (/note)
- [ ] 게시판 제출 폼 작성 가능
- [ ] 지역 선택 (광역자치단체 + 시군구) 동작
- [ ] 학교급 선택 동작
- [ ] 제출 후 "대기" 상태로 목록에 표시

### 관리자 페이지 (/admin-page)
- [ ] "개발자 제출 승인" 탭 표시 (NEW 뱃지)
- [ ] 대기 중인 제출 목록 표시
- [ ] 지역 정보 표시 (📍 경기도 > 남양주시)
- [ ] 학교급 정보 표시 (🎓 혼합/전체)
- [ ] 승인 버튼 클릭 → 모달 표시
- [ ] 모달에서 승인 → 성공 메시지
- [ ] "크롤링 게시판 목록"에 자동 등록

### 크롤링 게시판 목록
- [ ] 승인된 게시판 표시
- [ ] 검색 기능 동작 ("남양주" 검색)
- [ ] 계층적 검색 동작 ("경기도" 검색 시 하위 지역 포함)

### 데이터베이스
- [ ] dev_board_submissions.status = 'approved'
- [ ] dev_board_submissions.crawl_board_id 연결됨
- [ ] crawl_boards에 새 레코드 생성
- [ ] 지역 정보 자동 복사 (region_code, subregion_code, region_display_name)

---

## 🚨 트러블슈팅

### 문제 1: "개발자 제출 승인" 탭이 안 보임

**원인:** 관리자 권한 없음 또는 페이지 새로고침 필요

**해결:**
```bash
# 페이지 새로고침
Ctrl + Shift + R (강력 새로고침)
```

### 문제 2: 승인 버튼 클릭 후 에러

**원인:** `approveBoardSubmissionAndCreateCrawlBoard` 함수 오류

**확인:**
1. 브라우저 콘솔 (F12) 확인
2. `src/lib/supabase/developer.ts` 파일 확인
3. RLS 정책 확인 (관리자 권한)

### 문제 3: 크롤링 목록에 안 나타남

**원인:** crawl_boards 생성 실패 또는 is_active=false

**확인:**
```sql
SELECT * FROM crawl_boards WHERE name LIKE '%남양주%';
```

**해결:**
- `is_active = true`인지 확인
- `region_code`, `subregion_code` null 아닌지 확인

### 문제 4: 검색이 안 됨

**원인:** 마이그레이션 미실행 (pg_trgm 인덱스 없음)

**해결:**
```sql
-- Supabase Dashboard > SQL Editor에서 실행
-- supabase/migrations/20250202_add_crawl_boards_search_indexes.sql
```

---

## 📊 예상 결과 스크린샷 체크포인트

### 1. 개발자 노트 - 제출 완료
```
✅ 노란색 뱃지: "대기"
✅ "남양주교육지원청 구인직" 표시
✅ 📍 경기도 > 남양주시
```

### 2. 관리자 페이지 - 제출 승인 탭
```
✅ 제출 목록 (1)
✅ 녹색 "승인" 버튼
✅ 지역 및 학교급 정보 표시
```

### 3. 승인 모달
```
✅ 게시판 이름 및 URL 표시
✅ "승인 시 자동으로..." 안내 문구
✅ 녹색 "승인하기" 버튼
```

### 4. 크롤링 게시판 목록
```
✅ "남양주교육지원청 구인직" 카드
✅ 상태: active, 활성화: 사용
✅ 검색창에 "경기도" 입력 시 4개 결과 (경기도, 성남시, 의정부시, 남양주시)
```

---

## 🎉 성공 기준

모든 체크리스트 항목이 ✅ 되면 워크플로우 테스트 완료!

**최종 확인:**
1. ✅ 개발자가 등록 → 관리자가 승인 → 크롤링 목록에 자동 등록
2. ✅ 지역 정보 자동 복사 (region_code, subregion_code, region_display_name)
3. ✅ 계층적 검색 동작 ("경기도" → 하위 지역 모두 표시)
4. ✅ 관리자는 직접 입력하지 않고 승인만 하면 됨

---

## 📝 다음 단계

테스트가 성공적으로 완료되면:

1. **실제 게시판 추가 테스트**
   - 다양한 지역 (서울, 인천, 부산 등)
   - 다양한 학교급 (초등, 중등, 고등)

2. **거부 기능 추가** (선택사항)
   - 거부 버튼 구현
   - 거부 사유 입력 모달
   - 거부 시 제출자에게 알림

3. **재제출 기능** (선택사항)
   - 거부된 제출을 수정하여 재제출
   - 버전 관리

---

**준비 완료! 테스트를 시작해보세요!** 🚀

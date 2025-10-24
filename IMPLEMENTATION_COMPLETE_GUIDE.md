# 🎯 프로필 연동 완전 구현 가이드

## 완료된 작업 요약

### 1. DB 마이그레이션 ✅
**파일**: `supabase/migrations/20250124_add_school_level_fields.sql`

```sql
-- 학교급, 과목, 라이센스 필드 추가
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS school_level TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS required_license TEXT;

-- 인덱스 추가
CREATE INDEX idx_job_postings_school_level ON job_postings(school_level);
CREATE INDEX idx_job_postings_subject ON job_postings(subject);
CREATE INDEX idx_job_postings_required_license ON job_postings(required_license);
CREATE INDEX idx_job_postings_school_subject ON job_postings(school_level, subject);
```

### 2. 크롤러 수정 ✅
**파일**: 
- `crawler/lib/jobFieldParser.js` (신규 생성)
- `crawler/index.js` (수정)

**변경사항**:
- `jobField` 파싱 함수 구현 (학교급, 과목 추출)
- 크롤러에서 `school_level`, `subject`, `required_license` 저장

**예시**:
```javascript
// "초등 담임" → { schoolLevel: "초등", subject: "담임", requiredLicense: "초등담임" }
// "중등 과학" → { schoolLevel: "중등", subject: "과학", requiredLicense: "중등과학" }
```

### 3. Edge Function 수정 ✅
**파일**: `supabase/functions/profile-recommendations/index.ts`

**변경사항**:
- `UserProfileRow` 타입에 `preferred_subjects`, `preferred_job_types` 추가
- `JobPostingRow` 타입에 `school_level`, `subject`, `required_license` 추가
- `isSchoolLevelCompatible()` 함수 구현 (학교급 호환성 검사)
- `scoreJobCard()`에서 호환성 검사 적용
- `fetchProfile()`에서 `preferred_subjects`, `preferred_job_types` 조회
- `fetchJobCandidates()`에서 `school_level`, `subject`, `required_license` 조회

**호환성 규칙**:
```typescript
초등 담임 → 초등 담임, 초등 전담 (과학/영어/체육/음악/미술/실과) ✅
중등 과학 → 중등 과학, 초등 과학 (상향식 호환) ✅
초등 과학 → 초등 과학만 (중등 X, 담임 X) ✅
```

---

## 배포 절차

### Step 1: DB 마이그레이션 실행

```bash
cd "c:\Users\cgran\OneDrive\MAYNINEE\PRODUCT\Sellme Buyme"

# Supabase 로그인 (처음 한 번만)
supabase login

# 마이그레이션 실행
supabase db push
```

**또는 Supabase 대시보드에서**:
1. https://supabase.com/dashboard → 프로젝트 선택
2. SQL Editor 열기
3. `supabase/migrations/20250124_add_school_level_fields.sql` 내용 복사
4. 실행

### Step 2: Edge Function 배포

```bash
# 프로젝트 루트에서
supabase functions deploy profile-recommendations
```

**성공 메시지**:
```
Deployed Function profile-recommendations on project [프로젝트명]
```

### Step 3: 크롤러 재실행 (기존 데이터 업데이트)

```bash
cd crawler

# 경기도교육청 재크롤링
node index.js --source=gyeonggi

# 성남교육지원청 재크롤링
node index.js --source=seongnam

# 의정부교육지원청 재크롤링
node index.js --source=uijeongbu
```

**목적**: 기존 공고에 `school_level`, `subject`, `required_license` 채우기

---

## 검증 방법

### 1. DB 검증

Supabase 대시보드 → Table Editor → job_postings

```sql
-- 새 필드가 있는지 확인
SELECT school_level, subject, required_license, title, location
FROM job_postings
ORDER BY created_at DESC
LIMIT 10;
```

**예상 결과**:
| school_level | subject | required_license | title | location |
|-------------|---------|------------------|-------|----------|
| 초등 | 담임 | 초등담임 | 초등 담임 기간제 교사 모집 | 성남 |
| 중등 | 과학 | 중등과학 | 중등 과학 교사 모집 | 수원 |

### 2. Edge Function 검증

**개발자도구 → Network**:
```
POST /functions/v1/profile-recommendations
```

**응답 JSON 확인**:
```json
{
  "cards": [
    {
      "id": "xxx",
      "type": "job",
      "title": "초등 담임 기간제 교사",
      "location": "성남"
    }
  ],
  "ai_comment": {
    "headline": "이창건님 프로필에 맞춰 성남·수원·용인 인근 추천...",
    "diagnostics": {
      "selectedCount": 6,
      "discardedCount": 20
    }
  }
}
```

**확인사항**:
- ✅ `cards` 6개 (지역 다양화)
- ✅ 초등 프로필인데 중등/유치원 공고 없음
- ✅ 과목이 일치하는 공고들

### 3. 프론트엔드 검증

1. **프로필 확인**:
   - 프로필 모달 열기
   - `preferred_subjects`: ["초등 담임", "초등 과학", "초등 음악"]
   - `interest_regions`: ["성남", "수원", "용인", "화성", "시흥", "부천"]

2. **추천 섹션 확인**:
   - 상단 AI 추천 카드 6장
   - 지역이 성남·수원·용인·화성·시흥·부천 섞여 있음
   - 초등 공고만 보임 (중등/유치원 없음)

3. **하단 리스트 확인**:
   - 추천된 카드가 상단에 위치
   - 나머지 카드는 일반 정렬

---

## 문제 해결

### 문제 1: 마이그레이션 실행 안 됨
```bash
# 현재 마이그레이션 상태 확인
supabase migration list

# 특정 마이그레이션 재실행
supabase migration up 20250124_add_school_level_fields
```

### 문제 2: Edge Function 배포 실패
```bash
# 로그 확인
supabase functions logs profile-recommendations

# 함수 재배포
supabase functions deploy profile-recommendations --no-verify-jwt
```

### 문제 3: 크롤러에서 jobField 파싱 안 됨
```bash
# 테스트 스크립트 실행
cd crawler
node -e "
const { parseJobField } = require('./lib/jobFieldParser.js');
console.log(parseJobField('초등 담임'));
console.log(parseJobField('중등 과학'));
console.log(parseJobField('유치원'));
"
```

**예상 출력**:
```
{ schoolLevel: '초등', subject: '담임', requiredLicense: '초등담임' }
{ schoolLevel: '중등', subject: '과학', requiredLicense: '중등과학' }
{ schoolLevel: '유치원', subject: null, requiredLicense: '유치원' }
```

### 문제 4: 여전히 중등 공고가 추천됨
**원인**: 기존 공고에 `school_level` 필드가 NULL

**해결**:
1. 크롤러 재실행으로 기존 데이터 업데이트
2. 또는 SQL로 직접 업데이트:
```sql
-- 제목/tags에서 학교급 추출
UPDATE job_postings
SET school_level = '초등'
WHERE (title ILIKE '%초등%' OR '초등' = ANY(tags))
  AND school_level IS NULL;

UPDATE job_postings
SET school_level = '중등'
WHERE (title ILIKE '%중등%' OR '중등' = ANY(tags))
  AND school_level IS NULL;
```

---

## 현재 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| DB 마이그레이션 SQL | ✅ 완료 | 실행 필요 |
| 크롤러 파서 구현 | ✅ 완료 | - |
| 크롤러 저장 로직 | ✅ 완료 | - |
| Edge Function 타입 | ✅ 완료 | - |
| Edge Function 호환성 검사 | ✅ 완료 | - |
| Edge Function 조회 쿼리 | ✅ 완료 | - |
| 프론트엔드 타입 | ✅ 완료 | `profiles.ts` |
| DB 마이그레이션 실행 | ⏳ 대기 | **→ 당신이 실행** |
| Edge Function 배포 | ⏳ 대기 | **→ 당신이 실행** |
| 크롤러 재실행 | ⏳ 대기 | **→ 당신이 실행** |

---

## 최종 확인 체크리스트

- [ ] DB 마이그레이션 실행 완료
- [ ] Edge Function 배포 완료
- [ ] 크롤러 재실행 완료 (최소 1개 소스)
- [ ] job_postings 테이블에 school_level 데이터 확인
- [ ] Network 응답에서 학교급 필터링 확인
- [ ] 초등 프로필로 중등 공고 안 나오는지 확인
- [ ] 지역 다양성 확인 (성남만 나오지 않고 섞여 있는지)
- [ ] AI 코멘트에 intro 반영 확인

---

## 다음 단계 (선택)

### 1. 직종 필터링 추가
`preferred_job_types`를 활용해 기간제/시간제 필터링

### 2. 경력 필터링 추가
`experience_years`를 활용해 경력 수준 맞춤 필터링

### 3. 하단 리스트 프로필 필터 적용
현재는 "승격 정렬"만 적용. 완전한 프로필 필터링은 `searchCards()` 함수 수정 필요.

---

## 요약

**3단계 작업 완료**:
1. ✅ DB 스키마 추가 (school_level, subject, required_license)
2. ✅ 크롤러 수정 (jobField 파싱 + 저장)
3. ✅ Edge Function 수정 (호환성 검사 + 필터링)

**3단계 배포 필요**:
1. ⏳ DB 마이그레이션 실행
2. ⏳ Edge Function 배포
3. ⏳ 크롤러 재실행

**배포 후 결과**:
- 초등 프로필 → 초등 공고만 추천
- 중등 프로필 → 중등 + 초등 해당 과목 추천
- 유치원 프로필 → 유치원만 추천
- 지역 다양성 보장 (라운드 로빈)
- 최신성 우선 (3일 이상 지난 공고 페널티)

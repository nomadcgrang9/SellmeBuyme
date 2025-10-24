# 프로필 & AI 추천 단순화 명세서

**작성일**: 2025년 10월 24일  
**상태**: 계획 수립 (코드 수정 금지)

---

## 🎯 핵심 목표

**"선호"가 아닌 "가능"에 집중**
- 사용자가 **할 수 있는 것**만 입력받음
- 선호 형태, 선호 과목 등 복잡한 옵션 제거
- DB 구조 단순화 및 AI 추천 로직 명확화

---

## 1️⃣ 프로필 필드 재설계

### ❌ 제거할 필드 (3개)

| 필드명 | 제거 이유 |
|-------|---------|
| `primary_region` | interest_regions로 통합 (최선호/부가 구분 불필요) |
| `preferred_job_types` | 선호 형태 불필요 (실제 할 수 있는 것만) |
| `preferred_subjects` | 선호 과목 불필요 → capable_subjects로 대체 |

### ✅ 유지할 필드

```typescript
// 기본 정보
user_id: string
display_name: string
phone: string
profile_image_url: string

// 역할 & 학교급
roles: string[]                    // ["교사", "강사"]
teacher_level: string              // "유치원" | "초등" | "중등" | "특수"
special_education_type: string     // "초등특수" | "중등특수" (특수교사만)

// 강사
instructor_fields: string[]        // ["요리", "코딩", "AI교육"]
instructor_custom_field: string    // 자유 입력

// 지역
interest_regions: string[]         // ["남양주", "의정부"]

// 경력 & 소개
experience_years: number
intro: string

// 약관
agree_terms: boolean
agree_privacy: boolean
agree_marketing: boolean
receive_notifications: boolean

// 타임스탬프
created_at: timestamp
updated_at: timestamp
```

### 🆕 추가할 필드 (1개)

```typescript
capable_subjects: string[]  // 담당 가능한 교과 (필수)
```

**예시**:
- 초등 담임: `["초등 담임"]`
- 중등 국어: `["중등 국어"]`
- 중등 과학+영어: `["중등 과학", "중등 영어"]`
- 유치원: `["유치원 담임"]`
- 초등특수: `["초등 특수"]`

---

## 2️⃣ 현재 데이터 문제점

### 📊 실제 사용자 데이터 분석

```json
{
  "teacher_level": "중등",
  "special_education_type": null,  // ❌ 비어있음!
  "primary_region": "남양주",      // ❌ 제거 예정
  "interest_regions": ["의정부"],
  "preferred_job_types": ["기간제 교사"],  // ❌ 제거 예정
  "preferred_subjects": [            // ❌ 제거 예정
    "중등 국어", "중등 수학", "중등 사회", "중등 도덕",
    "중등 과학", "중등 영어", "중등 미술", "중등 음악",
    "중등 체육", "중등 기술·가정", "중등 정보",
    "담임", "과학", "영어", "미술", "음악", "실과", 
    "체육", "국어", "수학", "도덕", "사회", "기술·가정"
  ]
}
```

### 🔴 문제점

1. **special_education_type이 null**: 특수교사 여부 확인 불가
2. **preferred_subjects 혼란**: "중등 국어" + "국어" 중복, 선호가 아닌 담당가능 교과여야 함
3. **primary_region 불필요**: interest_regions로 충분

### ✅ 개선 후 예상 데이터

```json
{
  "teacher_level": "중등",
  "special_education_type": null,
  "interest_regions": ["남양주", "의정부"],
  "capable_subjects": [
    "중등 국어", "중등 과학", "중등 영어"
  ]
}
```

---

## 3️⃣ DB 구조 복잡성 문제

### 현재 구조 (문제)

```
┌─────────────────────┐
│  공고 DB             │
│  (job_postings)     │
│                     │
│  - school_level     │
│  - subject          │
│  - required_license │
│  - location         │
└─────────────────────┘
         ↓
    복잡한 매칭 로직
         ↓
┌─────────────────────┐
│  Edge Function      │
│  (profile-          │
│   recommendations)  │
│                     │
│  - 600+ 라인        │
│  - 여러 로직 혼재   │
└─────────────────────┘
         ↓
    양분된 구조
         ↓
┌─────────────────────┐
│  프로필 DB           │
│  (user_profiles)    │
│                     │
│  - 23개 필드        │
│  - preferred_*      │
│  - primary_region   │
└─────────────────────┘
         ↓
┌─────────────────────┐
│  추천 캐시 DB        │
│  (recommendations_  │
│   cache)            │
└─────────────────────┘
```

### 개선 방향

1. **필드 단순화**: 23개 → 18개 (5개 제거/1개 추가)
2. **Edge Function 단순화**: 
   - `isSchoolLevelCompatible()` 로직 개선
   - `scoreJobCard()` 필드 변경 대응
   - `generateAiComment()` 주석 정리

3. **Frontend 단순화**:
   - ProfileStep3Preferences 제거/변경
   - profiles.ts 타입 정의 수정

---

## 4️⃣ 문서 복잡성 문제

### 현재 문서 (8개)

```
AI_RECOMMENDATION_PLAN.md
AI_RECOMMENDATION_ANALYSIS_SUMMARY.md
AI_RECOMMENDATION_PROFILE_INTEGRATION_PART1.md
AI_RECOMMENDATION_PROFILE_INTEGRATION_PART2.md
SEARCH_SYSTEM_REDESIGN.md
IMPLEMENTATION_COMPLETE_GUIDE.md
DB_FIELD_SYNC_CHECK.md
BACKEND_STRUCTURE.md
```

### 개선: 3개로 통합

```
1. PROFILE_SIMPLIFICATION_SPEC.md (이 문서)
   - 프로필 필드 정의
   - DB 스키마
   - 단순화 계획

2. AI_RECOMMENDATION_LOGIC.md
   - AI 추천 로직
   - Edge Function 명세
   - 매칭 규칙

3. IMPLEMENTATION_CHECKLIST.md
   - 구현 체크리스트
   - 마이그레이션 순서
   - 테스트 항목
```

---

## 5️⃣ 관련 파일 매핑

### DB 관련

| 파일 | 용도 | 수정 필요 |
|------|------|----------|
| `supabase/migrations/20250123_extend_user_profiles_schema.sql` | 프로필 필드 정의 | ✅ 신규 마이그레이션 필요 |
| `supabase/migrations/20250120_add_recommendations_cache.sql` | 추천 캐시 | ⚠️ profile_snapshot 수정 |

### Backend 관련

| 파일 | 용도 | 수정 필요 |
|------|------|----------|
| `supabase/functions/profile-recommendations/index.ts` | AI 추천 Edge Function | ✅ 필드 변경 대응 |
| `src/lib/supabase/profiles.ts` | 프로필 타입 & API | ✅ 타입 정의 수정 |

### Frontend 관련

| 파일 | 용도 | 수정 필요 |
|------|------|----------|
| `src/components/auth/ProfileStep3Preferences.tsx` | 선호도 입력 UI | ✅ 제거 또는 대폭 수정 |
| `src/components/auth/ProfileStep2Field.tsx` | 담당가능 교과 입력 | ✅ UI 개선 |
| `src/components/auth/ProfileSetupModal.tsx` | 프로필 설정 모달 | ✅ State 변경 |

---

## 6️⃣ AI 추천 로직 단순화

### 현재 로직 (복잡)

```typescript
// Edge Function에서
if (!isSchoolLevelCompatible(
  profile.preferred_subjects,  // ❌ 선호 과목
  job.school_level,
  job.subject
)) {
  return { score: -999, ... };
}
```

### 개선 로직 (단순)

```typescript
// Edge Function에서
if (!isCapableOfTeaching(
  profile.capable_subjects,    // ✅ 담당가능 교과
  job.school_level,
  job.subject
)) {
  return { score: -999, ... };
}
```

### 매칭 규칙

| 프로필 | 공고 학교급 | 공고 과목 | 매칭 |
|-------|----------|----------|------|
| 초등 담임 | 초등 | (any) | ✅ |
| 중등 국어 | 중등 | 국어 | ✅ |
| 중등 국어 | 중등 | 과학 | ❌ |
| 중등 과학 | 초등 | 과학 | ✅ (상향식) |
| 유치원 담임 | 유치원 | (any) | ✅ |

---

## 7️⃣ 구현 순서

### Phase 1: DB 마이그레이션 (우선)

1. **신규 마이그레이션 생성**
```sql
-- 20250125_simplify_user_profiles.sql
ALTER TABLE user_profiles DROP COLUMN primary_region;
ALTER TABLE user_profiles DROP COLUMN preferred_job_types;
ALTER TABLE user_profiles DROP COLUMN preferred_subjects;
ALTER TABLE user_profiles ADD COLUMN capable_subjects text[];

COMMENT ON COLUMN user_profiles.capable_subjects IS '담당 가능한 교과 (필수)';
```

2. **기존 데이터 마이그레이션**
```sql
-- preferred_subjects → capable_subjects 변환
UPDATE user_profiles
SET capable_subjects = preferred_subjects
WHERE preferred_subjects IS NOT NULL;
```

### Phase 2: Backend 수정

1. **profiles.ts 타입 수정**
```typescript
export type UserProfileRow = {
  // ... 기존 필드
  // primary_region: string | null;  ❌ 제거
  interest_regions: string[] | null;
  // preferred_job_types: string[] | null;  ❌ 제거
  // preferred_subjects: string[] | null;   ❌ 제거
  capable_subjects: string[] | null;  // ✅ 추가
  // ...
};
```

2. **Edge Function 수정**
   - `UserProfileRow` 타입 동기화
   - `isSchoolLevelCompatible()` → `isCapableOfTeaching()` 함수명 변경
   - `preferred_subjects` → `capable_subjects` 필드명 변경

### Phase 3: Frontend 수정

1. **ProfileStep3Preferences.tsx**
   - 선호 직종 섹션 제거
   - 선호 과목 섹션 제거
   - 선호 지역만 유지

2. **ProfileStep2Field.tsx**
   - 담당가능 교과 입력 UI 개선
   - 스샷3처럼 학교급별 과목 선택

3. **ProfileSetupModal.tsx**
   - State 변경: preferredJobTypes, preferredSubjects 제거
   - capableSubjects 추가

### Phase 4: 문서 정리

1. **통합 문서 생성**
   - PROFILE_SIMPLIFICATION_SPEC.md (이 문서)
   - AI_RECOMMENDATION_LOGIC.md
   - IMPLEMENTATION_CHECKLIST.md

2. **기존 문서 아카이브**
   - docs/archive/ 폴더로 이동
   - README.md에 최신 문서 링크

---

## 8️⃣ 테스트 시나리오

### 시나리오 1: 중등 교사

**입력**:
- teacher_level: "중등"
- capable_subjects: ["중등 국어", "중등 영어"]
- interest_regions: ["성남", "수원"]

**기대 결과**:
- ✅ 성남/수원 중등 국어 공고 추천
- ✅ 성남/수원 중등 영어 공고 추천
- ❌ 초등 공고 제외 (상향식 제외)
- ❌ 중등 과학 공고 제외

### 시나리오 2: 초등 담임

**입력**:
- teacher_level: "초등"
- capable_subjects: ["초등 담임"]
- interest_regions: ["남양주"]

**기대 결과**:
- ✅ 남양주 + 인접지역(의정부, 구리) 초등 공고 추천
- ✅ 초등 전 과목 가능
- ❌ 중등 공고 제외

### 시나리오 3: 특수 교사

**입력**:
- teacher_level: "특수"
- special_education_type: "초등특수"
- capable_subjects: ["초등 특수"]
- interest_regions: ["서울"]

**기대 결과**:
- ✅ 서울 + 인접지역 특수 공고 추천
- ✅ 초등특수 필터링
- ❌ 중등특수 제외

---

## 9️⃣ 예상 효과

| 항목 | 현재 | 개선 후 |
|------|------|--------|
| 프로필 필드 수 | 23개 | 19개 (-4개) |
| 사용자 입력 스텝 | 복잡 (선호 형태/과목) | 단순 (담당가능 교과만) |
| Edge Function 복잡도 | 높음 (600+ 라인) | 중간 (로직 명확화) |
| AI 추천 정확도 | 낮음 (선호 vs 가능 혼란) | 높음 (담당가능 교과 명확) |
| 문서 복잡도 | 높음 (8개 MD) | 낮음 (3개 MD) |

---

## 🔟 체크리스트

- [ ] DB 마이그레이션 작성
- [ ] profiles.ts 타입 수정
- [ ] Edge Function 필드 변경
- [ ] ProfileStep3Preferences.tsx 수정
- [ ] ProfileStep2Field.tsx UI 개선
- [ ] ProfileSetupModal.tsx State 변경
- [ ] 문서 통합 (3개로)
- [ ] 테스트 시나리오 실행
- [ ] 기존 사용자 데이터 마이그레이션

---

## 📚 참고 문서

- `DB_FIELD_SYNC_CHECK.md`: 현재 필드 상태
- `supabase/functions/profile-recommendations/index.ts`: Edge Function 구현
- `src/components/auth/`: 프로필 입력 UI 컴포넌트

# 이슈 분석 및 해결 - 2025.01.24

## 📋 요청 사항

1. **STEP2 초등 과목 선택 UI 삭제**
   - "어떤 초등 과목을 맡으실 수 있나요?" 삭제
   - 백엔드 상태 확인

2. **추천 실패 원인 파악**
   - Edge Function 에러 분석

---

## ✅ 완료: STEP2 UI 삭제

### 변경 내용
**파일**: `src/components/auth/ProfileStep2Field.tsx` (라인 209-232)

**Before**:
```tsx
{teacherLevel === "초등" && (
  <div className="space-y-3">
    <span className="text-sm font-semibold text-gray-900">
      어떤 초등 과목을 맡으실 수 있나요?
    </span>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {ELEMENTARY_SUBJECTS.map((subject) => {
        // 초등 담임, 초등 과학, 초등 영어 등 선택 버튼
      })}
    </div>
  </div>
)}
```

**After**:
```tsx
{teacherLevel === "초등" && (
  <div className="space-y-2">
    <span className="text-sm text-gray-600">
      초등 담임 기준으로 추천해 드릴게요.
    </span>
  </div>
)}
```

### 이유
- 이미 `handleTeacherLevelSelect` 함수에서 초등 선택 시 자동으로 `["초등 담임"]`을 `capable_subjects`에 저장
- 중복 UI 제거하여 UX 단순화
- 유치원과 동일한 패턴 적용

---

## 🔍 백엔드 상태 확인

### 1. 데이터베이스 스키마 (`user_profiles` 테이블)

**마이그레이션 파일**: `supabase/migrations/20250125_simplify_user_profiles.sql`

```sql
-- ✅ 추가된 필드
capable_subjects TEXT[]  -- 담당 가능한 교과

-- ❌ 제거된 필드  
primary_region TEXT
preferred_job_types TEXT[]
preferred_subjects TEXT[]

-- ✅ 인덱스
CREATE INDEX idx_user_profiles_capable_subjects 
  ON user_profiles USING GIN(capable_subjects);
```

**저장 로직**:
- 초등 선택 시: `["초등 담임"]` 자동 저장
- 중등 선택 시: 사용자가 선택한 과목들 저장 (예: `["중등 국어", "중등 영어"]`)
- 유치원 선택 시: `["유치원 담임"]` 자동 저장
- 특수 선택 시: `["초등특수"]` 또는 `["중등특수"]` 저장

### 2. Edge Function (`profile-recommendations/index.ts`)

**프로필 조회 쿼리** (라인 560-583):
```typescript
const { data, error } = await client
  .from('user_profiles')
  .select('user_id, display_name, roles, interest_regions, 
           experience_years, intro, capable_subjects, 
           teacher_level, updated_at')
  .eq('user_id', userId)
  .maybeSingle<UserProfileRow>();
```

**TypeScript 타입** (라인 79-88):
```typescript
type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  roles: string[] | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  intro: string | null;
  capable_subjects: string[] | null;  // ✅ 사용 중
  teacher_level: string | null;
  updated_at: string;
};
```

**추천 캐시 저장** (라인 722-729):
```typescript
profile_snapshot: {
  display_name: profile.display_name,
  roles: profile.roles ?? [],
  interest_regions: profile.interest_regions ?? [],
  capable_subjects: profile.capable_subjects ?? [],  // ✅ 저장됨
  teacher_level: profile.teacher_level,
  generated_from: profile.updated_at
}
```

### 3. `job_postings` 테이블 스키마

**현재 필드** (라인 90-103):
```typescript
type JobPostingRow = {
  id: string;
  organization: string;
  title: string;
  tags: string[] | null;
  location: string;
  compensation: string | null;
  deadline: string | null;
  is_urgent: boolean | null;
  created_at: string;
  school_level: string | null;       // ✅ 학교급 필드 존재
  subject: string | null;             // ✅ 과목 필드 존재
  required_license: string | null;    // ✅ 필수 라이센스 필드 존재
};
```

**공고 조회 쿼리** (라인 586-592):
```typescript
const { data, error } = await client
  .from('job_postings')
  .select('id, organization, title, tags, location, compensation, 
           deadline, is_urgent, created_at, 
           school_level, subject, required_license')  // ✅ 3개 필드 조회
  .order('is_urgent', { ascending: false })
  .limit(60);
```

---

## 🔴 추천 실패 원인 분석

### 에러 메시지
```
추천 생성 실패: FunctionsHttpError: Edge Function returned a non-2xx status code
```

### 가능한 원인

#### 1. ❌ **마이그레이션 미적용** (가장 가능성 높음)
```bash
# 상태: 마이그레이션 파일은 생성됨
20250125_simplify_user_profiles.sql

# 문제: Supabase DB에 적용되지 않음
# 결과: capable_subjects 컬럼이 존재하지 않음
```

**증상**:
- Edge Function의 `fetchProfile`에서 `capable_subjects` 조회 시도
- DB에 `capable_subjects` 컬럼이 없음
- PostgreSQL 에러 발생 → 500 에러 반환

**해결 방법**:
```bash
# Supabase CLI로 마이그레이션 적용
supabase db push

# 또는 Supabase Dashboard에서 SQL 직접 실행
```

#### 2. ⚠️ **프로필 없음**
Edge Function 라인 575-580:
```typescript
if (!data) {
  throw new Response(
    JSON.stringify({ message: '프로필이 아직 등록되지 않았습니다.' }), 
    { status: 404 }
  );
}
```

**해결**: 프로필 등록 완료 후 재시도

#### 3. ⚠️ **RLS 정책 문제**
- `user_profiles` 테이블에 대한 읽기 권한 부족
- Edge Function의 서비스 role 권한 확인 필요

#### 4. ⚠️ **job_postings 테이블 필드 누락**
- `school_level`, `subject`, `required_license` 컬럼이 실제 DB에 없을 수 있음
- 마이그레이션 `20250124_add_school_level_fields.sql` 미적용 가능성

---

## 🎯 즉시 해결 방법

### Step 1: 마이그레이션 상태 확인
Supabase Dashboard → SQL Editor에서 실행:

```sql
-- user_profiles 테이블 스키마 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public';

-- capable_subjects 컬럼 존재 확인
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.columns 
  WHERE table_name = 'user_profiles' 
  AND column_name = 'capable_subjects'
  AND table_schema = 'public'
) AS capable_subjects_exists;

-- job_postings 테이블 스키마 확인
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'job_postings' 
AND table_schema = 'public'
AND column_name IN ('school_level', 'subject', 'required_license');
```

### Step 2: 마이그레이션 적용 (필요 시)

#### A. capable_subjects가 없다면:
```sql
-- 20250125_simplify_user_profiles.sql 내용 실행
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS capable_subjects TEXT[];

CREATE INDEX IF NOT EXISTS idx_user_profiles_capable_subjects 
ON public.user_profiles USING GIN(capable_subjects);
```

#### B. school_level 등이 없다면:
```sql
-- 20250124_add_school_level_fields.sql 실행
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS school_level TEXT,
ADD COLUMN IF NOT EXISTS subject TEXT,
ADD COLUMN IF NOT EXISTS required_license TEXT;
```

### Step 3: Edge Function 로그 확인
Supabase Dashboard → Edge Functions → profile-recommendations → Logs

에러 로그에서 정확한 실패 원인 확인:
- `프로필 조회 실패` → DB 연결 또는 RLS 문제
- `공고 후보 조회 실패` → job_postings 테이블 문제
- `Column does not exist` → 마이그레이션 미적용

### Step 4: 프로필 재등록
1. 로그아웃
2. 다시 로그인
3. 프로필 설정 모달에서 정보 입력
4. 저장 후 메인 페이지에서 추천 확인

---

## 📊 백엔드 구조 요약

### 데이터 흐름
```
1. 프로필 입력 (프론트엔드)
   └─> ProfileSetupModal
       └─> Step1: 이름, 역할, 약관
       └─> Step2: 학교급 선택 → capable_subjects 자동 설정
       └─> Step3: 관심 지역, 자기소개

2. 프로필 저장 (백엔드)
   └─> src/lib/supabase/profiles.ts
       └─> upsertUserProfile()
           └─> user_profiles 테이블에 저장
               - capable_subjects: ["초등 담임"] 등

3. 추천 생성 (Edge Function)
   └─> profile-recommendations/index.ts
       └─> fetchProfile() → user_profiles 조회 (capable_subjects 포함)
       └─> fetchJobCandidates() → job_postings 조회
       └─> scoreJobCard() → 점수 계산
       └─> upsertRecommendations() → 추천 캐시 저장
```

### 테이블 관계
```
user_profiles (사용자 프로필)
├─ capable_subjects: ["초등 담임", "초등 과학"]
├─ teacher_level: "초등"
└─ interest_regions: ["수원", "화성"]

job_postings (공고)
├─ school_level: "초등"
├─ subject: "과학"
└─ required_license: "초등 과학"

recommendations_cache (추천 결과)
├─ user_id
├─ cards: [...]
├─ ai_comment: {...}
└─ profile_snapshot: {capable_subjects, ...}
```

---

## ✅ 완료된 작업

1. ✅ STEP2 초등 과목 선택 UI 삭제
2. ✅ 백엔드 상태 확인 및 문서화
3. ✅ 추천 실패 원인 파악
4. ✅ 해결 방법 제시

---

## 🚀 다음 단계

1. **즉시**: Supabase DB에서 마이그레이션 상태 확인
2. **필요 시**: 마이그레이션 적용
3. **테스트**: 프로필 재등록 후 추천 기능 확인
4. **확인**: Edge Function 로그에서 에러 사라졌는지 체크

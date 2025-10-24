# 구현 체크리스트

**작성일**: 2025년 10월 24일

---

## Phase 1: DB 마이그레이션

### 1-1. 신규 마이그레이션 작성
```bash
파일: supabase/migrations/20250125_simplify_user_profiles.sql
```

```sql
-- 필드 제거
ALTER TABLE user_profiles DROP COLUMN IF EXISTS primary_region;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS preferred_job_types;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS preferred_subjects;

-- 필드 추가
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS capable_subjects text[];

-- 주석
COMMENT ON COLUMN user_profiles.capable_subjects IS '담당 가능한 교과 (필수)';

-- 데이터 마이그레이션
UPDATE user_profiles
SET capable_subjects = preferred_subjects
WHERE preferred_subjects IS NOT NULL AND capable_subjects IS NULL;
```

### 1-2. 마이그레이션 실행
```bash
cd supabase
supabase db push
```

---

## Phase 2: Backend 수정

### 2-1. profiles.ts 타입 수정
```typescript
// src/lib/supabase/profiles.ts

export type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  roles: string[] | null;
  interest_regions: string[] | null;  // primary_region 제거
  experience_years: number | null;
  capable_subjects: string[] | null;  // 추가
  teacher_level: string | null;
  special_education_type: string | null;
  instructor_fields: string[] | null;
  instructor_custom_field: string | null;
  profile_image_url: string | null;
  intro: string | null;
  receive_notifications: boolean | null;
  agree_terms: boolean | null;
  agree_privacy: boolean | null;
  agree_marketing: boolean | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpsertInput = {
  displayName: string;
  phone?: string | null;
  roles: string[];
  interestRegions: string[];
  experienceYears?: number | null;
  capableSubjects?: string[];  // 추가
  teacherLevel?: string | null;
  specialEducationType?: string | null;
  instructorFields?: string[] | null;
  instructorCustomField?: string | null;
  profileImageUrl?: string | null;
  intro?: string;
  receiveNotifications: boolean;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
};

export async function upsertUserProfile(userId: string, payload: ProfileUpsertInput) {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: userId,
      display_name: payload.displayName,
      phone: payload.phone || null,
      roles: payload.roles,
      interest_regions: payload.interestRegions,
      experience_years: payload.experienceYears,
      capable_subjects: payload.capableSubjects || null,  // 추가
      teacher_level: payload.teacherLevel || null,
      special_education_type: payload.specialEducationType || null,
      instructor_fields: payload.instructorFields || null,
      instructor_custom_field: payload.instructorCustomField || null,
      profile_image_url: payload.profileImageUrl || null,
      intro: payload.intro || null,
      receive_notifications: payload.receiveNotifications,
      agree_terms: payload.agreeTerms,
      agree_privacy: payload.agreePrivacy,
      agree_marketing: payload.agreeMarketing
    }, { onConflict: 'user_id' })
    .select()
    .maybeSingle<UserProfileRow>();

  return { data: data || null, error };
}
```

### 2-2. Edge Function 수정
```typescript
// supabase/functions/profile-recommendations/index.ts

// 타입 정의
type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  roles: string[] | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  intro: string | null;
  capable_subjects: string[] | null;  // 추가
  teacher_level: string | null;       // 추가
  updated_at: string;
};

// fetchProfile 수정
async function fetchProfile(client, userId) {
  const { data, error} = await client
    .from('user_profiles')
    .select('user_id, display_name, roles, interest_regions, experience_years, intro, capable_subjects, teacher_level, updated_at')
    .eq('user_id', userId)
    .maybeSingle<UserProfileRow>();
  
  return data;
}

// isSchoolLevelCompatible → isCapableOfTeaching 함수명 변경
function isCapableOfTeaching(
  capableSubjects: string[] | null | undefined,
  jobSchoolLevel: string | null | undefined,
  jobSubject: string | null | undefined
): boolean {
  if (!jobSchoolLevel) return true;
  if (!capableSubjects || capableSubjects.length === 0) return true;
  
  // 호환성 로직 (기존 유지)
  // ...
}

// scoreJobCard 수정
function scoreJobCard(profile, job, preferredRegions) {
  // primary_region 제거
  const interestRegions = profile.interest_regions ?? [];
  let score = 0;

  if (job.location && matchesPreferredRegion(job.location, preferredRegions)) {
    score += 8;
  }

  // 호환성 검사 (함수명 변경)
  if (!isCapableOfTeaching(profile.capable_subjects, job.school_level, job.subject)) {
    return { score: -999, card: { ... } };
  }

  // capable_subjects 사용
  if (profile.capable_subjects && profile.capable_subjects.length > 0) {
    const capableSet = toLowerSet(profile.capable_subjects);
    const jobSubj = job.subject?.toLowerCase();
    if (jobSubj && capableSet.has(jobSubj)) {
      score += 10;
    }
  }

  // ...
}

// generateAiComment 수정
function generateAiComment(profile, selected, discardedCount) {
  const interestRegions = profile.interest_regions ?? [];
  const regionPhrase = /* 지역 추출 로직 */;
  const capableSubjects = profile.capable_subjects ?? [];
  const subjectText = capableSubjects.slice(0, 3).join(', ');
  
  const description = `담당가능: ${subjectText} | 지역: ${regionPhrase}`;
  // ...
}
```

---

## Phase 3: Frontend 수정

### 3-1. ProfileSetupModal State 수정
```typescript
// src/components/auth/ProfileSetupModal.tsx

const [capableSubjects, setCapableSubjects] = useState<string[]>([]);

// preferredJobTypes, preferredSubjects State 제거
```

### 3-2. ProfileStep2Field 수정
```typescript
// 스샷3 UI 참고하여 담당가능 교과 입력
// 학교급 선택 → 해당 학교급 과목 표시
```

### 3-3. ProfileStep3 수정
```typescript
// ProfileStep3Preferences.tsx
// - 선호 직종 섹션 제거
// - 선호 과목 섹션 제거
// - 선호 지역만 유지
```

---

## Phase 4: 문서 정리

### 4-1. 아카이브
```bash
mkdir -p docs/archive
mv AI_RECOMMENDATION_PLAN.md docs/archive/
mv AI_RECOMMENDATION_ANALYSIS_SUMMARY.md docs/archive/
mv AI_RECOMMENDATION_PROFILE_INTEGRATION_PART1.md docs/archive/
mv AI_RECOMMENDATION_PROFILE_INTEGRATION_PART2.md docs/archive/
mv SEARCH_SYSTEM_REDESIGN.md docs/archive/
```

### 4-2. 최신 문서
- ✅ PROFILE_SIMPLIFICATION_SPEC.md
- ✅ AI_RECOMMENDATION_LOGIC.md
- ✅ IMPLEMENTATION_CHECKLIST.md (이 문서)

---

## Phase 5: 테스트

### 5-1. DB 확인
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles';

-- capable_subjects 컬럼 확인
SELECT user_id, capable_subjects, interest_regions 
FROM user_profiles 
LIMIT 5;
```

### 5-2. 프로필 입력 테스트
- 초등 담임 입력
- 중등 국어 입력
- 유치원 입력

### 5-3. AI 추천 테스트
- 각 프로필별 추천 결과 확인
- 호환성 검사 동작 확인

---

## 체크리스트

- [ ] DB 마이그레이션 작성
- [ ] DB 마이그레이션 실행
- [ ] profiles.ts 타입 수정
- [ ] Edge Function 수정
- [ ] ProfileSetupModal State 수정
- [ ] ProfileStep2Field UI 수정
- [ ] ProfileStep3Preferences 수정
- [ ] 문서 아카이브
- [ ] DB 확인 쿼리 실행
- [ ] 프로필 입력 테스트
- [ ] AI 추천 결과 확인

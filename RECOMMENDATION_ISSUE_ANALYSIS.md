# 🔴 AI 추천 문제 분석 - 초등 교사에게 중등 공고 추천되는 이유

**작성일**: 2025-01-24  
**상태**: 원인 분석 완료 + 해결책 제시

---

## 📊 현재 상황

### DB 상태 (✅ 정상)
```
school_level 채움률: 100% (29/29)
초등: 14개 (48.28%)
중등: 6개 (20.69%)
고등: 6개 (20.69%)
유치원: 3개 (10.34%)
```

### 사용자 프로필
```
선택: 초등 교사
기대: 초등 공고만 추천
실제: 중등 공고도 함께 추천됨 ❌
```

---

## 🔍 문제 원인 분석

### 1단계: Edge Function 로직 확인

**파일**: `supabase/functions/profile-recommendations/index.ts`

#### 필터링 함수 (라인 205-286)
```typescript
function isCapableOfTeaching(
  capableSubjects: string[] | null | undefined,
  jobSchoolLevel: string | null | undefined,
  jobSubject: string | null | undefined
): boolean {
  // 공고에 학교급 정보가 없으면 포함(호환성 검사 불가)
  if (!jobSchoolLevel) return true;
  
  // 🔴 핵심 문제: 프로필에 capable_subjects가 없으면 포함
  if (!capableSubjects || capableSubjects.length === 0) return true;
  
  // ... 호환성 매트릭스 검사
}
```

**문제점**: 
- `capable_subjects`가 null이거나 빈 배열이면 **모든 공고를 통과시킴**
- 이로 인해 초등/중등/유치원 공고가 모두 추천됨

---

### 2단계: 프로필 저장 로직 확인

**파일**: `src/components/auth/ProfileStep2Field.tsx`

#### 학교급 선택 시 (라인 111-129)
```typescript
const handleTeacherLevelSelect = (level: TeacherLevel) => {
  onTeacherLevelChange(level);
  onSpecialEducationTypeChange(null);

  if (level === "유치원") {
    onTeacherSubjectsChange(["유치원 담임"]);
    onSyncCapableSubjects(["유치원 담임"]); // ✅ 저장됨
  } else if (level === "초등") {
    onTeacherSubjectsChange(["초등 담임"]);
    onSyncCapableSubjects(["초등 담임"]); // ✅ 저장됨
  } else {
    onTeacherSubjectsChange([]);
    onSyncCapableSubjects([]); // ❌ 중등 선택 시 빈 배열!
  }
};
```

**문제점**:
1. 초등 선택: `capableSubjects = ["초등 담임"]` ✅
2. **중등 선택**: `capableSubjects = []` ❌ → 사용자가 과목 선택할 때까지 빈 배열
3. 중등 과목 선택 (라인 131-138): 과목을 선택하면 `capableSubjects`가 채워짐 ✅

**시나리오**:
- 사용자가 "초등 교사"를 선택했지만 프로필을 **바로 저장**한 경우
- `capableSubjects = []` 상태로 저장됨
- Edge Function이 이를 "호환성 검사 불가"로 판단하여 모든 공고 통과

---

### 3단계: 캐시 재생성 확인

**파일**: `src/components/auth/ProfileSetupModal.tsx`

#### 프로필 저장 후 (라인 242-254)
```typescript
const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData?.session?.access_token;

if (accessToken) {
  await supabase.functions.invoke('profile-recommendations', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  console.log('[PROFILE SAVE] Recommendations refreshed');
}
```

**확인 필요**:
- Edge Function 호출이 성공했는지?
- 캐시가 재생성되었는지?
- 오류가 발생했는지?

---

## 🎯 근본 원인 (3가지 가능성)

### 가능성 1: 프로필에 `capable_subjects`가 저장 안 됨 (가장 높음)
```
사용자 행동:
1. "초등 교사" 선택 → capableSubjects = ["초등 담임"]
2. 바로 다음 단계로 넘어감
3. 저장 클릭
4. capableSubjects가 저장은 되었지만, 사용자가 나중에 "중등 교사"로 변경
5. 중등 과목을 선택하지 않고 저장 → capableSubjects = []
```

### 가능성 2: 캐시가 재생성 안 됨
```
Edge Function 호출 실패:
- 네트워크 오류
- 인증 토큰 만료
- Function 타임아웃
→ 오래된 캐시가 계속 사용됨
```

### 가능성 3: Edge Function 로직 버그
```
호환성 매트릭스가 잘못됨:
- 초등 담임 → 중등 공고 허용 (버그)
- 하지만 코드 리뷰 결과 로직은 정상
```

---

## ✅ 해결책

### 즉시 해결 (사용자)
#### Step 1: 프로필 재확인
```sql
-- Supabase SQL Editor에서 실행
SELECT user_id, display_name, teacher_level, capable_subjects
FROM user_profiles
WHERE user_id = 'YOUR_USER_ID';
```

**확인사항**:
- `teacher_level`: "초등"인지 확인
- `capable_subjects`: `["초등 담임"]`이 저장되어 있는지 확인

#### Step 2: 캐시 강제 삭제
```sql
-- Supabase SQL Editor에서 실행
DELETE FROM recommendations_cache
WHERE user_id = 'YOUR_USER_ID';
```

#### Step 3: 프로필 재저장
1. 프로필 수정 모달 열기
2. "초등 교사" 다시 선택 (확실하게)
3. 저장 클릭
4. 페이지 새로고침

---

### 근본 해결 (코드 수정)

#### 수정 1: Edge Function - 기본 동작 변경
**파일**: `supabase/functions/profile-recommendations/index.ts`

**현재** (라인 210-214):
```typescript
// 공고에 학교급 정보가 없으면 포함(호환성 검사 불가)
if (!jobSchoolLevel) return true;

// 프로필에 capable_subjects가 없으면 포함
if (!capableSubjects || capableSubjects.length === 0) return true;
```

**개선안**:
```typescript
// 공고에 학교급 정보가 없으면 포함(호환성 검사 불가)
if (!jobSchoolLevel) return true;

// 🔴 변경: 프로필에 capable_subjects가 없으면 teacher_level 기준으로 필터링
if (!capableSubjects || capableSubjects.length === 0) {
  // teacher_level이 있으면 이를 기준으로 필터링
  const profileLevel = profile.teacher_level?.toLowerCase();
  if (profileLevel) {
    const jobLevel = jobSchoolLevel.toLowerCase();
    // 정확히 일치해야만 통과
    return profileLevel === jobLevel;
  }
  // teacher_level도 없으면 제외 (안전 우선)
  return false;
}
```

#### 수정 2: 프로필 저장 시 검증 강화
**파일**: `src/components/auth/ProfileSetupModal.tsx`

**추가** (라인 165 이후):
```typescript
const canSubmit =
  Boolean(name.trim()) &&
  roles.length > 0 &&
  interestRegions.length > 0 &&
  agreeTerms &&
  agreePrivacy &&
  !!userId &&
  // 🔴 추가: 교사 역할이면 teacher_level 필수
  (!roles.includes('교사') || teacherLevel !== null) &&
  // 🔴 추가: 중등 교사면 과목 선택 필수
  (teacherLevel !== '중등' || capableSubjects.length > 0);
```

#### 수정 3: 캐시 재생성 실패 시 알림
**파일**: `src/components/auth/ProfileSetupModal.tsx`

**개선** (라인 247-254):
```typescript
if (accessToken) {
  try {
    const { data: funcData, error: funcError } = await supabase.functions.invoke('profile-recommendations', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    
    if (funcError) {
      console.error('[PROFILE SAVE] Recommendations refresh failed:', funcError);
      showToast('프로필은 저장되었으나 추천 업데이트에 실패했습니다. 페이지를 새로고침해주세요.', 'warning');
    } else {
      console.log('[PROFILE SAVE] Recommendations refreshed successfully');
    }
  } catch (error) {
    console.error('[PROFILE SAVE] Recommendations refresh exception:', error);
  }
}
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 초등 담임 프로필
```
1. "교사" 역할 선택
2. "초등 교사" 선택
3. 저장
4. 확인: capable_subjects = ["초등 담임"]
5. 추천 확인: 초등 공고만 나와야 함
```

### 시나리오 2: 중등 과목 교사 프로필
```
1. "교사" 역할 선택
2. "중등 교사" 선택
3. "중등 과학" 과목 선택
4. 저장
5. 확인: capable_subjects = ["중등 과학"]
6. 추천 확인: 중등 과학 + 초등 과학 공고만 나와야 함
```

### 시나리오 3: 중등 교사 + 과목 미선택 (엣지 케이스)
```
1. "교사" 역할 선택
2. "중등 교사" 선택
3. 과목 선택 안 함
4. 저장 시도 → ❌ 저장 불가 (검증 강화)
5. 에러 메시지: "중등 교사는 담당 과목을 선택해야 합니다"
```

---

## 📌 즉시 확인 쿼리

### 사용자 프로필 확인
```sql
-- 현재 로그인한 사용자의 프로필 확인
SELECT 
  user_id,
  display_name,
  roles,
  teacher_level,
  capable_subjects,
  interest_regions,
  updated_at
FROM user_profiles
ORDER BY updated_at DESC
LIMIT 5;
```

### 추천 캐시 확인
```sql
-- 추천 캐시 상태 확인
SELECT 
  user_id,
  profile_snapshot->>'teacher_level' as teacher_level,
  profile_snapshot->>'capable_subjects' as capable_subjects,
  jsonb_array_length(cards) as card_count,
  generated_at,
  updated_at
FROM recommendations_cache
ORDER BY updated_at DESC
LIMIT 5;
```

### 추천 카드 학교급 분포
```sql
-- 특정 사용자의 추천 카드에서 학교급 확인
WITH user_recommendations AS (
  SELECT 
    user_id,
    jsonb_array_elements(cards) as card
  FROM recommendations_cache
  WHERE user_id = 'YOUR_USER_ID'
)
SELECT 
  card->>'type' as card_type,
  card->>'title' as title,
  card->>'organization' as organization
FROM user_recommendations;
```

---

## ✅ Status

- **문제 분석**: 완료 ✅
- **근본 원인**: `capable_subjects` 필드 누락 또는 캐시 미갱신
- **즉시 해결**: SQL 쿼리로 캐시 삭제 + 프로필 재저장
- **근본 해결**: Edge Function 로직 개선 필요

**다음 단계**: 사용자 프로필 확인 → 캐시 삭제 → 프로필 재저장 → 결과 확인

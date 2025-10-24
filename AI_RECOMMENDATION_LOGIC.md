# AI 추천 로직 명세서

**작성일**: 2025년 10월 24일  
**목적**: Edge Function 기반 AI 추천 알고리즘 명확화

---

## 📋 개요

**핵심 원칙**: 사용자가 **담당 가능한 교과**만 추천받음

```
사용자 프로필
  ↓
담당 가능한 교과 (capable_subjects)
  ↓
호환성 검사 (isCapableOfTeaching)
  ↓
지역 필터링 (interest_regions)
  ↓
점수 계산 (scoreJobCard)
  ↓
지역 믹스 선별 (selectWithRegionMix)
  ↓
AI 코멘트 생성 (generateAiComment)
  ↓
추천 카드 (6개)
```

---

## 1️⃣ Edge Function 구조

### 파일 위치
```
supabase/functions/profile-recommendations/index.ts
```

### 주요 함수

| 함수명 | 역할 | 변경 필요 |
|-------|------|----------|
| `fetchProfile()` | 프로필 조회 | ✅ 필드 변경 |
| `buildRegionFilter()` | 지역 확대 | ⚠️ primary_region 제거 |
| `isCapableOfTeaching()` | 교과 호환성 검사 | ✅ 함수명/로직 변경 |
| `scoreJobCard()` | 공고 점수 계산 | ✅ 필드 변경 |
| `scoreTalentCard()` | 인재 점수 계산 | - |
| `selectWithRegionMix()` | 지역 믹스 선별 | - |
| `generateAiComment()` | AI 코멘트 생성 | ✅ primary_region 제거 |
| `aiFilterWithGemini()` | Gemini 필터링 | - |

---

## 2️⃣ 프로필 조회 (fetchProfile)

### 현재 코드
```typescript
const { data, error} = await client
  .from('user_profiles')
  .select('user_id, display_name, roles, primary_region, interest_regions, experience_years, intro, preferred_subjects, preferred_job_types, updated_at')
  .eq('user_id', userId)
  .maybeSingle<UserProfileRow>();
```

### 개선 코드
```typescript
const { data, error} = await client
  .from('user_profiles')
  .select('user_id, display_name, roles, interest_regions, experience_years, intro, capable_subjects, teacher_level, updated_at')
  .eq('user_id', userId)
  .maybeSingle<UserProfileRow>();
```

### 변경사항
- ❌ `primary_region` 제거
- ❌ `preferred_subjects` 제거
- ❌ `preferred_job_types` 제거
- ✅ `capable_subjects` 추가
- ✅ `teacher_level` 추가

---

## 3️⃣ 지역 필터링 (buildRegionFilter)

### 현재 로직
```typescript
function buildRegionFilter(interestRegions: string[] | null | undefined): string[] {
  const result = new Set<string>();

  if (!interestRegions || interestRegions.length === 0) {
    REGION_FALLBACKS.forEach((region) => result.add(region));
    return Array.from(result);
  }

  interestRegions.forEach((region) => {
    result.add(region);
    const adjacent = ADJACENT_REGIONS[region];
    if (adjacent) {
      adjacent.forEach((adjRegion) => result.add(adjRegion));
    }
  });

  return Array.from(result);
}
```

### 개선 사항
- `primary_region` 파라미터 제거 (이미 안 씀)
- `interest_regions`만 사용
- 로직 그대로 유지

---

## 4️⃣ 교과 호환성 검사 (isCapableOfTeaching)

### 함수명 변경
```typescript
// 변경 전
function isSchoolLevelCompatible(
  profileSubjects: string[] | null | undefined,
  jobSchoolLevel: string | null | undefined,
  jobSubject: string | null | undefined
): boolean

// 변경 후
function isCapableOfTeaching(
  capableSubjects: string[] | null | undefined,
  jobSchoolLevel: string | null | undefined,
  jobSubject: string | null | undefined
): boolean
```

### 로직 개선

#### Case 1: 초등 담임 프로필
```typescript
const capableSubjects = ["초등 담임"];
const jobSchoolLevel = "초등";
const jobSubject = "과학";

// 초등 담임 → 초등 모든 과목 가능
if (capableSubjects.some(s => s.includes('초등') && s.includes('담임'))) {
  if (jobSchoolLevel === '초등') return true;
}
```

#### Case 2: 중등 과학 프로필
```typescript
const capableSubjects = ["중등 과학"];
const jobSchoolLevel = "초등";
const jobSubject = "과학";

// 중등 과학 → 초등 과학 전담 가능 (상향식)
if (capableSubjects.some(s => s.includes('중등') && s.includes('과학'))) {
  if (jobSchoolLevel === '중등' && jobSubject === '과학') return true;
  if (jobSchoolLevel === '초등' && jobSubject === '과학') return true; // 상향식
}
```

#### Case 3: 유치원 담임 프로필
```typescript
const capableSubjects = ["유치원 담임"];
const jobSchoolLevel = "유치원";

// 유치원 → 유치원만 가능
if (capableSubjects.some(s => s.includes('유치원'))) {
  if (jobSchoolLevel === '유치원') return true;
}
```

### 호환성 매트릭스

| 담당가능 교과 | 공고 학교급 | 공고 과목 | 매칭 |
|------------|----------|----------|------|
| 초등 담임 | 초등 | (any) | ✅ |
| 초등 담임 | 중등 | (any) | ❌ |
| 중등 국어 | 중등 | 국어 | ✅ |
| 중등 국어 | 중등 | 과학 | ❌ |
| 중등 과학 | 중등 | 과학 | ✅ |
| 중등 과학 | 초등 | 과학 | ✅ (상향식) |
| 중등 과학 | 초등 | 담임 | ❌ |
| 유치원 담임 | 유치원 | (any) | ✅ |
| 유치원 담임 | 초등 | (any) | ❌ |

---

## 5️⃣ 공고 점수 계산 (scoreJobCard)

### 현재 로직
```typescript
function scoreJobCard(profile: UserProfileRow, job: JobPostingRow, preferredRegions: Set<string>): ScoredCard {
  const profilePrimary = profile.primary_region?.trim();  // ❌ 제거 예정
  const interestRegions = profile.interest_regions ?? [];
  let score = 0;

  // 지역 점수
  if (job.location && matchesPreferredRegion(job.location, preferredRegions)) {
    score += 6;
  }

  if (profilePrimary && job.location && job.location.trim() === profilePrimary) {
    score += 5;  // ❌ 제거 예정
  }

  // 교과 호환성 검사
  if (!isSchoolLevelCompatible(profile.preferred_subjects, job.school_level, job.subject)) {
    return { score: -999, ... };
  }

  // 과목 매칭
  if (profile.preferred_subjects && profile.preferred_subjects.length > 0) {
    // ...
  }
}
```

### 개선 로직
```typescript
function scoreJobCard(profile: UserProfileRow, job: JobPostingRow, preferredRegions: Set<string>): ScoredCard {
  const interestRegions = profile.interest_regions ?? [];
  let score = 0;

  // 지역 점수 (단순화)
  if (job.location && matchesPreferredRegion(job.location, preferredRegions)) {
    score += 8;  // 지역 일치 강화
  }

  // 교과 호환성 검사 (필수)
  if (!isCapableOfTeaching(profile.capable_subjects, job.school_level, job.subject)) {
    return { score: -999, card: { ... } };  // 즉시 제외
  }

  // 교과 정확 일치 시 강한 가점
  if (profile.capable_subjects && profile.capable_subjects.length > 0) {
    const capableSet = toLowerSet(profile.capable_subjects);
    const jobSubj = job.subject?.toLowerCase();
    if (jobSubj && capableSet.has(jobSubj)) {
      score += 10;  // 교과 일치 강화
    }
  }

  // 최신성 가중치
  const days = getDaysSinceCreated(job.created_at);
  if (days <= 3) score += 3;
  else if (days <= 7) score += 1;
  else score -= 100;  // 7일 초과 패널티

  // 마감 지난 공고 제외
  if (job.deadline && isPastDeadline(job.deadline)) {
    score -= 100;
  }

  return { score, card: { ... } };
}
```

### 점수 체계 (개선)

| 조건 | 점수 |
|------|------|
| 지역 일치 | +8 |
| 교과 정확 일치 | +10 |
| 3일 이내 공고 | +3 |
| 7일 이내 공고 | +1 |
| 7일 초과 공고 | -100 |
| 마감 지난 공고 | -100 |
| 교과 불호환 | -999 (즉시 제외) |

---

## 6️⃣ AI 코멘트 생성 (generateAiComment)

### 현재 로직
```typescript
function generateAiComment(profile: UserProfileRow, selected: ScoredCard[], discardedCount: number) {
  const displayName = profile.display_name ?? '회원님';
  const primaryRegion = profile.primary_region ?? '관심 지역';  // ❌ 제거 예정
  const roles = profile.roles ?? [];

  const regionFallback = interestRegions.length > 0 ? interestRegions[0] : primaryRegion;  // ❌ 수정 필요
}
```

### 개선 로직
```typescript
function generateAiComment(profile: UserProfileRow, selected: ScoredCard[], discardedCount: number) {
  const displayName = profile.display_name ?? '회원님';
  const interestRegions = profile.interest_regions ?? [];
  const roles = profile.roles ?? [];

  // 선택된 카드에서 지역 추출
  const regionCounts = new Map<string, number>();
  for (const item of selected) {
    const loc = getRegionKey(item.card.location);
    regionCounts.set(loc, (regionCounts.get(loc) ?? 0) + 1);
  }
  
  const topRegions = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 3);

  const regionPhrase = topRegions.length > 0 
    ? topRegions.join('·') 
    : (interestRegions.length > 0 ? interestRegions[0] : '관심 지역');

  const headline = `${displayName}님 프로필에 맞춰 ${regionPhrase} 인근 추천을 준비했어요`;

  // 담당가능 교과 정보 포함
  const capableSubjects = profile.capable_subjects ?? [];
  const subjectText = capableSubjects.length > 0 
    ? capableSubjects.slice(0, 3).join(', ') 
    : '';

  const description = `담당가능 교과: ${subjectText} | 지역: ${regionPhrase} | 최근 ${selected.length}건 추천`;

  return {
    headline,
    description,
    diagnostics: {
      selectedCount: selected.length,
      discardedCount
    }
  };
}
```

---

## 7️⃣ Gemini AI 필터링 (Optional)

### 현재 로직
```typescript
async function aiFilterWithGemini(profile: UserProfileRow, scored: ScoredCard[]): Promise<Set<string> | null> {
  const prompt = {
    contents: [{
      role: 'user',
      parts: [
        { text: 'You are filtering job and talent cards for a Korean education platform. Keep only the top 6 items that best match the user profile.' },
        { text: 'user_profile: ' + JSON.stringify(profile) },
        { text: 'candidates: ' + JSON.stringify(top) }
      ]
    }]
  };
  // ...
}
```

### 개선 사항
- `profile.capable_subjects` 강조
- `profile.interest_regions` 명확화
- `primary_region`, `preferred_subjects` 제거

---

## 8️⃣ 추천 플로우 (전체)

### Step 1: 프로필 조회
```typescript
const profile = await fetchProfile(client, user.id);
// { capable_subjects: ["중등 국어", "중등 영어"], interest_regions: ["성남", "수원"] }
```

### Step 2: 지역 확대
```typescript
const preferredRegions = buildRegionFilter(profile.interest_regions);
// ["성남", "수원", "용인", "광주", "하남", "의왕"]
```

### Step 3: 공고/인재 후보 조회
```typescript
const [jobCandidates, talentCandidates] = await Promise.all([
  fetchJobCandidates(client),
  fetchTalentCandidates(client)
]);
```

### Step 4: 점수 계산 & 호환성 검사
```typescript
const scoredJobs = jobCandidates.map(job => scoreJobCard(profile, job, preferredRegionSet));
// 호환 불가능한 공고는 score: -999로 즉시 제외
```

### Step 5: Gemini 필터링 (Optional)
```typescript
const keepIds = await aiFilterWithGemini(profile, scoredAll);
const refined = keepIds ? scoredAll.filter(s => keepIds.has(s.card.id)) : scoredAll;
```

### Step 6: 지역 믹스 선별
```typescript
const { selected, discarded } = selectWithRegionMix(refined, preferredRegions);
// 6개 카드 선별 (지역별 최대 2개)
```

### Step 7: AI 코멘트 생성
```typescript
const aiComment = generateAiComment(profile, selected, discarded.length);
```

### Step 8: 캐시 저장
```typescript
await upsertRecommendations(client, {
  user_id: user.id,
  cards: selected.map(s => s.card),
  ai_comment: aiComment,
  profile_snapshot: {
    display_name: profile.display_name,
    roles: profile.roles,
    interest_regions: profile.interest_regions,
    capable_subjects: profile.capable_subjects,
    teacher_level: profile.teacher_level,
    generated_from: profile.updated_at
  }
});
```

---

## 9️⃣ 타입 정의 (개선)

### UserProfileRow (Edge Function)
```typescript
type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  roles: string[] | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  intro: string | null;
  capable_subjects: string[] | null;    // ✅ 추가
  teacher_level: string | null;         // ✅ 추가
  updated_at: string;
};
```

---

## 🔟 예상 추천 결과

### Case 1: 중등 국어 교사
```json
{
  "capable_subjects": ["중등 국어"],
  "interest_regions": ["성남", "수원"]
}
```

**추천 카드**:
- ✅ 성남 중등 국어 기간제 (지역 일치 + 교과 일치)
- ✅ 수원 중등 국어 기간제 (지역 일치 + 교과 일치)
- ✅ 용인 중등 국어 기간제 (인접 지역 + 교과 일치)
- ❌ 성남 중등 과학 기간제 (교과 불일치)
- ❌ 성남 초등 담임 기간제 (학교급 불일치)

### Case 2: 초등 담임 교사
```json
{
  "capable_subjects": ["초등 담임"],
  "interest_regions": ["남양주"]
}
```

**추천 카드**:
- ✅ 남양주 초등 담임 기간제 (지역 일치 + 교과 일치)
- ✅ 남양주 초등 과학 기간제 (지역 일치 + 담임이 과학 가능)
- ✅ 구리 초등 담임 기간제 (인접 지역 + 교과 일치)
- ✅ 의정부 초등 영어 기간제 (인접 지역 + 담임이 영어 가능)
- ❌ 남양주 중등 국어 기간제 (학교급 불일치)

---

## 📋 체크리스트

- [ ] `fetchProfile()` SELECT 쿼리 수정
- [ ] `UserProfileRow` 타입 정의 수정
- [ ] `isSchoolLevelCompatible()` → `isCapableOfTeaching()` 함수명 변경
- [ ] `scoreJobCard()` 로직 개선
- [ ] `generateAiComment()` primary_region 제거
- [ ] `aiFilterWithGemini()` 프롬프트 업데이트
- [ ] 테스트 시나리오 실행

---

## 📚 참고

- `PROFILE_SIMPLIFICATION_SPEC.md`: 프로필 필드 명세
- `IMPLEMENTATION_CHECKLIST.md`: 구현 체크리스트

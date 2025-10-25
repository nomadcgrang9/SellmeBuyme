# AI 추천 및 검색 통합 계획

**작성일**: 2025년 10월 24일  
**목적**: AI 추천 알고리즘 및 검색 시스템 통합 명세서

---

## 📋 개요

### 핵심 원칙
사용자가 **담당 가능한 교과만 추천받음**

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

## 1️⃣ 프로필 ↔ 공고 필드 연동

### 프로필 테이블 (user_profiles) - 23개 필드

```sql
-- 기본 정보
user_id (uuid)
display_name (text)
phone (text)
profile_image_url (text)

-- 역할 관련
roles (text[])                    -- ["교사", "강사"]
teacher_level (text)              -- "초등", "중등", "유치원", "특수"
special_education_type (text)
instructor_fields (text[])
instructor_custom_field (text)

-- 지역 관련
interest_regions (text[])         -- ["수원", "화성", "오산"]

-- 선호도 관련
preferred_job_types (text[])      -- ["기간제", "시간제"]
preferred_subjects (text[])       -- ["초등담임", "초등과학"]
experience_years (integer)

-- 기타
capable_subjects (text[])         -- ✅ 담당 가능한 교과 (추가)
intro (text)
receive_notifications (boolean)
agree_terms (boolean)
agree_privacy (boolean)
agree_marketing (boolean)
created_at (timestamp)
updated_at (timestamp)
```

### 공고 테이블 (job_postings) - 신규 필드

```sql
-- 기존 필드
id, organization, title, tags, location, compensation, 
deadline, is_urgent, created_at, job_type, detail_content, 
attachment_url, source_url

-- 신규 필드 (필수)
school_level (text)               -- "초등", "중등", "유치원", "특수"
subject (text)                    -- "담임", "과학", "영어", "음악" 등
required_license (text)           -- "초등담임", "중등과학" 등
```

### 필드 연동 매핑 (우선순위)

| 프로필 필드 | 공고 필드 | 필터링 로직 | 우선순위 |
|-----------|---------|----------|---------|
| `teacher_level` | `school_level` | 초등/중등/유치원/특수 정확 매칭 | 🔴 CRITICAL |
| `preferred_subjects` | `subject` | 선호 과목과 공고 과목 일치도 | 🔴 CRITICAL |
| `capable_subjects` | `required_license` | 라이센스 호환성 검사 | 🔴 CRITICAL |
| `interest_regions` | `location` | 지역 + 인접 지역 포함 | 🔴 CRITICAL |
| `preferred_job_types` | `job_type` | 기간제/시간제 필터링 | 🟠 HIGH |
| `experience_years` | (공고에 없음) | 경력 수준 맞춤 필터링 | 🟡 MEDIUM |
| `roles` | `tags` | 역할 기반 카드 타입 선택 | 🟡 MEDIUM |

---

## 2️⃣ Edge Function 구조 (profile-recommendations/index.ts)

### 주요 함수

| 함수명 | 역할 | 상태 |
|-------|------|------|
| `fetchProfile()` | 프로필 조회 | ✅ 완료 |
| `buildRegionFilter()` | 지역 확대 | ✅ 완료 |
| `isCapableOfTeaching()` | 교과 호환성 검사 | ✅ 완료 |
| `scoreJobCard()` | 공고 점수 계산 | ✅ 완료 |
| `selectWithRegionMix()` | 지역 믹스 선별 | ✅ 완료 |
| `generateAiComment()` | AI 코멘트 생성 | ✅ 완료 |

### 프로필 조회 (fetchProfile)

```typescript
async function fetchProfile(client, userId) {
  const { data, error} = await client
    .from('user_profiles')
    .select('user_id, display_name, roles, interest_regions, 
             experience_years, intro, capable_subjects, 
             teacher_level, updated_at')
    .eq('user_id', userId)
    .maybeSingle<UserProfileRow>();
  
  return data;
}
```

**변경사항**:
- ❌ `primary_region` 제거
- ✅ `capable_subjects` 추가
- ✅ `teacher_level` 추가

### 교과 호환성 검사 (isCapableOfTeaching)

```typescript
function isCapableOfTeaching(
  capableSubjects: string[] | null | undefined,
  jobSchoolLevel: string | null | undefined,
  jobSubject: string | null | undefined
): boolean {
  if (!jobSchoolLevel) return true;
  if (!capableSubjects || capableSubjects.length === 0) return true;
  
  // 호환성 규칙
  // 초등 담임 → 초등 모든 과목 가능
  // 중등 과학 → 중등 과학 + 초등 과학 가능 (상향식)
  // 초등 과학 → 초등 과학만 가능
  // 유치원 → 유치원만 가능
}
```

**호환성 매트릭스**:

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

### 공고 점수 계산 (scoreJobCard)

```typescript
function scoreJobCard(profile: UserProfileRow, job: JobPostingRow, 
                     preferredRegions: Set<string>): ScoredCard {
  const interestRegions = profile.interest_regions ?? [];
  let score = 0;

  // 지역 점수
  if (job.location && matchesPreferredRegion(job.location, preferredRegions)) {
    score += 8;
  }

  // 교과 호환성 검사 (필수)
  if (!isCapableOfTeaching(profile.capable_subjects, 
                          job.school_level, job.subject)) {
    return { score: -999, card: { ... } };  // 즉시 제외
  }

  // 교과 정확 일치 시 강한 가점
  if (profile.capable_subjects && profile.capable_subjects.length > 0) {
    const capableSet = toLowerSet(profile.capable_subjects);
    const jobSubj = job.subject?.toLowerCase();
    if (jobSubj && capableSet.has(jobSubj)) {
      score += 10;
    }
  }

  // 최신성 가중치
  const days = getDaysSinceCreated(job.created_at);
  if (days <= 3) score += 3;
  else if (days <= 7) score += 1;
  else score -= 100;

  // 마감 지난 공고 제외
  if (job.deadline && isPastDeadline(job.deadline)) {
    score -= 100;
  }

  return { score, card: { ... } };
}
```

**점수 체계**:

| 조건 | 점수 |
|------|------|
| 지역 일치 | +8 |
| 교과 정확 일치 | +10 |
| 3일 이내 공고 | +3 |
| 7일 이내 공고 | +1 |
| 7일 초과 공고 | -100 |
| 마감 지난 공고 | -100 |
| 교과 불호환 | -999 (즉시 제외) |

### AI 코멘트 생성 (generateAiComment)

```typescript
function generateAiComment(profile: UserProfileRow, 
                          selected: ScoredCard[], 
                          discardedCount: number) {
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

  const description = `담당가능: ${subjectText} | 지역: ${regionPhrase}`;

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

## 3️⃣ 검색 시스템 (TokenGroup 기반)

### 검색 토큰 파이프라인

**파일**: `src/lib/supabase/queries.ts`

#### Step 1: 토큰화 (Tokenization)
```typescript
function tokenizeSearchQuery(query: string): string[] {
  return query
    .trim()
    .split(/\s+/)
    .filter(token => token.length > 0);
}
```

#### Step 2: 토큰 그룹화 (TokenGroup)
```typescript
interface TokenGroup {
  primary: string;
  synonyms: string[];
}

const TOKEN_GROUPS: TokenGroup[] = [
  { primary: '중등', synonyms: ['중등', '중학교', '고등학교'] },
  { primary: '초등', synonyms: ['초등', '초등학교'] },
  { primary: '과학', synonyms: ['과학', '과학과'] },
  // ...
];

function expandTokens(tokens: string[]): TokenGroup[] {
  return tokens.map(token => {
    const group = TOKEN_GROUPS.find(g => 
      g.synonyms.some(syn => syn.includes(token) || token.includes(syn))
    );
    return group || { primary: token, synonyms: [token] };
  });
}
```

#### Step 3: FTS + ILIKE 통합
```typescript
function executeJobSearch(
  query: string,
  filters: SearchFilters
): Promise<JobCard[]> {
  const tokens = tokenizeSearchQuery(query);
  const tokenGroups = expandTokens(tokens);

  // FTS 표현식 구성
  const ftsExpressions = tokenGroups.map(group => 
    group.synonyms.map(syn => `'${syn}'`).join(' | ')
  );

  // ILIKE 조건 구성
  const ilikeClauses = tokenGroups.map(group =>
    group.synonyms.map(syn => `title ILIKE '%${syn}%'`).join(' OR ')
  ).join(' AND ');

  // Supabase 쿼리
  let query = supabase
    .from('job_postings')
    .select('*');

  // FTS 조건
  if (ftsExpressions.length > 0) {
    query = query.or(ftsExpressions.join(' | '));
  }

  // ILIKE 조건
  if (ilikeClauses) {
    query = query.or(ilikeClauses);
  }

  // 필터 적용
  if (filters.region) {
    query = query.ilike('location', `%${filters.region}%`);
  }

  if (filters.category) {
    query = query.contains('tags', [filters.category]);
  }

  return query.order('created_at', { ascending: false });
}
```

#### Step 4: 후처리 필터링
```typescript
function filterJobsByTokenGroups(
  jobs: JobCard[],
  tokenGroups: TokenGroup[]
): JobCard[] {
  return jobs.filter(job => {
    // 모든 토큰 그룹에서 최소 1개 키워드가 매칭되어야 함
    return tokenGroups.every(group =>
      group.synonyms.some(syn =>
        job.title.toLowerCase().includes(syn.toLowerCase()) ||
        job.organization.toLowerCase().includes(syn.toLowerCase()) ||
        job.location.toLowerCase().includes(syn.toLowerCase())
      )
    );
  });
}
```

### 검색 결과 정렬

**관련성 점수 계산**:
```typescript
function calculateJobRelevance(job: JobCard, tokens: string[]): number {
  let score = 0;

  // 제목 정확 일치: 60점
  if (tokens.some(t => job.title.toLowerCase() === t.toLowerCase())) {
    score += 60;
  }

  // 제목 부분 일치: 40점
  if (tokens.some(t => job.title.toLowerCase().includes(t.toLowerCase()))) {
    score += 40;
  }

  // 기관명 정확 일치: 40점
  if (tokens.some(t => job.organization.toLowerCase() === t.toLowerCase())) {
    score += 40;
  }

  // 기관명 부분 일치: 25점
  if (tokens.some(t => job.organization.toLowerCase().includes(t.toLowerCase()))) {
    score += 25;
  }

  // 지역 부분 일치: 10점
  if (tokens.some(t => job.location.toLowerCase().includes(t.toLowerCase()))) {
    score += 10;
  }

  // 태그 정확 일치: 30점
  if (job.tags && tokens.some(t => job.tags.includes(t))) {
    score += 30;
  }

  // 태그 부분 일치: 15점
  if (job.tags && tokens.some(t => 
    job.tags.some(tag => tag.toLowerCase().includes(t.toLowerCase()))
  )) {
    score += 15;
  }

  // 긴급 여부: +5점
  if (job.is_urgent) {
    score += 5;
  }

  return score;
}
```

---

## 4️⃣ 추천 플로우 (전체)

### Step 1: 프로필 조회
```typescript
const profile = await fetchProfile(client, user.id);
// { capable_subjects: ["중등 국어", "중등 영어"], 
//   interest_regions: ["성남", "수원"] }
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
const scoredJobs = jobCandidates.map(job => 
  scoreJobCard(profile, job, preferredRegionSet)
);
// 호환 불가능한 공고는 score: -999로 즉시 제외
```

### Step 5: 지역 믹스 선별
```typescript
const { selected, discarded } = selectWithRegionMix(
  scoredJobs, 
  preferredRegions
);
// 6개 카드 선별 (지역별 최대 2개)
```

### Step 6: AI 코멘트 생성
```typescript
const aiComment = generateAiComment(profile, selected, discarded.length);
```

### Step 7: 캐시 저장
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

## 5️⃣ 타입 정의

### UserProfileRow (Edge Function)
```typescript
type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  roles: string[] | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  intro: string | null;
  capable_subjects: string[] | null;
  teacher_level: string | null;
  updated_at: string;
};
```

### JobPostingRow (Edge Function)
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
  school_level: string | null;
  subject: string | null;
  required_license: string | null;
};
```

### TokenGroup (검색)
```typescript
interface TokenGroup {
  primary: string;
  synonyms: string[];
}
```

---

## 6️⃣ 예상 추천 결과

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

## 7️⃣ 현재 상태

### ✅ 완료됨
- DB 스키마 설계 (school_level, subject, required_license 필드)
- Edge Function 로직 구현 (호환성 검사, 점수 계산, AI 코멘트)
- 검색 토큰 파이프라인 (TokenGroup 기반 동의어 확장)
- FTS + ILIKE 통합 검색
- 후처리 필터 강화

### ⏳ 대기 중
- DB 마이그레이션 실행 (supabase db push)
- Edge Function 배포 (supabase functions deploy)
- 크롤러 재실행 (school_level, subject 필드 채우기)

---

## 📋 체크리스트

- [ ] DB 마이그레이션 실행
- [ ] Edge Function 배포
- [ ] 크롤러 재실행 (최소 1개 소스)
- [ ] job_postings 테이블에 school_level 데이터 확인
- [ ] 초등 프로필로 중등 공고 안 나오는지 확인
- [ ] 지역 다양성 확인 (성남만 나오지 않고 섞여 있는지)
- [ ] AI 코멘트에 capable_subjects 반영 확인
- [ ] 검색 결과 TokenGroup 기반 필터링 확인

---

---

## 8️⃣ AI 코멘트 개선 계획 (2025-01-27)

### 🎯 목적
**"AI가 추천했다" → "친한 선배가 조언해준다"**

현재 AI 코멘트가 기계적이고 동어반복적이어서, 사용자가 추천 이유를 명확히 이해하지 못하고 친근함을 느끼지 못하는 문제를 해결합니다.

---

### 📊 현황 진단

#### **데이터베이스 구조**

**recommendations_cache 테이블**
```sql
CREATE TABLE public.recommendations_cache (
  user_id UUID PRIMARY KEY,
  cards JSONB NOT NULL,              -- 추천 카드 배열
  ai_comment JSONB,                  -- { headline, description, diagnostics }
  profile_snapshot JSONB NOT NULL,   -- 프로필 스냅샷
  generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**활용 가능한 프로필 필드**
```typescript
{
  display_name: string | null,
  roles: string[] | null,              // ["교사", "강사", "기타"]
  interest_regions: string[] | null,   // ["수원", "성남"]
  capable_subjects: string[] | null,   // ["초등 과학", "중등 국어"]
  teacher_level: string | null,        // "초등", "중등", "유치원", "특수"
  experience_years: number | null,     // 경력 년수
  intro: string | null                 // 자기소개
}
```

#### **현재 AI 코멘트 생성 로직**

**위치**: `supabase/functions/profile-recommendations/index.ts` (633~695줄)

```typescript
function generateAiComment(profile, selected, discardedCount) {
  // 1. 선택된 카드에서 지역 추출
  const regionCounts = new Map();
  for (const item of selected) {
    const loc = getRegionKey(item.card.location);
    regionCounts.set(loc, (regionCounts.get(loc) ?? 0) + 1);
  }

  // 2. 상위 3개 지역 추출
  const topRegions = [...];
  const regionPhrase = topRegions.join('·');

  // 3. 헤드라인 & 설명 생성
  const headline = `${displayName}님 프로필에 맞춰 ${regionPhrase} 인근 추천을 준비했어요`;
  const description = `역할: ${roleText} · 지역: ${locationText} 기준으로
    최근 업데이트된 카드 중 맥락에 맞는 것만 골라 정리했어요.
    불필요한 ${discardedCount}건은 제외했습니다.`;

  return { headline, description, diagnostics };
}
```

---

### ❌ 문제점

#### **1. 동어반복**
```
현재: "경기도 전체 지역 공고를 먼저 모았어요"
     "이창건님(초등)의 관심 조건을 분석해 최신 공고를 정렬했습니다."
```
→ **"관심 조건을 분석해 정렬했다"는 당연한 말의 반복**

#### **2. 추천 근거 불명확**
- 왜 경기도 전체인지?
- 왜 이 6개 카드가 선택되었는지?
- 내 프로필 중 어떤 부분이 반영되었는지?

#### **3. 프로필 활용도 낮음**
- `capable_subjects` (담당 가능 과목) 거의 미사용
- `experience_years` (경력) 전혀 미사용
- `intro` (자기소개) 간단히만 언급

#### **4. 딱딱한 톤**
```
"~했습니다" → 격식체
"관심 조건을 분석해" → 기계적
"불필요한 X건은 제외했습니다" → 냉정함
```

#### **5. 상황별 맥락 없음**
- 지역 확대했는지, 정확 매칭인지 구분 없음
- 긴급/마감 임박 공고 강조 없음
- 교과 호환성(상향식) 설명 없음

---

### ✅ 개선 원칙

1. **구체적 근거 제시**: "수원 공고가 적어서 용인까지 봤어요"
2. **친근한 톤**: "~예요", "~하세요", 반말/경어 믹스
3. **감정 표현**: "걱정하실까봐", "아까워요", "서둘러요"
4. **개인화**: 프로필 정보를 적극 활용 (이름, 경력, 과목)
5. **상황별 다른 문구**: 7가지 시나리오별 템플릿

---

### 📝 7가지 시나리오별 인간적 문구 템플릿

#### **Case 1: 완벽 매칭 (지역·교과·직종 모두 일치)**

```
헤드라인 예시:
- "{name}님 딱 맞춤! {region} {subject} 공고예요"
- "선생님이 찾던 조건 그대로예요"
- "정확히 일치하는 공고만 골랐어요"

설명 예시:
- "선생님이 찾던 조건 그대로예요. {region} 지역 {subject}, {jobType} {count}건
   모두 일주일 내 올라온 거라 경쟁률도 낮을 거예요."
- "어제오늘 올라온 따끈한 공고들이에요. {region} {subject}만 골라놨으니 하나씩 확인해보세요."
- "선생님 프로필 보니까 {subject} 찾으시는군요! 마침 {region}에 {count}건이나 있네요."
```

#### **Case 2: 지역 확대 (인접 지역 포함)**

```
헤드라인 예시:
- "{primaryRegion}은 좀 적어서... {adjacentRegions} 같이 봤어요"
- "{primaryRegion} 외 인근 지역도 함께 살펴봤어요"
- "출퇴근 가능한 범위로 넓혀봤어요"

설명 예시:
- "{primaryRegion}에 신규 공고가 {count}건밖에 없어서 걱정하실까봐 인근
   {adjacentList}도 포함했어요. 다 차로 30분 거리예요."
- "이번 주 {primaryRegion} 공고가 별로 안 올라왔더라고요. 그래서 가까운
   {adjacentRegions}까지 넓혀봤어요."
```

#### **Case 3: 상향식 호환 활용 (중등→초등 전담)**

```
헤드라인 예시:
- "중등 {subject} 자격증? 초등 전담도 지원 가능해요!"
- "중등 자격증으로 초등 공고도 지원할 수 있어요"

설명 예시:
- "혹시 모르셨을 수도 있는데, 선생님 중등 {subject} 자격증으로 초등 {subject}
   전담도 할 수 있어요. 초등이 근무 환경이 더 편하다는 분들도 많더라고요."
- "중등 {subject} 자격 갖고 계시니까 초등 {subject} 전담 공고도 함께 추천드려요.
   실제로 중등 출신 선생님들이 초등에서 만족도 높게 근무하시는 경우 많아요."
```

#### **Case 4: 긴급/마감 임박 강조**

```
헤드라인 예시:
- "⏰ 서둘러요! 내일까지 마감인 공고 {count}건 있어요"
- "시간이 없어요! 곧 마감되는 공고부터 봐요"

설명 예시:
- "아이고, 이거 급해요! {urgentList} 빨리 확인하세요. 조건도 좋은데 시간이 촉박하네요.
   서류는 미리 준비되셨죠?"
- "마감 임박 공고부터 보여드릴게요. {urgentList} 48시간 내 마감이에요. 특히 1번 카드는
   선생님 조건이랑 정확히 맞아서 놓치면 아까울 것 같아요."
```

#### **Case 5: 최신 공고 중심**

```
헤드라인 예시:
- "오늘 아침 올라온 따끈따끈한 공고부터!"
- "신선한 공고만 골라봤어요"

설명 예시:
- "방금 전 확인했는데 오늘 새벽에 올라온 공고가 {count}건이나 있네요! 아직 지원자가
   거의 없을 거예요. 먼저 보시는 분이 임자죠."
- "24시간 내 새로 올라온 공고만 정리했어요. 신규 공고는 경쟁률이 낮아서 합격 확률이 높거든요."
```

#### **Case 6: 지역 균형 배치**

```
헤드라인 예시:
- "{region1}만? 아니에요! {region2}·{region3}도 골고루 섞었어요"
- "여러 지역 골고루 섞어봤어요"

설명 예시:
- "한 지역만 보면 선택의 폭이 좁잖아요. {regionList} 골고루 섞어서 추천드려요.
   이 중에 마음에 드는 학교 있으시면 좋겠네요!"
- "지역별로 다양하게 보실 수 있도록 균형있게 골랐어요. 각 지역마다 학교 분위기가
   다르니까 비교해보시고 선택하세요."
```

#### **Case 7: 기본 (프로필 미완성 등)**

```
헤드라인 예시:
- "{name}님 프로필에 맞춰 추천했어요"
- "최신 공고 위주로 정리했어요"

설명 예시:
- "{region} 지역 기준으로 최근 올라온 공고 {count}건을 정리했어요. 하나씩 확인해보세요."
- "프로필 정보를 더 채워주시면 더 정확한 맞춤 추천이 가능해요. [프로필 완성하기]"
```

---

### 🔧 구현 단계

#### **Step 1: 메타데이터 분석 함수 작성**

**위치**: `supabase/functions/profile-recommendations/index.ts`

추가할 함수 5개:

```typescript
// 1. 지역 매칭 상태 분석
function analyzeRegionMatching(
  selected: ScoredCard[],
  interestRegions: string[]
): {
  exactMatch: number,      // 정확 일치
  adjacentMatch: number,   // 인접 지역
  expandedMatch: number,   // 확대 지역
  regions: string[]        // 포함된 지역 목록
}

// 2. 시간 긴급도 분석
function analyzeUrgency(selected: ScoredCard[]): {
  urgent: number,          // 긴급 공고
  within24h: number,       // 24시간 내 신규
  within3days: number,     // 3일 내 신규
  deadlineNear: number,    // 마감 임박
  deadlineSoon: JobPostingRow[]  // 마감 임박 공고 리스트
}

// 3. 교과 호환성 분석
function analyzeSubjectCompatibility(
  selected: ScoredCard[],
  capableSubjects: string[] | null
): {
  exactMatch: number,      // 정확 일치
  upwardCompatible: number,// 상향식 호환 (중등→초등)
  general: number          // 일반
}

// 4. 지역 분포 분석
function analyzeRegionDistribution(selected: ScoredCard[]): {
  isDiverse: boolean,      // 균형있는 분포인가?
  topRegion: string,       // 가장 많은 지역
  regionCounts: Map<string, number>
}

// 5. 종합 상황 판단
function determineScenario(
  regionAnalysis,
  urgencyAnalysis,
  subjectAnalysis,
  distributionAnalysis
): 'perfect_match' | 'region_expanded' | 'upward_compatible' |
   'urgent' | 'fresh' | 'diverse' | 'default'
```

#### **Step 2: 시나리오별 템플릿 객체 정의**

```typescript
const AI_COMMENT_TEMPLATES = {
  perfect_match: {
    headlines: [
      `{name}님 딱 맞춤! {region} {subject} 공고예요`,
      `선생님이 찾던 조건 그대로예요`,
      // ... 3~5개 버전
    ],
    descriptions: [
      `선생님이 찾던 조건 그대로예요. {region} 지역 {subject}, {jobType} {count}건...`,
      // ... 3~5개 버전
    ]
  },
  region_expanded: { /* ... */ },
  upward_compatible: { /* ... */ },
  urgent: { /* ... */ },
  fresh: { /* ... */ },
  diverse: { /* ... */ },
  default: { /* ... */ }
};
```

#### **Step 3: generateAiComment() 함수 전면 재작성**

**위치**: `supabase/functions/profile-recommendations/index.ts` (633~695줄 대체)

```typescript
function generateAiComment(
  profile: UserProfileRow,
  selected: ScoredCard[],
  discarded: number
) {
  // 1. 메타데이터 분석
  const regionAnalysis = analyzeRegionMatching(selected, profile.interest_regions);
  const urgencyAnalysis = analyzeUrgency(selected);
  const subjectAnalysis = analyzeSubjectCompatibility(selected, profile.capable_subjects);
  const distributionAnalysis = analyzeRegionDistribution(selected);

  // 2. 시나리오 판단
  const scenario = determineScenario(
    regionAnalysis,
    urgencyAnalysis,
    subjectAnalysis,
    distributionAnalysis
  );

  // 3. 템플릿 선택 (랜덤)
  const template = AI_COMMENT_TEMPLATES[scenario];
  const headlineIndex = Math.floor(Math.random() * template.headlines.length);
  const descIndex = Math.floor(Math.random() * template.descriptions.length);

  // 4. 플레이스홀더 치환
  const variables = {
    name: profile.display_name || '선생님',
    region: regionAnalysis.regions[0] || '관심 지역',
    subject: profile.capable_subjects?.[0] || '과목',
    jobType: '기간제',
    count: selected.length,
    primaryRegion: profile.interest_regions?.[0] || '선호 지역',
    adjacentRegions: regionAnalysis.regions.slice(1, 3).join('·'),
    urgentList: urgencyAnalysis.deadlineSoon.map(job => job.organization).slice(0, 2).join(', '),
    regionList: regionAnalysis.regions.join(', ')
  };

  let headline = template.headlines[headlineIndex];
  let description = template.descriptions[descIndex];

  // 플레이스홀더 치환
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    headline = headline.replace(regex, String(value));
    description = description.replace(regex, String(value));
  });

  return {
    headline,
    description,
    diagnostics: {
      scenario,
      selectedCount: selected.length,
      discardedCount: discarded,
      ...regionAnalysis,
      ...urgencyAnalysis,
      ...subjectAnalysis
    }
  };
}
```

#### **Step 4: 프론트엔드 getAiComment() 함수 개선**

**위치**: `src/components/ai/AIRecommendations.tsx` (122~181줄)

- Edge Function과 유사한 로직 적용 (fallback용)
- 프로필 정보 최대한 활용
- 간소화된 버전으로 구현

#### **Step 5: 테스트 및 검증**

**테스트 시나리오**:

1. **완벽 매칭 테스트**
   - 프로필: 수원, 초등 과학, 경력 3년
   - 추천 카드: 수원 초등 과학 6건
   - 예상: "이창건님 딱 맞춤! 수원 초등 과학 공고예요"

2. **지역 확대 테스트**
   - 프로필: 수원, 초등 담임
   - 추천 카드: 수원 2건, 용인 2건, 화성 2건
   - 예상: "수원은 좀 적어서... 용인·화성 같이 봤어요"

3. **마감 임박 테스트**
   - 추천 카드: 마감 임박 공고 2건 포함
   - 예상: "⏰ 서둘러요! 내일까지 마감인 공고 2건 있어요"

---

### 📁 수정 파일

1. **`supabase/functions/profile-recommendations/index.ts`** (메인 로직)
   - 메타데이터 분석 함수 5개 추가
   - 템플릿 객체 정의
   - `generateAiComment()` 함수 재작성

2. **`src/components/ai/AIRecommendations.tsx`** (프론트 fallback)
   - `getAiComment()` 함수 개선

---

### ⏱️ 예상 소요 시간

| 단계 | 작업 | 예상 시간 |
|------|------|----------|
| Step 1 | 메타데이터 분석 함수 작성 | 2시간 |
| Step 2 | 시나리오별 템플릿 작성 | 1시간 |
| Step 3 | generateAiComment 재작성 | 1.5시간 |
| Step 4 | getAiComment 개선 | 1시간 |
| Step 5 | 테스트 및 검증 | 1시간 |

**총 예상 소요 시간: 6.5시간**

---

### 🎉 예상 효과

1. **사용자 공감도 ↑**: "나를 위해 골라준" 느낌
2. **추천 이유 명확화**: 왜 이 카드들인지 명확히 이해
3. **친근함 향상**: 톤 개선으로 신뢰감 증가
4. **클릭률(CTR) 증가**: 평균 +30~40% 예상
5. **프로필 완성률 ↑**: "프로필 채워주시면..." 유도 효과

---

### 📋 구현 체크리스트 (AI 코멘트)

- [ ] 메타데이터 분석 함수 5개 작성 완료
- [ ] 시나리오별 템플릿 객체 정의 완료
- [ ] generateAiComment() 함수 재작성 완료
- [ ] getAiComment() 함수 개선 완료
- [ ] 완벽 매칭 시나리오 테스트 통과
- [ ] 지역 확대 시나리오 테스트 통과
- [ ] 마감 임박 시나리오 테스트 통과
- [ ] Edge Function 배포 완료
- [ ] 프론트엔드 배포 완료
- [ ] 실제 사용자 피드백 수집

---

---

## 9️⃣ Phase 2: 긴급도 우선순위 및 UX 개선 (2025-10-25)

### 📌 배경

Phase 1 구현 후 사용자 테스트 결과 발견된 이슈:
1. **폰트 크기 문제**: AI 코멘트 섹션 텍스트가 가독성이 떨어짐
2. **로직 불일치**: AI 코멘트에서 "마감 임박"이라고 표시되지만 실제 추천 카드는 긴급 공고가 아님

### 🔍 문제 진단

#### 1. 폰트 크기 이슈
- 현재 폰트 크기: headline `14px`, description `11px`
- 사용자 피드백: 작아서 읽기 어려움
- 요구사항: 1.2배 확대

#### 2. 긴급도 로직 불일치 (심각)

**문제 분석**:
```
[현재 흐름]
1. scoreJobCard() - 공고 점수 계산
   ↓ is_urgent 가중치: +1~+4 (매우 약함)
   ↓ deadline 임박 가중치: 없음
2. selectWithRegionMix() - 점수 기반 카드 선별
   ↓ 지역 믹스 우선, 긴급도 고려 안 함
3. generateAiComment() - 시나리오 판단
   ↓ urgencyAnalysis.deadlineNear >= 2 → 'urgent' 시나리오
   ↓ AI 코멘트: "⏰ 마감 임박!"
   ↓ 하지만 선별된 카드는 이미 확정됨 (긴급 공고 아닐 수 있음)

[문제]
- 점수 계산 시점에 긴급도 가중치 너무 약함 (+1~+4)
- 지역 매칭(+8), 역할 매칭(+25), 과목 매칭(+10)에 밀려남
- 마감 임박 공고가 낮은 점수로 탈락
- AI 코멘트는 "마감 임박"이라고 하지만 카드에는 반영 안 됨
```

**근본 원인**:
- `scoreJobCard()`에서 긴급도 가중치가 다른 요소(지역, 과목, 역할)에 비해 너무 약함
- 마감일 임박에 대한 별도 가중치가 전혀 없음

### ✅ 구현 완료 사항

#### 1. 폰트 크기 확대 (완료)

**파일**: `src/components/ai/AIRecommendations.tsx`
**변경 내용**:

| 요소 | 변경 전 | 변경 후 | 비율 |
|-----|--------|--------|------|
| "AI 코멘트" 레이블 | `text-sm` (14px) | `text-base` (16px) | 1.14x |
| Headline | `text-sm` (14px) | `text-[17px]` (17px) | 1.21x |
| Description | `text-[11px]` (11px) | `text-[13px]` (13px) | 1.18x |

**코드**:
```tsx
// Line 227
<div className="flex items-center gap-2 text-base font-semibold text-gray-800">

// Line 232
<span className="block text-[17px] font-semibold text-gray-900 leading-snug mb-1">

// Line 235
<span className="block line-clamp-3 break-words whitespace-pre-line text-[13px] leading-relaxed text-gray-600">
```

#### 2. 긴급도 우선순위 대폭 상향 (완료)

**파일**: `supabase/functions/profile-recommendations/index.ts`
**위치**: `scoreJobCard()` 함수 (Line 476~529)

**변경 전 가중치**:
```typescript
if (job.is_urgent) {
  score += isAdminRole ? 4 : 1;  // 너무 약함!
}
// 마감일 임박 가중치 없음
```

**변경 후 가중치**:
```typescript
// 마감 임박 우선순위
const daysUntilDeadline = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));

if (daysUntilDeadline <= 1) {
  score += 50;  // 내일까지 마감: 최고 우선순위
  isDeadlineNear = true;
} else if (daysUntilDeadline <= 2) {
  score += 35;  // 2일 내 마감: 매우 높은 우선순위
  isDeadlineNear = true;
} else if (daysUntilDeadline <= 3) {
  score += 20;  // 3일 내 마감: 높은 우선순위
} else if (daysUntilDeadline <= 7) {
  score += 8;   // 일주일 내 마감: 중간 우선순위
}

// is_urgent 플래그 가중치 (마감일과 시너지)
if (job.is_urgent) {
  score += isDeadlineNear ? 25 : 15;
}
```

**점수 비교표**:

| 요소 | 기존 점수 | 신규 점수 | 증가량 |
|-----|---------|---------|--------|
| 지역 매칭 | +8 | +8 | - |
| 역할 매칭 (교사+teaching) | +25 | +25 | - |
| 과목 정확 일치 | +10 | +10 | - |
| **is_urgent** | **+1~+4** | **+15~+25** | **+11~+21** |
| **마감 1일 내** | **0** | **+50** | **+50** |
| **마감 2일 내** | **0** | **+35** | **+35** |
| **마감 3일 내** | **0** | **+20** | **+20** |

**예시 시나리오**:

```
공고 A: 수원 초등 과학, 내일 마감, is_urgent
- 지역: +8
- 과목: +10
- 마감 1일: +50
- urgent: +25
- 총점: +93 ✅ 최상위 노출

공고 B: 수원 초등 과학, 마감일 2주 후
- 지역: +8
- 과목: +10
- 총점: +18 (A에게 밀림)
```

### 📊 예상 효과

#### 1. 긴급도 우선순위 개선
- **Before**: 마감 임박 공고가 지역/과목 매칭에 밀려 하위권 배치
- **After**: 마감 임박 공고가 최우선 노출 (+50~+75점 보너스)

#### 2. AI 코멘트 정합성
- **Before**: "⏰ 마감 임박!" 코멘트 ≠ 실제 카드 내용
- **After**: "⏰ 마감 임박!" 코멘트 = 실제 카드 최상단에 긴급 공고 배치

#### 3. 사용자 경험
- **가독성**: 폰트 크기 1.2배 확대로 가독성 향상
- **신뢰도**: 코멘트와 카드 일치로 신뢰도 증가
- **전환율**: 긴급 공고 우선 노출로 지원률 증가 예상 (+20~30%)

---

### 🔧 남은 작업 및 개선 계획

#### A. 즉시 개선 필요 (High Priority)

##### A-1. 시나리오 정확도 검증
**목표**: 7가지 시나리오가 실제 추천 카드와 일치하는지 검증

**작업**:
1. 각 시나리오별 테스트 케이스 10개 생성
2. `determineScenario()` 로직 검증
3. 시나리오 우선순위 재조정 (필요 시)

**예상 이슈**:
- `perfect_match` 시나리오: 정확 일치 기준이 너무 엄격할 수 있음 (≥4 지역 + ≥3 과목)
- `fresh` 시나리오: 24시간 내 공고 ≥3건 조건이 현실적인지 검증 필요

##### A-2. 템플릿 다양성 확대
**현재**: 각 시나리오당 3개 템플릿 (총 21개)
**목표**: 각 시나리오당 5~7개 템플릿 (총 40~50개)

**추가 필요 템플릿**:
- `perfect_match`: 경력별 멘트 (신입/경력자)
- `urgent`: 마감 시간대별 멘트 (오늘 마감/내일 마감/48시간 내)
- `region_expanded`: 확대 이유 상세화 ("신규 공고 없음" vs "조건 맞는 공고 없음")

##### A-3. Edge Function 배포 및 캐시 무효화
**필수 작업**:
```bash
# Edge Function 재배포
supabase functions deploy profile-recommendations

# 기존 캐시 초기화 (중요!)
# recommendations_cache 테이블의 모든 행 삭제 또는 updated_at 초기화
```

**이유**: 긴급도 점수 변경사항이 캐시된 추천에 반영되려면 캐시 무효화 필수

---

#### B. 중기 개선 과제 (Medium Priority)

##### B-1. 사용자 피드백 수집 시스템
**목표**: AI 코멘트의 유용성/정확성을 사용자로부터 직접 수집

**구현 방안**:
1. AI 코멘트 하단에 "도움이 됐나요?" 버튼 추가 (👍/👎)
2. Supabase 테이블 `ai_comment_feedback` 생성
   ```sql
   CREATE TABLE ai_comment_feedback (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES user_profiles(user_id),
     scenario TEXT,
     headline TEXT,
     description TEXT,
     helpful BOOLEAN,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```
3. 주간 집계로 시나리오별 만족도 트래킹

##### B-2. A/B 테스트 프레임워크
**목표**: 템플릿 효과 측정

**구현**:
- 동일 시나리오 내 템플릿 랜덤 선택 → 클릭률(CTR) 측정
- 높은 CTR 템플릿을 우선 노출하도록 가중치 조정

##### B-3. 추천 다양성 모니터링
**현재 우려**:
- 긴급도 가중치 대폭 상향 → 항상 긴급 공고만 노출될 위험

**해결 방안**:
1. 긴급 공고 비율 제한 (예: 6개 중 최대 2~3개)
2. 나머지는 지역/과목 매칭 우선
3. `selectWithRegionMix()`에 다양성 보장 로직 추가

```typescript
// 예시 코드
function selectWithDiversity(scored: ScoredCard[], urgentCount: number) {
  const urgent = scored.filter(s => isUrgent(s)).slice(0, Math.min(urgentCount, 3));
  const normal = scored.filter(s => !isUrgent(s)).slice(0, 6 - urgent.length);
  return [...urgent, ...normal];
}
```

---

#### C. 장기 개선 과제 (Low Priority)

##### C-1. 협업 필터링 도입
**목표**: 유사 프로필 사용자의 지원 패턴 반영

**개념**:
```
사용자 A (수원, 초등 과학, 3년 경력)
  ↓
유사 사용자 찾기 (수원, 초등, 2~5년 경력)
  ↓
유사 사용자들이 지원한 공고 분석
  ↓
인기 공고에 가중치 부여
```

**필요 데이터**:
- 사용자 지원 이력 테이블 (`applications`)
- 클릭 로그 테이블 (`click_logs`)

##### C-2. 시간대별 추천 최적화
**아이디어**:
- 평일 아침(7~9시): 긴급 공고 우선
- 평일 저녁(18~22시): 신규 공고 우선
- 주말: 마감 여유 있는 공고 우선

##### C-3. 개인화 학습
**목표**: 사용자별 선호도 학습

**예시**:
- 사용자가 계속 "화성" 공고만 클릭 → 화성 가중치 상향
- 사용자가 "시간제" 공고만 지원 → 시간제 우선 추천

---

### 📋 우선순위별 로드맵

| 단계 | 작업 | 예상 시간 | 우선순위 |
|-----|------|----------|---------|
| **Phase 2 완료** | 폰트 크기 확대 + 긴급도 로직 수정 | ✅ 완료 | - |
| **A-3** | Edge Function 배포 및 캐시 무효화 | 30분 | 🔴 즉시 |
| **A-1** | 시나리오 정확도 검증 | 4시간 | 🔴 1주 내 |
| **A-2** | 템플릿 다양성 확대 | 3시간 | 🔴 1주 내 |
| **B-1** | 사용자 피드백 수집 시스템 | 6시간 | 🟠 2주 내 |
| **B-2** | A/B 테스트 프레임워크 | 8시간 | 🟠 1개월 내 |
| **B-3** | 추천 다양성 모니터링 | 4시간 | 🟠 1개월 내 |
| **C-1** | 협업 필터링 도입 | 20시간 | 🟡 3개월 내 |
| **C-2** | 시간대별 추천 최적화 | 10시간 | 🟡 3개월 내 |
| **C-3** | 개인화 학습 | 30시간 | 🟡 6개월 내 |

---

### 🧪 테스트 체크리스트 (Phase 2)

- [x] 폰트 크기 1.2배 확대 적용 확인
- [x] 긴급도 점수 로직 코드 수정 완료
- [ ] Edge Function 재배포 완료
- [ ] recommendations_cache 테이블 초기화
- [ ] 마감 1일 내 공고가 최상단 노출되는지 확인
- [ ] "⏰ 마감 임박!" 코멘트와 실제 카드 일치 확인
- [ ] 다른 시나리오들도 정상 작동하는지 회귀 테스트
- [ ] 모바일 환경에서 폰트 크기 적절성 확인
- [ ] 실제 사용자 테스트 (10명 이상)

---

### 📌 중요 참고 사항

#### Edge Function 배포 시 주의사항
```bash
# 1. Edge Function 배포
supabase functions deploy profile-recommendations

# 2. 기존 캐시 무효화 (필수!)
# Supabase 대시보드에서 SQL Editor 실행:
DELETE FROM recommendations_cache;

# 또는 updated_at을 과거로 설정하여 자동 재생성 유도:
UPDATE recommendations_cache
SET updated_at = NOW() - INTERVAL '2 days';
```

#### 긴급도 점수 조정 시 고려사항
- 너무 높은 가중치(+50~+75) → 긴급 공고만 노출 위험
- 너무 낮은 가중치(+1~+4) → 긴급 공고 묻힘
- **최적값 찾기**: 실제 데이터로 A/B 테스트 필요

#### 시나리오 우선순위
현재 우선순위:
1. urgent (긴급/마감 임박)
2. fresh (24시간 내 신규)
3. upward_compatible (상향 호환)
4. perfect_match (완벽 매칭)
5. diverse (지역 다양성)
6. region_expanded (지역 확대)
7. default (기본)

**재검토 필요**: `perfect_match`가 `urgent`보다 우선이어야 하는지?

---

## 📚 참고

- **FRONTEND_STRUCTURE.md**: 프론트엔드 구조 및 UI/UX
- **BACKEND_STRUCTURE.md**: 백엔드 구조 및 API
- **CRAWLING_PLAN.md**: 크롤러 설계 및 데이터 수집
- **COLOR_STRUCTURE.md**: 디자인 시스템 및 색상 팔레트
- **SEARCH_SYSTEM_REDESIGN.md**: 검색 시스템 라이센스 호환성 매트릭스 (참고용)

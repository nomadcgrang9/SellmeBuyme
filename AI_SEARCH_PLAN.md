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

## 📚 참고

- **FRONTEND_STRUCTURE.md**: 프론트엔드 구조 및 UI/UX
- **BACKEND_STRUCTURE.md**: 백엔드 구조 및 API
- **CRAWLING_PLAN.md**: 크롤러 설계 및 데이터 수집
- **COLOR_STRUCTURE.md**: 디자인 시스템 및 색상 팔레트

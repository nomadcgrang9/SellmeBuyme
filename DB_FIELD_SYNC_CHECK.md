# 🔄 프로필 ↔ 공고 필드 연동 확인

## 1️⃣ 프로필 테이블 (user_profiles) - 최신 필드

```sql
-- 프로필 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

**예상 결과** (23개 필드):
```
user_id                    | uuid          | NO
display_name              | text          | YES
phone                     | text          | YES
profile_image_url         | text          | YES
roles                     | text[]        | YES  ← 역할 (교사/강사)
teacher_level             | text          | YES  ← 교사급 (초등/중등/유치원/특수)
special_education_type    | text          | YES  ← 특수교육 유형
instructor_fields         | text[]        | YES  ← 강사 분야
instructor_custom_field   | text          | YES  ← 강사 커스텀
primary_region            | text          | YES  ← 주 지역
interest_regions          | text[]        | YES  ← 관심 지역들
preferred_job_types       | text[]        | YES  ← 선호 직종 (기간제/시간제/협력수업)
preferred_subjects        | text[]        | YES  ← 선호 과목 (초등담임/중등과학/음악 등)
experience_years          | integer       | YES  ← 경력 년수
intro                     | text          | YES  ← 자기소개
receive_notifications     | boolean       | YES
agree_terms               | boolean       | YES
agree_privacy             | boolean       | YES
agree_marketing           | boolean       | YES
created_at                | timestamp     | NO
updated_at                | timestamp     | NO
```

---

## 2️⃣ 공고 테이블 (job_postings) - 최신 필드

```sql
-- 공고 테이블 구조 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_postings'
ORDER BY ordinal_position;
```

**예상 결과** (기존 + 신규 필드):
```
id                        | uuid          | NO
organization              | text          | NO  ← 학교명
title                     | text          | NO  ← 공고 제목
tags                      | text[]        | YES ← 태그 배열
location                  | text          | NO  ← 지역
compensation              | text          | YES ← 급여
deadline                  | timestamp     | YES ← 마감일
is_urgent                 | boolean       | YES ← 긴급 여부
created_at                | timestamp     | NO  ← 생성일
job_type                  | text          | YES ← 직종 (기간제/시간제/대체교사)
detail_content            | text          | YES ← 상세 내용
attachment_url            | text          | YES ← 첨부파일 URL
source_url                | text          | YES ← 원본 URL

🆕 school_level           | text          | YES ← 학교급 (유치원/초등/중등/고등/특수)
🆕 subject                | text          | YES ← 과목 (담임/과학/영어/음악/체육/미술/실과/국어/수학/사회/도덕/기술가정)
🆕 required_license       | text          | YES ← 필요 라이센스 (초등담임/중등과학/유치원 등)
```

---

## 3️⃣ 필드 연동 매핑

### 프로필 → 공고 필터링 로직

| 프로필 필드 | 공고 필드 | 필터링 로직 | 우선순위 |
|-----------|---------|----------|---------|
| `teacher_level` | `school_level` | 초등/중등/유치원/특수 정확 매칭 | 🔴 CRITICAL |
| `preferred_subjects` | `subject` | 선호 과목과 공고 과목 일치도 | 🔴 CRITICAL |
| `preferred_subjects` | `required_license` | 라이센스 호환성 검사 | 🔴 CRITICAL |
| `interest_regions` | `location` | 지역 + 인접 지역 포함 | 🔴 CRITICAL |
| `preferred_job_types` | `job_type` | 기간제/시간제 필터링 | 🟠 HIGH |
| `experience_years` | (공고에 없음) | 경력 수준 맞춤 필터링 | 🟡 MEDIUM |
| `roles` | `tags` | 역할 기반 카드 타입 선택 | 🟡 MEDIUM |

---

## 4️⃣ 검증 쿼리

### 4-1. 프로필 데이터 확인

```sql
-- 특정 사용자 프로필 조회
SELECT 
  user_id,
  display_name,
  teacher_level,
  preferred_subjects,
  preferred_job_types,
  interest_regions,
  experience_years,
  intro
FROM user_profiles
WHERE user_id = '사용자_ID'
LIMIT 1;
```

**확인 항목**:
- ✅ `teacher_level`: 초등/중등/유치원/특수 중 하나?
- ✅ `preferred_subjects`: 배열로 ["초등담임", "초등과학", "초등음악"] 형태?
- ✅ `preferred_job_types`: 배열로 ["기간제", "시간제"] 형태?
- ✅ `interest_regions`: 배열로 ["성남", "수원", "용인"] 형태?

---

### 4-2. 공고 데이터 확인 (신규 필드)

```sql
-- 최근 공고 10건에서 신규 필드 확인
SELECT 
  id,
  title,
  location,
  school_level,
  subject,
  required_license,
  job_type,
  created_at
FROM job_postings
ORDER BY created_at DESC
LIMIT 10;
```

**확인 항목**:
- ✅ `school_level`: 초등/중등/유치원/특수 또는 NULL?
- ✅ `subject`: 과목명 또는 NULL?
- ✅ `required_license`: 라이센스 또는 NULL?
- ✅ `job_type`: 기간제/시간제/대체교사 또는 NULL?

---

### 4-3. 필드 채움 상태 통계

```sql
-- 신규 필드별 NULL 비율 확인
SELECT 
  COUNT(*) as total_count,
  COUNT(school_level) as school_level_filled,
  COUNT(subject) as subject_filled,
  COUNT(required_license) as required_license_filled,
  COUNT(job_type) as job_type_filled,
  ROUND(100.0 * COUNT(school_level) / COUNT(*), 2) as school_level_percent,
  ROUND(100.0 * COUNT(subject) / COUNT(*), 2) as subject_percent,
  ROUND(100.0 * COUNT(required_license) / COUNT(*), 2) as required_license_percent,
  ROUND(100.0 * COUNT(job_type) / COUNT(*), 2) as job_type_percent
FROM job_postings;
```

**예상 결과**:
```
total_count: 150
school_level_filled: 0 (0%)      ← 크롤러 재실행 필요
subject_filled: 0 (0%)           ← 크롤러 재실행 필요
required_license_filled: 0 (0%)  ← 크롤러 재실행 필요
job_type_filled: 120 (80%)       ← 이미 채워짐
```

---

### 4-4. 프로필별 호환 공고 확인

```sql
-- 특정 프로필의 호환 공고 찾기
-- 예: 초등 담임 교사, 성남/수원 관심, 기간제 선호

SELECT 
  j.id,
  j.title,
  j.location,
  j.school_level,
  j.subject,
  j.job_type,
  j.created_at,
  CASE 
    WHEN j.school_level = '초등' THEN '✅ 호환'
    WHEN j.school_level IS NULL THEN '⚠️ 미분류'
    ELSE '❌ 불호환'
  END as compatibility
FROM job_postings j
WHERE 
  -- 지역 필터
  (j.location ILIKE '%성남%' OR j.location ILIKE '%수원%' OR j.location ILIKE '%용인%')
  -- 직종 필터
  AND (j.job_type = '기간제' OR j.job_type IS NULL)
  -- 학교급 필터 (초등 담임)
  AND (j.school_level = '초등' OR j.school_level IS NULL)
ORDER BY j.created_at DESC
LIMIT 20;
```

---

### 4-5. 크롤러 저장 상태 확인

```sql
-- 크롤러별로 저장된 공고 수 및 필드 채움 상태
SELECT 
  COALESCE(source_url, '미상') as source,
  COUNT(*) as total_count,
  COUNT(school_level) as school_level_filled,
  COUNT(subject) as subject_filled,
  COUNT(job_type) as job_type_filled,
  MAX(created_at) as latest_crawl
FROM job_postings
GROUP BY source_url
ORDER BY latest_crawl DESC;
```

**예상 결과**:
```
source                              | total | school_level | subject | job_type | latest_crawl
gyeonggi.go.kr                      | 45    | 0            | 0       | 40       | 2025-10-24 07:00
seongnam.go.kr                      | 35    | 0            | 0       | 28       | 2025-10-24 06:30
uijeongbu.go.kr                     | 25    | 0            | 0       | 20       | 2025-10-24 06:00
```

---

## 5️⃣ 현재 상황 진단

### ✅ 이미 채워진 필드
- `job_type`: 크롤러에서 이미 저장 중
- `location`: 크롤러에서 이미 저장 중
- `tags`: 크롤러에서 이미 저장 중

### ❌ 채워지지 않은 필드
- `school_level`: NULL (크롤러 재실행 필요)
- `subject`: NULL (크롤러 재실행 필요)
- `required_license`: NULL (크롤러 재실행 필요)

### ⚠️ 프로필에서 미사용 필드
- `teacher_level`: 프로필에는 있지만 공고 필터링에 미사용
- `experience_years`: 프로필에는 있지만 공고 필터링에 미사용

---

## 6️⃣ 필요한 조치

### 1단계: DB 마이그레이션 실행 ✅
```bash
supabase db push
```

### 2단계: Edge Function 배포 ✅
```bash
supabase functions deploy profile-recommendations
```

### 3단계: 크롤러 재실행 (필수)
```bash
cd crawler
node index.js --source=gyeonggi
node index.js --source=seongnam
node index.js --source=uijeongbu
```

### 4단계: 필드 채움 상태 재확인
```sql
-- 4-3 쿼리 재실행
SELECT COUNT(*) as total_count,
       COUNT(school_level) as school_level_filled,
       COUNT(subject) as subject_filled
FROM job_postings;
```

---

## 7️⃣ 추가 개선 사항 (선택)

### teacher_level 활용
```sql
-- 프로필 teacher_level과 공고 school_level 매칭
SELECT 
  p.user_id,
  p.display_name,
  p.teacher_level,
  COUNT(j.id) as compatible_job_count
FROM user_profiles p
LEFT JOIN job_postings j ON 
  (p.teacher_level = '초등' AND j.school_level = '초등') OR
  (p.teacher_level = '중등' AND j.school_level IN ('중등', '초등')) OR
  (p.teacher_level = '유치원' AND j.school_level = '유치원') OR
  (p.teacher_level = '특수' AND j.school_level = '특수')
GROUP BY p.user_id, p.display_name, p.teacher_level;
```

### experience_years 활용
```sql
-- 경력 수준별 공고 추천
SELECT 
  p.user_id,
  p.experience_years,
  COUNT(j.id) as job_count
FROM user_profiles p
LEFT JOIN job_postings j ON 
  j.location ILIKE ANY(p.interest_regions)
WHERE 
  -- 경력 5년 미만: 신입/초급 공고만
  (p.experience_years < 5 AND j.title ILIKE '%신입%') OR
  -- 경력 5-10년: 중급 공고
  (p.experience_years BETWEEN 5 AND 10) OR
  -- 경력 10년 이상: 모든 공고
  (p.experience_years >= 10)
GROUP BY p.user_id, p.experience_years;
```

---

## 📋 체크리스트

- [ ] 프로필 테이블 필드 확인 (4-1 쿼리)
- [ ] 공고 테이블 신규 필드 확인 (4-2 쿼리)
- [ ] 신규 필드 채움 상태 확인 (4-3 쿼리)
- [ ] 크롤러별 저장 상태 확인 (4-5 쿼리)
- [ ] DB 마이그레이션 실행
- [ ] Edge Function 배포
- [ ] 크롤러 재실행
- [ ] 필드 채움 상태 재확인
- [ ] 호환 공고 필터링 테스트 (4-4 쿼리)

# Korean Education Search Redesign

## 1. Objectives
- **Capture_real_market_needs**: Remove the "정규직" concept and focus on 기간제, 시간제, 대체교사, 프로젝트, 학원강사만 노출.
- **Differentiate_search_modes**: Split 기능 into `공고 검색` (교사 → 공고) and `인력풀 검색` (학교 → 교사) with 전용 로직.
- **Embed_profile_context**: Treat 사용자 프로필(라이센스, 선호 지역/직종)을 검색 필터의 최우선 조건으로 사용.
- **Enforce_license_rules**: Reflect 상향식/하향식 라이센스 전환과 과목 교류 가능 여부를 필터/추천 로직에 내장.
- **Deliver_layered_results**: Tier 기반 결과(정확도)로 사용자에게 신뢰감 있는 검색 경험 제공.
- **Prioritize_location**: 지역을 가장 높은 가중치로 처리하고, 인접 지역 확대는 동일 시나리오에서 순차적으로 구성.

### Update Log (2025-10-23)
- **UI 전용 조정**: 공고 카드와 호버 확장 영역 연결성 개선이 프론트에서 처리되어 검색 로직·데이터 모델에는 추가 변경 사항 없음.
- **프로필 데이터 확장 반영**: `user_profiles` 테이블에 `teacher_level`, `special_education_type`, `instructor_fields`, `instructor_custom_field`, `profile_image_url` 컬럼을 추가하여 교사/강사 세부 정보를 저장할 수 있게 되었으며, 검색 및 추천 단계에서 해당 필드를 활용할 준비를 완료.

## 2. 사용자 프로필 구조
- **Primary_license** *(필수)*: `유치원`, `초등담임`, `초등과학`, `초등영어`, `초등체육`, `초등음악`, `초등미술`, `초등실과`, `중등과학`, `중등영어`, `중등체육`, `중등음악`, `중등미술`, `중등기술가정`, `중등국어`, `중등수학`, `중등사회`, `중등도덕`, `특수교사`.
- **Preferred_regions** *(선택)*: 사용자가 원하는 다중 지역 (예: 수원, 화성, 성남).
- **Preferred_job_types** *(선택)*: `기간제`, `시간제`, `대체교사`, `프로젝트`, `학원강사`.
- **Preferred_subjects** *(선택)*: 세부 선호 과목 목록.

> **Rule**: 검색 로직은 항상 `primary_license`를 우선 적용. 프로필이 허용하지 않는 공고는 입력 키워드가 일치하더라도 결과에 포함되지 않음.

## 3. 데이터 모델 확장

### 3.1 `license_compatibility`
```sql
CREATE TABLE license_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_license TEXT NOT NULL UNIQUE,
  searchable_job_licenses TEXT[] NOT NULL,
  transferable_subjects TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**예시 데이터**
```sql
INSERT INTO license_compatibility (user_license, searchable_job_licenses, transferable_subjects, notes) VALUES
('초등담임', ARRAY['초등담임','초등과학','초등영어','초등체육','초등음악','초등미술','초등실과'], ARRAY['담임','과학','영어','체육','음악','미술','실과'], '담임 라이센스는 초등 전담 과목 전체 가능'),
('초등과학', ARRAY['초등과학'], ARRAY['과학'], '초등 과학 전담만 가능, 담임 불가'),
('중등과학', ARRAY['중등과학','초등과학'], ARRAY['과학'], '중등 과학 → 초등 과학 전담 가능'),
('중등국어', ARRAY['중등국어'], ARRAY['국어'], '중등 국어만 가능'),
('유치원', ARRAY['유치원'], ARRAY[]::TEXT[], '유치원 전용'),
('특수교사', ARRAY['특수교사'], ARRAY[]::TEXT[], '특수학교/학급 전용');
```

### 3.2 `profiles` 확장
```sql
ALTER TABLE profiles
  ADD COLUMN primary_license TEXT NOT NULL,
  ADD COLUMN preferred_job_types TEXT[] DEFAULT ARRAY['기간제'],
  ADD COLUMN preferred_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN preferred_subjects TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD CONSTRAINT fk_profiles_license FOREIGN KEY (primary_license)
    REFERENCES license_compatibility (user_license);
```

### 3.3 `job_postings` 확장
```sql
ALTER TABLE job_postings
  ADD COLUMN school_level TEXT NOT NULL,
  ADD COLUMN subject TEXT NOT NULL,
  ADD COLUMN job_type TEXT NOT NULL,
  ADD COLUMN required_license TEXT NOT NULL,
  ADD COLUMN location TEXT NOT NULL,
  ADD CONSTRAINT fk_job_postings_license FOREIGN KEY (required_license)
    REFERENCES license_compatibility (user_license);
```

### 3.4 향후 테이블
- **`talent_profiles`**: 인력풀 검색 전용. 사용자 프로필과 동일한 라이센스 구조 및 선호 정보 포함.
- **`search_history`**: NLP 파싱 결과, 클릭 로그, 정확도 피드백 저장.

## 4. 라이센스 호환성 매트릭스 (요약)

| 프로필 \ 공고 | 초등담임 | 초등과학 | 초등영어 | 중등과학 | 중등국어 | 유치원 | 특수 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **초등담임** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **초등과학** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **중등과학** | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **중등국어** | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **유치원** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **특수교사** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

> **상향식 호환 가능**: `중등 → 초등 전담`, `초등 담임 → 초등 전담`.
> **하향식 호환 불가**: `초등 → 중등`, `유치원 → 초등/중등`, `전담 → 담임`.

## 5. 검색 모드

### 5.1 공고 검색 (교사 → 공고)
- **Step 1**: 사용자 프로필에서 `primary_license` 추출.
- **Step 2**: `license_compatibility`에서 검색 가능한 공고 라이센스 목록 획득.
- **Step 3**: NLP 파이프라인으로 입력(예: "수원 10월 초등 기간제") 파싱 → `{location, start_month, school_level, subject, job_type}`.
- **Step 4**: 프로필 기반 필터를 최우선 적용.
- **Step 5**: Tier 기반 결과 정렬.

### 5.2 인력풀 검색 (학교 → 교사)
- **Step 1**: 학교 요청(예: "수원 초등 과학 기간제 교사") 파싱.
- **Step 2**: `license_compatibility`의 `searchable_job_licenses`를 반대로 활용하여 호환 가능한 교사 프로필 추출.
- **Step 3**: 프로필 선호/가능 지역, 직종, 과목 적용.
- **Step 4**: Tier 기반 추천 (100%, 85-95%, 60-75%, 40-59%).

## 6. 공고 검색 정확도 Tier 정의
- **Tier 1 (정확도 ≥95%)**: 모든 조건 일치.
- **Tier 2 (정확도 80-94%)**: 지역·학교 레벨·과목·직종 중 1개만 다름.
  - **지역**: 인접 시/군 (예: 수원 ↔ 화성).
  - **학교 레벨**: 교류 가능 과목 한정 (예: 중등 과학 ↔ 초등 과학).
  - **과목**: 동일 전담 군(과학, 영어, 체육, 음악, 미술, 실과).
  - **직종**: 동일 범주 (예: 기간제 ↔ 시간제).
- **Tier 3 (정확도 60-79%)**: 2개 조건 다름.
- **Tier 4 (정확도 40-59%)**: 3개 이상 다름 또는 관련 추천.

## 7. 지역 우선 로직
- **Step 1**: 정확한 시/구/군 매칭.
- **Step 2**: 행정동 단위 확장 (예: 수원 → 권선구, 영통구).
- **Step 3**: 반경 30km 이내 도시 추천 (정확도 가중치 하락).
- **Step 4**: 사용자 선호 지역이 다중일 경우 우선 순위 ordering.

## 8. NLP + 하이브리드 검색
- **파이프라인**
  1. Gemini API로 자연어 파싱 (지역, 시작월, 학교급, 과목, 직종, 기타 키워드).
  2. 키워드 기반 필터 (ILIKE, 정규화된 location).
  3. 의미 기반 벡터 검색 (pgvector)로 보조 결과 수집.
  4. 두 결과 세트를 신뢰도 가중치(키워드 70%, 의미 30%)로 재정렬.
  5. Tier 스코어와 결합해 최종 정렬.
- **캐싱 전략**: 자주 사용되는 파라미터 조합에 대한 파싱 결과/벡터를 캐싱.

## 9. UI/UX 개선안
- **검색창 플레이스홀더**: "예: 수원 10월 초등 과학 기간제".
- **CTA 버튼**: `AI 추천`, `상세 필터` (아코디언), `초기화`는 서브 액션으로.
- **결과 뷰**: Tier별 섹션, 정확도/호환성 배지, 라이센스 호환 설명 Tooltip.
- **프로필 배너**: 사용자 프로필 정보 요약 + 수정 CTA 제공.
- **알림/추천**: 조건에 맞는 신규 공고/교사 알림 구독.

## 10. 구현 로드맵 (Phase)
- **Phase 1 – 데이터 구조 (1주)**
  - `license_compatibility`, `profiles` 확장, `job_postings` 스키마 변경.
  - 초기 호환성 매트릭스 데이터 시드.
- **Phase 2 – 검색 로직 (1주)**
  - 프로필 기반 필터링, NLP 파싱 통합, Tier 계산 로직 구현.
  - 공고 검색 우선 구축, 단위 테스트.
- **Phase 3 – 인력풀 검색 (1~2주)**
  - `talent_profiles` 생성 및 데이터 마이그레이션.
  - 학교 요청형 검색 로직 + 라이센스 역매핑 구현.
- **Phase 4 – UI/UX (1주)**
  - 검색창 리디자인, Tier 기반 결과 UI, 호환성 안내 요소.
- **Phase 5 – AI 추천 & 피드백 루프 (2주)**
  - 검색 이력 저장, 추천 모델 초기 버전, 사용자 피드백 수집.
  - 성능 모니터링, 추천 다양성 검증.

## 11. 우선 해결해야 할 작업
- **데이터 정합성 확인**: 기존 공고/프로필 데이터에 라이센스 매핑 필요.
- **행정구역 데이터 정비**: 위치 정규화 및 인접 지역 매핑 테이블 구축.
- **NLP 파이프라인 정책**: API 비용 관리, 실패 시 fallback 로직.
- **RLS/보안 검토**: 프로필·인력풀 데이터 접근 권한 재점검.

## 12. 향후 고려 사항
- **경력, 희망 연봉, 근무 가능 시간** 등 추가 프로필 속성 확장.
- **추천 다양성 지표 구축**: 특정 학교/지역 편중 방지.
- **사용자 교육**: 새 검색 방식 온보딩 튜토리얼/가이드.
- **A/B 테스트**: Tier UI 및 추천 전략 검증.

---

# 사용자 프로필 정교화 & 가입 폼 설계

## 1. 개요
사용자 프로필을 다차원적으로 수집하여 AI 검색 정교화의 정확도를 극대화하는 가입 폼 설계. 단계별 입력을 통해 프로필 완성도를 높이고, 사용자에게 상세 입력의 중요성을 인식시킴.

## 2. 프로필 데이터 모델 (수정)

### 2.1 필수 정보 (가입 시 반드시 입력)
```
교육 자격
├─ 역할 (라이센스) ⭐ 핵심
│  ├─ 유치원 교사
│  ├─ 초등 담임 교사
│  ├─ 초등 과학/영어/체육/음악/미술/실과 전담
│  ├─ 중등 (과학/영어/국어/수학/사회/도덕/음악/미술/체육/기술가정)
│  ├─ 고등 (과목 선택)
│  ├─ 특수 교사
│  └─ 강사 ⭐ 변경
│     ├─ 분야 (대표 10가지 + 자유 입력)
│     │  ├─ 요리
│     │  ├─ 코딩
│     │  ├─ 음악
│     │  ├─ 체육
│     │  ├─ AI교육
│     │  ├─ 심리상담
│     │  ├─ 교권보호
│     │  ├─ 유아놀이
│     │  ├─ (추가 2개 TBD)
│     │  └─ 자유 입력: "직접 기입"
│
├─ 교사 경력: 신입 / 1-3년 / 3-5년 / 5-10년 / 10년+
│
└─ 보유 자격증 ⭐ 수정 (기간제 교사 자격 삭제)
   ├─ 정교사 1급
   ├─ 정교사 2급
   ├─ 특수교육 자격
   └─ 기타 (자유 입력)

선호도 정보
├─ 선호 지역 (다중 선택, 최대 5개)
├─ 지역 확대 허용: 정확한 지역만 / 인접 지역 / 경기도 전역
├─ 선호 직종 ⭐ 수정 (대체 교사 삭제, 프로젝트 → 협력수업)
│  ├─ 기간제 교사
│  ├─ 시간제 교사
│  └─ 경력을 활용한 협력수업
│
└─ 선호 과목 (다중 선택, 역할에 따라 동적)
```

### 2.2 심화 정보 (가입 후 선택)
```
추가 역량 ⭐ 변경 (자유 입력 필드)
├─ 텍스트 입력 필드 (여러 줄)
├─ 플레이스홀더: "예: 영어 회화, 피아노, 프로그래밍"
└─ 사용자가 자신의 역량 직접 기입
```

### 2.3 삭제된 항목
```
❌ 선호 근무 시간 (의미 없음)
❌ 최소 주당 시간 (의미 없음)
❌ 급여 기대치 (필요 없음)
❌ 기간제 교사 자격증 (정교사 2급이 이미 포함)
❌ 대체 교사 (직종)
❌ 학원강사 (직종 - 강사 역할과 분리)
```

### 2.4 데이터베이스 스키마 (profiles 테이블 확장)
```sql
-- 필수 정보
ALTER TABLE profiles ADD COLUMN (
  primary_license TEXT NOT NULL,
  experience_level TEXT NOT NULL,
  certifications TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- 강사 역할 추가
ALTER TABLE profiles ADD COLUMN (
  instructor_category TEXT,  -- '요리', '코딩', '음악' 등 또는 자유 입력
  instructor_custom_category TEXT  -- 자유 입력 분야
);

-- 선호도 정보
ALTER TABLE profiles ADD COLUMN (
  preferred_regions TEXT[] DEFAULT ARRAY[]::TEXT[],
  region_expansion_type TEXT DEFAULT 'exact',  -- 'exact', 'adjacent', 'unlimited'
  preferred_job_types TEXT[] DEFAULT ARRAY['기간제']::TEXT[],
  preferred_subjects TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- 우선순위 (JSON)
ALTER TABLE profiles ADD COLUMN (
  region_priority JSONB DEFAULT '[]'::JSONB,
  job_type_priority JSONB DEFAULT '[]'::JSONB,
  subject_priority JSONB DEFAULT '[]'::JSONB
);

-- 추가 역량 (자유 입력)
ALTER TABLE profiles ADD COLUMN (
  additional_skills TEXT DEFAULT ''
);

-- 메타데이터
ALTER TABLE profiles ADD COLUMN (
  profile_completion_percentage INTEGER DEFAULT 0,
  profile_updated_at TIMESTAMP DEFAULT NOW()
);
```

## 3. 가입 폼 UI/UX 설계

### 3.1 가입 플로우 (6 Step)

**Pre-Step: 인식 개선 모달** ⭐ 신규
```
┌─────────────────────────────────────┐
│ 프로필 입력 안내                     │
├─────────────────────────────────────┤
│                                     │
│ 선생님, 단계별로 자세히 입력해주실  │
│ 수록 AI가 가장 정확하게, 가장 빨리 │
│ 추천해 드릴 수 있습니다.            │
│ 부탁드립니다.                       │
│                                     │
│ [확인] [건너뛰기]                   │
└─────────────────────────────────────┘
```

**Step 1: 기본 신원 (1분)**
```
이름, 이메일, 전화번호, 프로필 사진
```

**Step 2: 교육 자격 (3분)** ⭐ 수정
```
역할 선택 (드롭다운)
├─ 강사 선택 시 분야 선택 추가
│  ├─ 대표 10가지 (체크박스)
│  └─ 자유 입력 필드 (텍스트)
경력 선택 (라디오 버튼)
자격증 (체크박스) - 기간제 교사 자격 제거
```

**Step 3: 선호도 설정 (3분)** ⭐ 수정
```
선호 지역 (다중 선택)
지역 확대 방식 (라디오)
선호 직종 (다중 선택) - 대체 교사 삭제, 협력수업 추가
선호 과목 (다중 선택)
```

**Step 4: 우선순위 설정 (2분)**
```
지역 우선순위 (드래그)
직종 우선순위 (드래그)
과목 우선순위 (드래그)
```

**Step 5: 추가 역량 (선택, 1분)** ⭐ 수정
```
텍스트 입력 필드 (여러 줄)
플레이스홀더: "예: 영어 회화, 피아노, 프로그래밍"
자유 입력
```

### 3.2 프로필 완성도 표시
```
프로필 완성도: ████████░░ 80%
필수: ✅ | 선택: ⏳ (1개 항목 남음)
추가 역량 입력 시 AI 추천 정확도 향상
```

### 3.3 UI 스타일 가이드 ⭐ 신규
```
메인페이지 UI 컨셉 준수
├─ 색상: 메인페이지 색상 팔레트 사용
├─ 폰트: NEXON Lv2 Gothic (메인페이지와 동일)
├─ 구성: 미니멀한 디자인
├─ 이모지: 사용 금지 ❌
├─ 아이콘: 필요한 곳에만 적절하게 사용
│  ├─ 진행률 표시 (상단 프로그레스 바)
│  ├─ 필수/선택 표시 (별 아이콘)
│  ├─ 드래그 핸들 (≡ 아이콘)
│  └─ 버튼 (화살표, 체크 등)
└─ 여백: 충분한 여백으로 가독성 확보
```

## 4. 프로필 저장 & 검증 로직

### 4.1 검증 규칙
```
필수 필드 검증
├─ primary_license: NOT NULL, 허용 라이센스만
├─ experience_level: NOT NULL
├─ preferred_regions: 최소 1개
└─ preferred_job_types: 최소 1개

조건부 검증
├─ 강사 역할 선택 시 instructor_category 또는 instructor_custom_category 필수
├─ 라이센스-과목 호환성 검증
│  └─ 초등 담임 선택 시 과목은 초등 전담만 가능
│  └─ 중등 과학 선택 시 과목은 과목만 가능
│  └─ 유치원 선택 시 과목 선택 불가
└─ 우선순위 개수 = 선택 항목 개수
```

### 4.2 저장 플로우
```
사용자 입력
    ↓
클라이언트 검증 (즉시 피드백)
    ↓
서버 검증 (보안)
    ↓
프로필 정규화 (소문자, 공백 제거 등)
    ↓
license_compatibility 테이블과 교차 검증
    ↓
profiles 테이블 저장
    ↓
프로필 완성도 계산
    ↓
AI 프로필 인덱싱 (벡터 생성)
    ↓
완료 메시지 + 검색 페이지로 이동
```

## 5. AI 프로필 읽기 & 검색 정교화

### 5.1 AI 검색 정교화 파이프라인
```
사용자 검색 입력
    ↓
Step 1: 프로필 로드
├─ primary_license, preferred_regions, preferred_job_types 추출
└─ 프로필 완성도 확인
    ↓
Step 2: 라이센스 호환성 필터링
├─ license_compatibility 테이블 조회
└─ 검색 가능 공고 라이센스 추출
   예: 중등과학 → ['중등과학', '초등과학']
    ↓
Step 3: 입력 파싱 (NLP)
├─ Gemini API로 자연어 파싱
└─ 예: "수원 10월 기간제" 
   → {location: "수원", month: "10월", job_type: "기간제"}
    ↓
Step 4: 프로필 기반 정교화
├─ 파싱 결과 + 프로필 정보 병합
├─ 지역: 입력 있으면 입력 우선, 없으면 프로필 사용
├─ 직종: 입력 + 프로필 교집합, 우선순위 적용
└─ 과목: 입력 없으면 프로필 과목 사용
    ↓
Step 5: 호환성 필터 적용
├─ WHERE required_license IN (호환 라이센스)
├─ WHERE location IN (정교화된 지역)
├─ WHERE job_type IN (정교화된 직종)
└─ WHERE subject IN (정교화된 과목)
    ↓
Step 6: Tier 기반 정렬
├─ Tier 1 (95%+): 모든 조건 일치
├─ Tier 2 (80-94%): 1개 조건 다름
├─ Tier 3 (60-79%): 2개 조건 다름
└─ Tier 4 (40-59%): 3개 이상 다름
    ↓
Step 7: 결과 반환
├─ Tier별 섹션 표시
├─ 정확도 배지
└─ 호환성 설명 제공
```

### 5.2 정교화 예시

**예시 1: 초등담임 + 선호지역[수원,화성] + 선호직종[기간제]**
```
입력: "과학 기간제"
프로필: 초등담임, 경력3년, 지역[수원,화성], 직종[기간제]

→ 호환 라이센스: ['초등담임','초등과학','초등영어',...]
→ 정교화: 지역[수원,화성], 과목[과학], 직종[기간제]

결과:
Tier 1 (98%): 수원 초등 과학 기간제 ✅
Tier 1 (98%): 화성 초등 과학 기간제 ✅
Tier 2 (87%): 수원 초등 과학 시간제 (직종만 다름)

❌ 제외: 수원 중등 과학 (호환 불가)
```

**예시 2: 중등과학 + 선호지역[수원] + 선호직종[기간제,시간제]**
```
입력: "수원 기간제"
프로필: 중등과학, 경력5년, 지역[수원], 직종[기간제,시간제]

→ 호환 라이센스: ['중등과학','초등과학']
→ 정교화: 지역[수원], 과목[과학], 직종[기간제,시간제]

결과:
Tier 1 (98%): 수원 중등 과학 기간제 ✅
Tier 2 (87%): 수원 초등 과학 기간제 (학교레벨, 중등>초등 가능)
Tier 2 (87%): 수원 중등 과학 시간제 (직종만 다름)

❌ 제외: 수원 초등 담임 (호환 불가)
```

## 6. 통합 테스트 & 최적화

### 6.1 테스트 시나리오
```
Scenario 1: 완전한 프로필 + 명확한 입력
├─ 입력: "수원 과학"
├─ 프로필: 완성도 100%
└─ 기대: Tier 1 정확도 95%+

Scenario 2: 부분 프로필 + 모호한 입력
├─ 입력: "기간제"
├─ 프로필: 완성도 60% (지역 미설정)
└─ 기대: 기본 필터 적용 + 경고

Scenario 3: 미완성 프로필
├─ 입력: "초등 기간제"
├─ 프로필: 완성도 40%
└─ 기대: 필수 정보만 사용
```

### 6.2 성능 지표
```
프로필 완성도 vs 검색 정확도
├─ 40%: 정확도 65%
├─ 60%: 정확도 78%
├─ 80%: 정확도 88%
└─ 100%: 정확도 95%+

AI 정교화 효과
├─ 미적용: 평균 클릭 2.5회
├─ 적용: 평균 클릭 1.3회
└─ 개선: -48%
```

### 6.3 구현 타임라인
```
Phase 5-1 (1주): 기본 통합
├─ 프로필 저장/로드 테스트
├─ 호환성 검증
└─ 기본 검색 정교화

Phase 5-2 (1주): AI 최적화
├─ NLP 파싱 정확도
├─ 프로필 가중치 튜닝
└─ Tier 계산 검증

Phase 5-3 (1주): UX 최적화
├─ 완성도 UI 개선
├─ 검색 결과 설명
└─ 모바일 테스트

Phase 5-4 (지속): 모니터링
├─ 사용자 피드백 수집
├─ 검색 정확도 추적
└─ 프로필 데이터 분석
```

## 7. 요약 (수정 사항)

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| **역할** | 학원강사 | 강사 (분야 10가지 + 자유 입력) |
| **자격증** | 기간제 교사 자격 포함 | 기간제 교사 자격 삭제 |
| **선호 직종** | 대체 교사, 프로젝트 | 경력을 활용한 협력수업 (대체 교사 삭제) |
| **근무 시간** | 선호 근무 시간 포함 | 삭제 (의미 없음) |
| **추가 역량** | 외국어/특기 선택 | 자유 입력 필드 |
| **급여** | 희망 시급 범위 | 삭제 |
| **가입 모달** | 없음 | 신규 추가 (인식 개선) |
| **UI 스타일** | 일반 | 메인페이지 컨셉 (미니멀, 이모지 금지) |

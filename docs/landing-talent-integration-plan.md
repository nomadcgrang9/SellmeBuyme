# 랜딩페이지-인력카드 연동 시스템 설계 문서

**작성일**: 2025-11-05
**목적**: 랜딩페이지에서 수집한 인력 정보를 실제 인력카드로 등록하는 시스템 구현

---

## 📋 목차

1. [프로젝트 배경](#프로젝트-배경)
2. [크롤링 시스템 문제 해결](#크롤링-시스템-문제-해결)
3. [랜딩페이지-인력카드 연동 요구사항](#랜딩페이지-인력카드-연동-요구사항)
4. [현재 시스템 구조 분석](#현재-시스템-구조-분석)
5. [구현 계획](#구현-계획)
6. [데이터 흐름 설계](#데이터-흐름-설계)
7. [파일 수정 목록](#파일-수정-목록)
8. [구현 우선순위](#구현-우선순위)

---

## 프로젝트 배경

### 핵심 목표
**"랜딩페이지에서 간단히 입력받은 정보로 즉시 인력카드를 생성하고, 실제 카드 레이아웃을 미리보기로 보여줌으로써 즉각적인 만족감을 제공한다."**

### 사용자 여정
1. 랜딩페이지 방문
2. 이름, 역할, 지역, 분야, 연락처 입력 (기존)
3. **"관심있음" 선택 시 추가 정보 입력** (신규)
   - 전문 분야 상세 선택
   - 경력 선택
   - 자격/면허, 자기소개 (선택)
   - 이메일 입력
4. **실제 인력카드 미리보기 표시** ⭐ (핵심 기능)
   - "이렇게 서비스에 등록되어서 선생님을 학교와 연결하겠습니다"
   - 실제 메인페이지와 동일한 TalentCard 레이아웃 표시
5. "등록 완료하기" 클릭 → talents 테이블에 비회원 등록
6. 메인페이지로 이동 시 인력카드 토글 자동 ON + 하이라이트

### 교사 분기 처리
- **교사만 선택한 경우**: "인력풀 검색을 하거나 아이들을 위한 체험프로그램을 보러 가시겠어요?"
  - "공고 보러가기" 버튼 → 메인페이지 (인력카드 토글 OFF)
- **강사/행정인력/업체 포함 시**: 인력카드 등록 프로세스 진행

---

## 크롤링 시스템 문제 해결

### 1. "미상" location 카드 원인 분석

#### 문제
프론트엔드에서 일부 공고 카드의 location이 "미상"으로 표시됨

#### 원인
- 26개 "미상" 카드: **crawl_board_id = NULL** (예전 데이터)
- 2025-11-04 이전 크롤링 데이터
- 중복 방지 로직(`source_url` 기반)으로 재크롤링되지 않음 → 정상 동작

#### 해결
- **최근 크롤링 데이터 (2025-11-05 이후)**: 모두 location 정상
- 성남교육지원청: 6개 신규 공고 모두 `location='성남'` ✅
- 구리남양주: 10개 신규 공고 모두 `location='구리남양주'` ✅
- 기초자치단체 location 하드코딩 시스템 정상 작동 확인

#### 검증 스크립트
- `scripts/db/analyze-misung-cards.ts`: "미상" 카드 원인 분석
- `scripts/db/verify-seongnam-locations.ts`: 성남 크롤링 결과 검증
- `scripts/db/verify-namyangju-crawl.ts`: 구리남양주 크롤링 결과 검증

---

### 2. 구리남양주 크롤러 source 수정

#### 문제
구리남양주 게시판 크롤링 실패
```
에러: crawl_boards에 "구리남양주교육지원청 인력풀" 게시판이 없습니다.
```

#### 원인
- GitHub Actions 워크플로우가 `source=namyangju`로 설정됨
- `sources/namyangju.js`는 "구리남양주교육지원청 인력풀" 이름으로 DB 조회
- 실제 DB에는 **"구리남양주 기간제교사"**로 등록됨
- 이 게시판은 **AI 생성 크롤러** (`crawler_source_code` 컬럼 값 있음)

#### 해결
`.github/workflows/run-crawler.yml` 수정:

**Line 77-79 (Manual dispatch 매핑)**:
```yaml
elif [ "$BOARD_ID" = "5d7799d9-5d8d-47a2-b0df-6dd4f39449bd" ]; then
  echo "source=ai-generated" >> $GITHUB_OUTPUT  # namyangju → ai-generated
  exit 0
```

**Line 227-229 (Scheduled matrix)**:
```yaml
- board_id: '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd'
  source: 'ai-generated'  # namyangju → ai-generated
  name: '구리남양주 기간제교사'
```

**Line 121-139, 277-295 (Case문)**:
```bash
# namyangju 케이스 제거
"ai-generated")
  echo "🤖 Running AI-generated crawler for board: $BOARD_ID"
  node index.js --board-id="$BOARD_ID" --mode="$CRAWL_MODE"
  ;;
```

#### 결과
- 10개 공고 크롤링 성공 ✅
- 모든 공고 `location='구리남양주'` 정상 설정 ✅
- 프론트엔드에서 카드 정상 표시 확인 ✅

---

### 3. 자동 크롤링 스케줄 검증

#### GitHub Actions Cron 설정
- **Cron 표현식**: `0 1 * * *` (UTC)
- **한국시간**: 매일 오전 10시 (UTC+9)

#### Scheduled Matrix 구성 (5개 게시판)
```yaml
matrix:
  board:
    - board_id: 'f4c852f1-f49a-42c5-8823-0edd346f99bb'
      source: 'gyeonggi'
      name: '경기도교육청 구인정보조회'

    - board_id: '5a94f47d-5feb-4821-99af-f8805cc3d619'
      source: 'seongnam'
      name: '성남교육지원청 구인'

    - board_id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb'
      source: 'uijeongbu'
      name: '의정부교육지원청 구인'

    - board_id: '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd'
      source: 'ai-generated'
      name: '구리남양주 기간제교사'

    - board_id: 'de02eada-6569-45df-9f4d-45a4fcc51879'
      source: 'ai-generated'
      name: '가평교육지원청 기간제교원 구인구직'
```

#### 검증 결과
- 5개 게시판 모두 DB 승인 게시판과 100% 동기화 ✅
- 모든 게시판 `is_active=true`, `approved_at IS NOT NULL` ✅
- 구리남양주 source 수정 완료 (`ai-generated`) ✅

#### 검증 스크립트
`scripts/db/verify-crawl-boards.ts`: 전체 크롤링 게시판 설정 정밀 진단

---

## 랜딩페이지-인력카드 연동 요구사항

### 핵심 요구사항

1. **간편한 인력 등록 허들 낮추기**
   - 회원가입 없이 랜딩페이지에서 바로 인력카드 등록
   - 필수 정보만 간단히 입력

2. **즉각적인 시각적 피드백**
   - 입력한 정보로 **실제 인력카드 미리보기** 표시
   - "이렇게 서비스에 등록되어서 선생님을 학교와 연결하겠습니다"
   - 실제 메인페이지와 동일한 `TalentCard` 컴포넌트 사용

3. **자연스러운 인력풀 확보**
   - 랜딩페이지 → 인력카드 등록 → 메인페이지 노출
   - LocalStorage에 등록 정보 저장 (비회원)
   - 나중에 회원가입 시 자동 연결

4. **교사 분기 처리**
   - 교사만 선택: 인력카드 등록 프로세스 스킵
   - 강사/행정인력/업체 포함: 인력카드 등록 진행

---

## 현재 시스템 구조 분석

### 1. Landing.tsx (랜딩페이지)

#### 현재 단계 구성 (15단계)
```typescript
type Step =
  | 'greeting'           // 1. 인사
  | 'name'              // 2. 이름 입력
  | 'role'              // 3. 역할 선택 (교사/강사/행정인력/업체)
  | 'region'            // 4. 지역 선택
  | 'field'             // 5. 분야 선택
  | 'phone'             // 6. 연락처 입력
  | 'review'            // 7. 입력 내용 확인
  | 'card-registration' // 8. "관심있음" 선택
  | 'done';             // 9. 완료 → 메인페이지 이동
```

#### 문제점
- 수집만 하고 **저장 안 함** ❌
- 인력카드 등록 프로세스 없음 ❌
- 미리보기 기능 없음 ❌
- 메인페이지로 바로 이동만 함

---

### 2. TalentRegistrationForm.tsx (인력 등록 폼)

#### 입력 필드 구조 (8개 필수 + 2개 선택)

**필수 필드 (8개)**:
```typescript
1. name: string                    // 이름
2. specialty: SpecialtyFormData    // 전문 분야 (복합 객체)
   {
     contractTeacher: { enabled: boolean }
     kindergarten: { enabled: boolean }
     elementary: { enabled: boolean }
     secondary: { enabled: boolean }
     afterSchool: { enabled: boolean }
     administrative: { enabled: boolean }
     vendor: { enabled: boolean }
   }
3. experience: '신규' | '1~3년' | '3~5년' | '5년 이상'  // 경력
4. location: RegionFormData         // 지역 (복합 객체)
   {
     seoul: string[]                 // ['강남구', '서초구']
     gyeonggi: string[]              // ['성남시', '수원시']
     seoulAll: boolean
     gyeonggiAll: boolean
   }
5. phone: string                    // 전화번호
6. email: string                    // 이메일

// 선택 필드 (2개)
7. license?: string                 // 자격/면허
8. introduction?: string            // 자기소개
```

---

### 3. TalentCard.tsx (인력카드 컴포넌트)

#### 표시 정보
- **상단 컬러 바**: 녹색 (`#c5e3d8`)
- **타입 뱃지**: "인력"
- **이름**: `talent.name`
- **전문 분야**: `talent.specialty` (자동 생성 요약)
- **태그**: `talent.tags` 배열 (최대 2개 표시)
- **지역**: 📍 `talent.location` 배열 ("서울-강남구" 형식)
- **경력**: 💼 `talent.experience_years` → "신규", "2년", "4년", "6년 이상"
- **연락처**: 📞 `talent.phone`, @ `talent.email`
- **평점**: ⭐ `talent.rating`, 리뷰 `talent.review_count`개
- **프로필 이미지**: `specialty` 기반 자동 매핑
- **본인 카드**: "수정하기" 버튼 표시

---

### 4. talents 테이블 (DB 스키마)

```sql
CREATE TABLE public.talents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),  -- NULL 허용 (비회원 등록 지원)

  -- 기본 정보
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,              -- 자동 생성 요약 ("기간제교사, 초등")
  tags TEXT[],                          -- 자동 생성 태그 (["기간제", "초등"])

  -- 지역/경력
  location TEXT[] NOT NULL,             -- ["서울-강남구", "서울-서초구"]
  experience_years INTEGER NOT NULL,    -- 0, 2, 4, 6

  -- 연락처
  phone TEXT NOT NULL,
  email TEXT,

  -- 선택 정보
  license TEXT,
  introduction TEXT,

  -- 메타데이터
  form_payload JSONB,                   -- 원본 폼 데이터 (복원용)
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### RLS 정책
```sql
-- 비회원 INSERT 허용 필요
ALTER TABLE talents ENABLE ROW LEVEL SECURITY;

-- 모든 사용자 조회 가능
CREATE POLICY "Anyone can read talents"
  ON talents FOR SELECT USING (true);

-- 인증된 사용자만 본인 데이터 수정/삭제
CREATE POLICY "Users can update own talents"
  ON talents FOR UPDATE USING (auth.uid() = user_id);

-- 비회원 INSERT 허용 (신규 추가 필요) ⭐
CREATE POLICY "Anyone can insert talents"
  ON talents FOR INSERT WITH CHECK (true);
```

---

## 구현 계획

### Phase 1: 랜딩페이지 확장 (19단계)

#### 신규 단계 추가
```typescript
type Step =
  | 'greeting'           // 1. 인사
  | 'name'              // 2. 이름
  | 'role'              // 3. 역할 (교사/강사/행정인력/업체)
  | 'region'            // 4. 지역
  | 'field'             // 5. 분야
  | 'phone'             // 6. 연락처
  | 'review'            // 7. 입력 내용 확인
  | 'card-registration' // 8. "관심있음" 선택

  // 🆕 신규 단계
  | 'specialty-detail'  // 15. 전문 분야 상세 선택 ⭐
  | 'experience'        // 16. 경력 선택 ⭐
  | 'optional-info'     // 17. 자격/면허, 자기소개 (선택) ⭐
  | 'email'             // 18. 이메일 입력 ⭐
  | 'preview'           // 19. 인력카드 미리보기 ⭐⭐⭐
  | 'done';             // 20. 완료
```

---

### Phase 2: 인력카드 미리보기 구현 (핵심!)

#### Step 19: preview 단계
```tsx
// Landing.tsx에서 추가
{step === 'preview' && (
  <div className="space-y-6">
    <div className="text-center space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        🎉 등록 완료!
      </h2>
      <p className="text-gray-700 leading-relaxed">
        <span className="text-talent-primary font-semibold">{userInput.name}</span>님의 정보가 아래와 같이 등록됩니다.
      </p>
      <p className="text-sm text-gray-600">
        이렇게 서비스에 등록되어서 선생님을 학교와 연결하겠습니다.
      </p>
    </div>

    {/* 실제 TalentCard 컴포넌트 표시 ⭐ */}
    <div className="max-w-md mx-auto">
      <TalentCard
        talent={transformLandingToTalent(userInput)}
        isPreview={true}
      />
    </div>

    <div className="space-y-3">
      <button
        onClick={handleCompleteRegistration}
        className="w-full bg-talent-primary text-white py-3 rounded-lg"
      >
        등록 완료하기
      </button>
      <button
        onClick={() => setStep('specialty-detail')}
        className="w-full border border-gray-300 py-3 rounded-lg"
      >
        수정하기
      </button>
    </div>
  </div>
)}
```

---

### Phase 3: 데이터 변환 유틸리티

#### `src/lib/utils/landingTransform.ts` 생성
```typescript
import { TalentRow } from '@/lib/supabase/talents';

interface LandingInput {
  name: string;
  role: string[];  // ["강사", "행정인력"]
  region: string;  // "서울"
  field: string;   // "체육"
  phone: string;
  specialty?: SpecialtyFormData;
  experience?: string;
  email?: string;
  license?: string;
  introduction?: string;
}

/**
 * 랜딩페이지 입력값을 TalentRow 형식으로 변환
 */
export function transformLandingToTalent(input: LandingInput): TalentRow {
  return {
    id: crypto.randomUUID(),  // 미리보기용 임시 ID
    user_id: null,
    name: input.name,
    specialty: generateSpecialty(input),
    tags: generateTags(input),
    location: formatLocation(input),
    experience_years: parseExperience(input.experience),
    phone: input.phone,
    email: input.email || null,
    license: input.license || null,
    introduction: input.introduction || null,
    form_payload: input,  // 원본 데이터 저장
    is_verified: false,
    rating: null,
    review_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * specialty 자동 생성
 * 예: "기간제교사, 초등" or "강사, 체육"
 */
function generateSpecialty(input: LandingInput): string {
  const roles = input.role.join(', ');
  const field = input.field || '';
  return field ? `${roles}, ${field}` : roles;
}

/**
 * tags 자동 생성
 * 예: ["기간제", "초등"] or ["강사", "체육"]
 */
function generateTags(input: LandingInput): string[] {
  const tags: string[] = [];

  input.role.forEach(role => {
    if (role.includes('기간제')) tags.push('기간제');
    if (role.includes('강사')) tags.push('강사');
    if (role.includes('행정')) tags.push('행정');
    if (role.includes('업체')) tags.push('업체');
  });

  if (input.field) tags.push(input.field);

  return tags.slice(0, 3);  // 최대 3개
}

/**
 * location 배열 생성
 * 예: ["서울-강남구", "서울-서초구"]
 */
function formatLocation(input: LandingInput): string[] {
  // 현재 랜딩페이지는 광역만 받음
  // 추후 상세 지역 선택 시 확장 가능
  return [input.region];
}

/**
 * 경력 문자열 → experience_years 변환
 */
function parseExperience(exp?: string): number {
  if (!exp) return 0;
  if (exp === '신규') return 0;
  if (exp === '1~3년') return 2;
  if (exp === '3~5년') return 4;
  if (exp === '5년 이상') return 6;
  return 0;
}

/**
 * 전화번호 해싱 (비회원 식별자)
 */
export function hashPhone(phone: string): string {
  // 간단한 해싱 (추후 bcrypt 등으로 강화 가능)
  return `guest_${btoa(phone).slice(0, 16)}`;
}
```

---

### Phase 4: 비회원 인력카드 등록

#### DB 마이그레이션
```sql
-- supabase/migrations/20250211_landing_talent_registration.sql

-- 비회원 등록 지원을 위한 컬럼 추가
ALTER TABLE talents ADD COLUMN IF NOT EXISTS temp_identifier TEXT;
ALTER TABLE talents ADD COLUMN IF NOT EXISTS is_guest_registered BOOLEAN DEFAULT false;
ALTER TABLE talents ADD COLUMN IF NOT EXISTS registered_via TEXT DEFAULT 'form';

-- 비회원 INSERT 허용 RLS 정책
DROP POLICY IF EXISTS "Anyone can insert talents" ON talents;
CREATE POLICY "Anyone can insert talents"
  ON talents FOR INSERT
  WITH CHECK (true);

-- temp_identifier 인덱스 (비회원 중복 체크용)
CREATE INDEX IF NOT EXISTS idx_talents_temp_identifier ON talents(temp_identifier);
```

#### Landing.tsx 수정
```typescript
async function handleCompleteRegistration() {
  try {
    const talentData = transformLandingToTalent(userInput);
    const tempId = hashPhone(userInput.phone);

    // Supabase INSERT
    const { data, error } = await supabase
      .from('talents')
      .insert({
        ...talentData,
        temp_identifier: tempId,
        is_guest_registered: true,
        registered_via: 'landing',
      })
      .select()
      .single();

    if (error) throw error;

    // LocalStorage 저장 (메인페이지 하이라이트용)
    localStorage.setItem('recently_registered_talent', JSON.stringify({
      id: data.id,
      registered_at: new Date().toISOString(),
    }));

    setStep('done');
  } catch (error) {
    console.error('등록 실패:', error);
    alert('등록 중 오류가 발생했습니다. 다시 시도해주세요.');
  }
}
```

---

### Phase 5: 메인페이지 하이라이트

#### App.tsx 수정
```typescript
useEffect(() => {
  const recentRegistration = localStorage.getItem('recently_registered_talent');

  if (recentRegistration) {
    const { id, registered_at } = JSON.parse(recentRegistration);
    const registeredTime = new Date(registered_at).getTime();
    const now = Date.now();

    // 10분 이내 등록이면 하이라이트
    if (now - registeredTime < 10 * 60 * 1000) {
      setHighlightTalentId(id);
      setActiveTab('talents');  // 인력카드 토글 자동 ON

      // 5초 후 하이라이트 제거
      setTimeout(() => {
        setHighlightTalentId(null);
        localStorage.removeItem('recently_registered_talent');
      }, 5000);
    }
  }
}, []);
```

#### TalentCard.tsx 수정
```tsx
<div
  className={cn(
    "border rounded-lg p-4 hover:shadow-lg transition",
    isHighlight && "ring-4 ring-talent-primary ring-opacity-50 animate-pulse"
  )}
>
  {/* 카드 내용 */}
</div>
```

---

## 데이터 흐름 설계

```
랜딩페이지 (Landing.tsx)
    ↓
사용자 입력 수집 (19단계)
    ↓
데이터 변환 (transformLandingToTalent)
    ↓
인력카드 미리보기 (TalentCard 컴포넌트)
    ↓
"등록 완료하기" 클릭
    ↓
Supabase INSERT (talents 테이블)
    ├─ temp_identifier: hashPhone(phone)
    ├─ is_guest_registered: true
    └─ registered_via: 'landing'
    ↓
LocalStorage 저장 (하이라이트용)
    ↓
메인페이지 이동
    ↓
인력카드 토글 자동 ON + 하이라이트 ⭐
```

---

## 파일 수정 목록

### 신규 생성
1. ✅ `scripts/db/verify-seongnam-locations.ts` - 성남 크롤링 검증
2. ✅ `scripts/db/verify-namyangju-crawl.ts` - 구리남양주 크롤링 검증
3. ✅ `scripts/db/analyze-misung-cards.ts` - "미상" 카드 원인 분석
4. ✅ `scripts/db/verify-crawl-boards.ts` - 전체 게시판 정밀 진단
5. 🆕 `src/lib/utils/landingTransform.ts` - 데이터 변환 유틸리티
6. 🆕 `supabase/migrations/20250211_landing_talent_registration.sql` - 비회원 등록 DB 스키마

### 수정 필요
1. ✅ `.github/workflows/run-crawler.yml` - 구리남양주 source 수정 완료
2. 🆕 `src/pages/Landing.tsx` - 19단계 확장 + 미리보기 추가
3. 🆕 `src/components/cards/TalentCard.tsx` - 하이라이트 효과 추가
4. 🆕 `src/App.tsx` - 하이라이트 로직 추가

---

## 구현 우선순위

### Priority 1 (핵심 기능)
1. ✅ 크롤링 시스템 문제 해결 (완료)
2. 🟡 `landingTransform.ts` 유틸리티 작성
3. 🟡 랜딩페이지 19단계 확장
4. 🟡 인력카드 미리보기 구현 ⭐⭐⭐
5. 🟡 비회원 등록 DB 마이그레이션

### Priority 2 (부가 기능)
6. 🟡 메인페이지 하이라이트
7. 🟡 교사 분기 처리 메시지 수정
8. 🟡 LocalStorage 연동

### Priority 3 (추후 고도화)
9. ⚪ 회원가입 시 비회원 데이터 자동 연결
10. ⚪ 전화번호 해싱 강화 (bcrypt)
11. ⚪ 인력카드 수정 기능
12. ⚪ 중복 등록 방지 로직

---

## 기술 스택

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **State Management**: Zustand
- **Database**: Supabase (PostgreSQL + RLS)
- **Authentication**: Supabase Auth
- **Deployment**: Cloudflare Pages

---

## 참고 문서

- `CLAUDE.md` - 프로젝트 전체 구조
- `BACKEND_STRUCTURE.md` - 백엔드 아키텍처
- `FRONTEND_STRUCTURE.md` - 프론트엔드 구조
- `COLOR_STRUCTURE.md` - 컬러 시스템
- `.github/workflows/run-crawler.yml` - 크롤링 자동화

---

## 변경 이력

### 2025-11-05
- ✅ 성남/구리남양주 크롤링 실행 및 location 필드 검증 완료
- ✅ "미상" 카드 원인 분석 (예전 데이터 vs 현재 문제 구분)
- ✅ 구리남양주 크롤러 source 수정 (`namyangju` → `ai-generated`)
- ✅ 자동 크롤링 스케줄 검증 (5개 게시판 동기화 확인)
- 🟡 랜딩페이지-인력카드 연동 시스템 설계 완료
- 📝 본 문서 작성

---

## Next Steps

1. `landingTransform.ts` 유틸리티 구현
2. 랜딩페이지 Step 15~19 추가
3. 인력카드 미리보기 렌더링 테스트
4. DB 마이그레이션 실행
5. 통합 테스트 및 배포

---

**문서 작성자**: Claude Code
**최종 업데이트**: 2025-11-05

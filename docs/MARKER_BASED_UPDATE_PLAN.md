ㅌ1

> **작성일**: 2026-01-12  
> **버전**: v1.0  
> **상태**: 기획 확정 → 구현 대기

---

## 📋 목차

1. [개요](#1-개요)
2. [핵심 콘셉트](#2-핵심-콘셉트)
3. [마커 유형별 상세 스펙](#3-마커-유형별-상세-스펙)
4. [사용자 여정 시나리오](#4-사용자-여정-시나리오)
5. [UI/UX 설계 방향](#5-uiux-설계-방향)
6. [데이터베이스 스키마](#6-데이터베이스-스키마)
7. [프로그램 카테고리 분류](#7-프로그램-카테고리-분류)
8. [코멘트/후기 시스템](#8-코멘트후기-시스템)
9. [구현 우선순위 및 로드맵](#9-구현-우선순위-및-로드맵)
10. [확정된 결정사항](#10-확정된-결정사항)

---

## 1. 개요

### 1.1 프로젝트 목표

**"사용자 주체적 참여형 교육 인재 마켓플레이스"**

현재 셀미바이미는 공고 검색/조회 위주의 서비스이나, 이를 **사용자가 직접 마커를 찍어 지도를 활용하는 양방향 플랫폼**으로 확장한다.

### 1.2 핵심 가치

- **진입장벽 최소화**: 인증 없이 누구나 마커 등록 가능
- **사용자 풀 확보**: 최대한 많은 사용자가 마커를 생성하도록 유도
- **직접 연락 방식**: 매칭 로직/알림 없이 공개된 연락처로 직접 소통
- **커뮤니티 기반 신뢰**: 코멘트/후기를 통한 자연스러운 평판 형성

---

## 2. 핵심 콘셉트

### 2.1 3가지 마커 레이어

```
[지도 레이어 - 토글 ON/OFF 가능]
├── 🔵 Layer 1: 학교 공고 마커 (기존 job_postings 기반)
├── 🟢 Layer 2: 구직 교사 마커 (신규 - teacher_markers)
└── 🟡 Layer 3: 프로그램/강의 마커 (신규 - program_markers)
```

### 2.2 마커별 역할

| 마커 유형 | 등록 주체 | 목적 | 핵심 정보 |
|-----------|-----------|------|-----------|
| 🔵 학교 공고 | 크롤링 / 학교 담당자 | 교사 채용 | 공고 내용, 연락처 |
| 🟢 구직 교사 | 기간제/시간강사 | "저를 써주세요" | 이메일, 과목, 경력 |
| 🟡 프로그램 | 강사/전문가 | 프로그램 판매 | 프로그램명, 가격, 설명 |

---

## 3. 마커 유형별 상세 스펙

### 3.1 구직 교사 마커 (Teacher Marker) 🟢

#### 등록 조건
- **로그인 필수**
- **인증 불필요** (교원자격증 등 검증 없음)
- **마커 개수 무제한** (여러 지역에 찍기 가능)

#### 위치 지정 방식
- **지도에서 직접 클릭**으로 위치 지정
- 정확한 주소가 아닌 "활동 희망 지역" 개념

#### 필수 입력 정보

| 필드 | 타입 | 설명 |
|------|------|------|
| `nickname` | string | 익명 닉네임 (시스템 생성 or 직접 입력) |
| `email` | string | 연락용 이메일 (필수) |

#### 선택 입력 정보 (체크리스트 형태)

| 필드 | 타입 | 옵션 |
|------|------|------|
| `subjects` | string[] | 과목 선택 (국어, 수학, 영어, 과학, 사회, 음악, 미술, 체육, 정보, 기타) |
| `other_subject`| string | 기타 과목 직접 입력 (기타 선택 시 활성화) |
| `school_levels` | string[] | 학교급 선택 (유치원, 초등, 중등, 고등, 특수) |
| `experience_years` | string | 경력 (신입, 1~3년, 3~5년, 5~10년, 10년 이상) |
| `introduction` | string | 자기소개 (간단한 텍스트, 500자 이내) |
| `profile_image` | file/url | 프로필 혹은 관련 이미지 업로드 지원 |

#### 닉네임 생성 시스템

**시스템 자동 생성 예시** (카카오 오픈채팅 스타일):
```
형용사 + 캐릭터명 조합
- "땀 흘리는 셀리"
- "반짝이는 코리"
- "졸린 타이디"
- "용감한 프롱"
- "따뜻한 하이"
- "차분한 라니아"
- "활기찬 호크"
```

**형용사 풀**: 반짝이는, 졸린, 신나는, 수줍은, 용감한, 따뜻한, 시원한, 달콤한, 새콤한, 포근한, 활기찬, 차분한...

**캐릭터 풀**: 셀리, 코리, 타이디, 프롱, 하이, 라니아, 호크 (확장된 캐릭터 라인업)

**직접 입력**: 사용자가 원하면 닉네임 직접 입력 가능

---

### 3.2 프로그램/강의 마커 (Program Marker) 🟡

#### 등록 조건
- **로그인 필수**
- **마커 개수 무제한** (여러 지역에 등록 가능)
- **위치 제한 없음** (원하는 곳 어디든 찍기)

#### 위치 지정 방식
- **지도에서 직접 클릭**
- 출강 가능한 지역마다 별도 마커 가능

#### 필수 입력 정보

| 필드 | 타입 | 설명 |
|------|------|------|
| `program_title` | string | 프로그램명 (예: "AI 코딩 체험 수업") |
| `target_grades` | string[] | 대상 학년/학교급 선택 |
| `contact_email` | string | 연락처 (이메일) |
| `description` | string | 상세 설명 (2000자 이내) |

#### 선택 입력 정보

| 필드 | 타입 | 설명 |
|------|------|------|
| `contact_phone` | string | 연락처 (전화번호) |
| `categories` | string[] | 고정 카테고리 선택 (복수 가능) |
| `custom_tags` | string[] | 자유 태그 추가 |
| `price_info` | string | 가격 정보 (자유 형식: "협의", "회당 20만원" 등) |
| `portfolio_url` | string | 포트폴리오 링크 |
| `image_files` | file[] | 프로그램 관련 이미지 업로드 (최대 5장 지원) |

---

### 3.3 학교 공고 마커 (Job Posting Marker) 🔵

#### 현재 상태
- 기존 `job_postings` 테이블 기반
- 크롤러로 수집된 공고 + 사용자 직접 등록 공고

#### 변경 사항
- 기존 데이터에 **좌표(latitude, longitude)** 필드 추가
- 학교명 기반 지오코딩으로 좌표 자동 생성

---

## 4. 사용자 여정 시나리오

### 4.1 기간제 교사(구직자)의 마커 등록

```
1. 사이트 방문 → 지도에서 원하는 지역 공고 탐색
2. 지도 우측 하단(로그인 버튼 아래) 플로팅 버튼 중 "구직 마커 등록" 클릭
3. 로그인 완료 → 마커 등록 플로우 진입
4. 지도에서 원하는 위치 직접 클릭 → 위치 지정
5. 닉네임 선택 및 이미지 업로드 (이미지 지원)
6. 이메일 입력 + 선택 정보 체크 (기타 과목 입력 가능)
7. 등록 완료 → 지도에 초록색 마커 표시
8. (이후) 학교 담당자가 마커 발견 → 이메일로 연락
```

### 4.2 학교 담당자의 교사 탐색

```
1. 사이트 방문 → "구직 교사" 레이어 켜기
2. (선택) 과목/학교급 필터링
3. 원하는 지역 확대 → 초록색 마커들 확인
4. 마커 클릭 → 정보 확인 (과목, 경력, 자기소개)
5. 마음에 드는 교사 → 공개된 이메일로 직접 연락
```

### 4.3 강사의 프로그램 등록

```
1. 사이트 방문 → 로그인 → "프로그램 등록"
2. 지도에서 출강 가능한 지역 클릭 → 위치 지정
3. 프로그램 정보 입력 (제목, 대상, 설명, 연락처)
4. 카테고리 선택 + 자유 태그 추가
5. 등록 완료 → 지도에 노란색 마커 표시
6. (이후) 학교 담당자가 발견 → 연락
```

### 4.4 코멘트/후기 작성

```
1. 마커 클릭 → 상세 정보 확인
2. "후기 남기기" 버튼 클릭
3. 코멘트 작성 (로그인 불필요)
4. 작성 완료 → 해당 마커에 코멘트 표시
```

---

## 5. UI/UX 설계 방향 (절대 규칙 적용)

### 🚨 **핵심 절대 규칙: Anti-Vibe Design**
이 부분의 프론트엔드를 디자인하고 구현할 때는 **"바이브 코딩"**의 저렴한 느낌이 나지 않도록 해야 한다.
- 다음 경로의 지침을 반드시 준수할 것: `C:\PRODUCT\SEL HUB\.claude\skills\anti-vibe-design\skill.md`
- **핵심 원칙**: 프리미엄 에스테틱, 정교한 마이크로 애니메이션, 일관된 타이포그래피, 세련된 컬러 팔레트 사용.

### 5.1 진입점 (Entry Point)

지도 우측의 시각적인 로그인/회원가입 버튼(Floating 스타일) 하단에 마커 등록 관련 버튼들을 배치한다.

```
[지도 화면]
                   [ 로그인 ]
                   [ 회원가입 ]
                   ──────────
                   [ 🟢 구직 등록 ]  ← Floating Buttons
                   [ 🟡 강의 등록 ]
```

- **디자인**: 단순히 떠 있는 버튼이 아니라, 지도의 미관을 해치지 않으면서도 세련된 글래스모피즘(Glassmorphism) 효과 적용.
- **인터랙션**: 호버 시 부드러운 확대 및 그림자 효과.

### 5.2 마커 디자인

- **색상 구분**: 
  - 학교 공고: Blue 기반
  - 구직 교사: Red 기반
  - 프로그램: Green 기반
- **아이콘**: 별도의 아이콘 대신 **색상과 점(Dot)의 크기 또는 테두리 두께** 등으로 세련되게 구분. 아이콘이 난잡하게 섞이는 것을 방지.

### 5.3 마커 클릭 시 팝업

**구직 교사 마커 팝업:**
```
┌─────────────────────────────────────┐
│ 🟢 반짝이는 셀리                    │
├─────────────────────────────────────┤
│ 과목: 수학, 과학                    │
│ 학교급: 중등, 고등                  │
│ 경력: 3~5년                         │
├─────────────────────────────────────┤
│ "열정적으로 수업하는 선생님입니다"  │
├─────────────────────────────────────┤
│ 📧 example@email.com                │
│ [후기 보기] [후기 남기기]           │
└─────────────────────────────────────┘
```

**프로그램 마커 팝업:**
```
┌─────────────────────────────────────┐
│ 🟡 AI 코딩 체험 수업 (2차시)        │
├─────────────────────────────────────┤
│ 대상: 초5-6, 중등 전학년            │
│ 카테고리: 코딩교육, 진로체험        │
│ 가격: 회당 20만원 (협의 가능)       │
├─────────────────────────────────────┤
│ 상세 설명...                        │
├─────────────────────────────────────┤
│ 📧 instructor@email.com             │
│ [후기 보기] [후기 남기기]           │
└─────────────────────────────────────┘
```

### 5.4 마커 등록 플로우

```
┌─────────────────────────────────────┐
│ 마커 등록하기                       │
├─────────────────────────────────────┤
│ 1️⃣ 지도에서 위치를 클릭하세요       │
│    [지도 영역 - 클릭 가능]          │
├─────────────────────────────────────┤
│ 2️⃣ 닉네임                          │
│    ○ 자동 생성: "반짝이는 셀리" 🔄  │
│    ○ 직접 입력: [________]          │
├─────────────────────────────────────┤
│ 3️⃣ 이메일 (필수)                   │
│    [________________]               │
├─────────────────────────────────────┤
│ 4️⃣ 추가 정보 (선택)                │
│    과목: □국어 □수학 □영어 □과학... │
│    학교급: □초등 □중등 □고등...     │
│    경력: [선택 ▼]                   │
│    자기소개: [________________]     │
├─────────────────────────────────────┤
│ [등록하기]                          │
└─────────────────────────────────────┘
```

### 5.5 내 마커 관리 (마이페이지)

```
┌─────────────────────────────────────┐
│ 내 마커 관리                        │
├─────────────────────────────────────┤
│ 🟢 구직 마커 (3개)                  │
│   - 강남구 (반짝이는 셀리) [수정][삭제] │
│   - 성남시 (반짝이는 셀리) [수정][삭제] │
│   - 용인시 (반짝이는 셀리) [수정][삭제] │
├─────────────────────────────────────┤
│ 🟡 프로그램 마커 (1개)              │
│   - AI 코딩 수업 [수정][삭제]       │
└─────────────────────────────────────┘
```

---

## 6. 데이터베이스 스키마

### 6.1 teacher_markers (구직 교사 마커)

```sql
CREATE TABLE teacher_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 위치 정보
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- 필수 정보
  nickname VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,
  
  -- 선택 정보
  subjects TEXT[], -- ['수학', '과학']
  school_levels TEXT[], -- ['중등', '고등']
  experience_years VARCHAR(20), -- '3~5년'
  introduction TEXT,
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_teacher_markers_location ON teacher_markers(latitude, longitude);
CREATE INDEX idx_teacher_markers_user ON teacher_markers(user_id);
CREATE INDEX idx_teacher_markers_subjects ON teacher_markers USING GIN(subjects);
```

### 6.2 program_markers (프로그램 마커)

```sql
CREATE TABLE program_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 위치 정보
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- 필수 정보
  program_title VARCHAR(200) NOT NULL,
  target_grades TEXT[] NOT NULL, -- ['초5-6', '중등']
  contact_email VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- 선택 정보
  contact_phone VARCHAR(20),
  categories TEXT[], -- 고정 카테고리
  custom_tags TEXT[], -- 자유 태그
  price_info VARCHAR(100),
  portfolio_url TEXT,
  image_urls TEXT[],
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_program_markers_location ON program_markers(latitude, longitude);
CREATE INDEX idx_program_markers_user ON program_markers(user_id);
CREATE INDEX idx_program_markers_categories ON program_markers USING GIN(categories);
```

### 6.3 marker_comments (마커 코멘트/후기)

```sql
CREATE TABLE marker_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 대상 마커 (다형성)
  marker_type VARCHAR(20) NOT NULL, -- 'teacher' | 'program'
  marker_id UUID NOT NULL,
  
  -- 작성자 (로그인 불필요하므로 nullable)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(50), -- 비로그인 시 입력
  
  -- 코멘트 내용
  content TEXT NOT NULL,
  
  -- 메타 정보
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_marker_comments_target ON marker_comments(marker_type, marker_id);
```

### 6.4 job_postings 확장 (기존 테이블)

```sql
-- 기존 job_postings 테이블에 좌표 필드 추가
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_job_postings_location 
ON job_postings(latitude, longitude);
```

---

## 7. 프로그램 카테고리 분류

### 7.1 고정 카테고리 (검색 결과 기반)

웹 검색을 통해 확인된 학교 외부 강사 프로그램의 주요 카테고리:

#### 체험학습 분야
| 카테고리 | 설명 | 예시 |
|----------|------|------|
| `진로체험` | 직업 탐색, 진로 교육 | 직업인 특강, 진로 탐색 |
| `과학체험` | 과학 실험, STEM 교육 | 과학 실험 교실, 로봇 체험 |
| `코딩교육` | 프로그래밍, SW 교육 | 블록코딩, 앱 개발 |
| `공예체험` | 만들기, 생활공예 | 도예, 목공, 가죽공예 |
| `요리체험` | 음식 만들기, 식문화 | 제과제빵, 전통음식 |
| `생태환경` | 자연 탐구, 환경 교육 | 숲체험, 환경보호 |
| `역사문화` | 역사 교육, 전통문화 | 역사 체험, 전통놀이 |

#### 예체능 분야
| 카테고리 | 설명 | 예시 |
|----------|------|------|
| `음악` | 악기, 합창, 음악 이론 | 우쿨렐레, 밴드, 합창 |
| `미술` | 그리기, 조형, 디자인 | 회화, 일러스트, 캘리 |
| `체육/스포츠` | 스포츠, 신체 활동 | 뉴스포츠, 협동 체육 |
| `무용/댄스` | 춤, 동작 표현 | K-POP 댄스, 창작 무용 |
| `연극/공연` | 연기, 공연 예술 | 뮤지컬, 마술쇼 |

#### 교육 분야
| 카테고리 | 설명 | 예시 |
|----------|------|------|
| `독서/논술` | 읽기, 글쓰기 | 독서 토론, 글쓰기 |
| `외국어` | 언어 교육 | 영어회화, 중국어 |
| `심리/상담` | 심리 교육, 상담 | 집단상담, 마음챙김 |
| `안전교육` | 안전, 생존 교육 | 심폐소생술, 재난 안전 |
| `미디어/영상` | 미디어 리터러시 | 영상 제작, 1인 미디어 |

### 7.2 자유 태그

고정 카테고리 외에 사용자가 자유롭게 태그 추가 가능:
- 예: `#늘봄학교`, `#AI활용`, `#체험키트포함`, `#비대면가능`

---

## 8. 코멘트/후기 시스템

### 8.1 핵심 원칙

- **로그인 불필요**: 누구나 코멘트 작성 가능
- **텍스트 기반**: 별점 없이 텍스트만
- **최소 관리**: 악성 코멘트는 관리자가 수동 삭제

### 8.2 코멘트 작성 플로우

```
1. 마커 클릭 → "후기 남기기" 버튼
2. 작성자 이름 입력 (선택, 미입력 시 "익명")
3. 코멘트 내용 작성
4. 작성 완료 → 해당 마커에 표시
```

### 8.3 코멘트 표시

```
┌─────────────────────────────────────┐
│ 후기 (3개)                          │
├─────────────────────────────────────┤
│ 홍길동 | 2026.01.10                 │
│ "수업이 알차고 학생들이 좋아했어요" │
├─────────────────────────────────────┤
│ 익명 | 2026.01.08                   │
│ "시간 약속을 잘 지켜주셨습니다"     │
└─────────────────────────────────────┘
```

### 8.4 코멘트 대상

| 마커 유형 | 코멘트 가능 여부 |
|-----------|------------------|
| 🟢 구직 교사 | ✅ 가능 |
| 🟡 프로그램 | ✅ 가능 |
| 🔵 학교 공고 | ❌ 불필요 (단기 공고) |

---

## 9. 구현 우선순위 및 로드맵

### Phase 1: 기반 구축 (1주)

```
□ 데이터베이스 스키마 생성
  - teacher_markers 테이블
  - program_markers 테이블
  - marker_comments 테이블
  - job_postings 좌표 필드 추가

□ 기존 공고 좌표 생성
  - 학교명 → Kakao 지오코딩 → 좌표 저장
  - 배치 스크립트 작성
```

### Phase 2: 구직 교사 마커 (1주)

```
□ 마커 등록 UI
  - 지도에서 위치 클릭
  - 닉네임 생성 시스템
  - 등록 폼 (이메일 + 선택 정보)

□ 마커 표시 UI
  - 지도에 초록색 마커 표시
  - 클릭 시 팝업 (정보 + 연락처)

□ 필터링
  - 과목, 학교급 필터

□ 내 마커 관리
  - 마이페이지에서 수정/삭제
```

### Phase 3: 프로그램 마커 (1주)

```
□ 마커 등록 UI
  - 지도에서 위치 클릭
  - 등록 폼 (제목, 대상, 설명, 연락처)
  - 카테고리 선택 + 자유 태그

□ 마커 표시 UI
  - 지도에 노란색 마커 표시
  - 클릭 시 팝업 (상세 정보)

□ 필터링
  - 카테고리 필터
```

### Phase 4: 코멘트 시스템 (0.5주)

```
□ 코멘트 작성 UI
  - 비로그인 허용
  - 작성자 이름 (선택)

□ 코멘트 표시
  - 마커 팝업에 후기 목록

□ 관리자 삭제 기능
```

### Phase 5: 통합 및 최적화 (0.5주)

```
□ 레이어 토글 UI
□ 전체 필터 통합
□ 모바일 최적화
□ 성능 테스트
```

---

## 10. 확정된 결정사항

### ✅ 구현하는 것

| 항목 | 결정 |
|------|------|
| 마커 레이어 | 3종 (학교공고, 구직교사, 프로그램) |
| 레이어 토글 | ON/OFF 가능 |
| 위치 지정 | 지도에서 직접 클릭 |
| 마커 개수 | 무제한 |
| 인증 | 불필요 (진입장벽 최소화) |
| 연락 방식 | 공개된 연락처로 직접 연락 |
| 닉네임 | 시스템 자동 생성 or 직접 입력 |
| 코멘트 | 로그인 없이 작성 가능 |
| 카테고리 | 고정 카테고리 + 자유 태그 |

### ❌ 구현하지 않는 것

| 항목 | 이유 |
|------|------|
| 1:1 채팅 | 구현 복잡도 대비 효과 낮음 |
| 매칭 알고리즘 | 단순 정보 노출 방식 선호 |
| 알림 시스템 | 비용 대비 효과 낮음 |
| 결제/수수료 | 현재 단계에서 불필요 |
| 교원 인증 | 사용자 풀 확보 우선 |
| 마커 유효기간 | 사용자 직접 관리 |
| 클러스터링 | 아직 고민할 단계 아님 |
| 프리미엄 기능 | 현재 불필요 |

---

## 부록: TypeScript 타입 정의 (예정)

```typescript
// src/types/markers.ts

export interface TeacherMarker {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  nickname: string;
  email: string;
  subjects?: string[];
  school_levels?: string[];
  experience_years?: string;
  introduction?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProgramMarker {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  program_title: string;
  target_grades: string[];
  contact_email: string;
  description: string;
  contact_phone?: string;
  categories?: string[];
  custom_tags?: string[];
  price_info?: string;
  portfolio_url?: string;
  image_urls?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MarkerComment {
  id: string;
  marker_type: 'teacher' | 'program';
  marker_id: string;
  user_id?: string;
  author_name?: string;
  content: string;
  is_visible: boolean;
  created_at: string;
}

export type MarkerLayer = 'job' | 'teacher' | 'program';

export interface MarkerFilters {
  layers: MarkerLayer[];
  subjects?: string[];
  schoolLevels?: string[];
  categories?: string[];
}
```

---

> **다음 단계**: Phase 1 데이터베이스 스키마 생성부터 시작

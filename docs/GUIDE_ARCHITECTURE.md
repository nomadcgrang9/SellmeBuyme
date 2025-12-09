# 🔧 SellmeBuyme 아키텍처 가이드

> 프론트엔드-백엔드 연결 구조와 API/DB 흐름을 이해하기 위한 문서입니다.

---

## 🏗 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         사용자 (브라우저)                             │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      프론트엔드 (React + Vite)                       │
│                      배포: Cloudflare Pages                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            ┌────────────┐  ┌────────────┐  ┌────────────┐
            │ Supabase   │  │   Edge     │  │  Realtime  │
            │ Database   │  │ Functions  │  │ (WebSocket)│
            │ PostgreSQL │  │   (Deno)   │  │            │
            └────────────┘  └────────────┘  └────────────┘
                                    │
                                    ▼
                            ┌────────────┐
                            │  Crawler   │
                            │ (Node.js)  │
                            └────────────┘
```

---

## 📊 기술 스택

### 프론트엔드
| 기술 | 버전 | 용도 |
|------|-----|------|
| React | 18 | UI 라이브러리 |
| TypeScript | 5.4 | 타입 안전성 |
| Vite | 5 | 빌드 도구 |
| Tailwind CSS | 3.4 | 스타일링 |
| Zustand | 4.5 | 상태 관리 |
| React Hook Form | - | 폼 관리 |
| Zod | - | 폼 검증 |

<details>
<summary>🎓 쉬운 설명 (클릭해서 펼치기)</summary>

| 기술 | 쉬운 설명 |
|------|----------|
| **React** | 레고 블록 같은 것. 버튼, 카드, 메뉴 같은 작은 조각들을 조립해서 웹페이지를 만듦 |
| **TypeScript** | 맞춤법 검사기. 코드에 실수가 있으면 미리 알려줘서 버그를 예방함 |
| **Vite** | 요리사의 가스레인지. 코드를 빠르게 "조리"해서 브라우저가 이해할 수 있는 형태로 바꿔줌 |
| **Tailwind CSS** | 스타일 스티커북. `bg-blue-500` 같은 스티커를 붙이면 바로 파란 배경이 됨 |
| **Zustand** | 공용 메모장. 여러 화면에서 같은 정보(로그인 상태, 검색어 등)를 공유할 때 사용 |
| **React Hook Form** | 설문지 자동화 도구. 이름, 이메일 등 입력칸을 자동으로 관리해줌 |
| **Zod** | 입력 검사관. "이메일 형식이 맞나?", "비밀번호가 8자 이상인가?" 체크 |

</details>

### 백엔드
| 기술 | 용도 |
|------|------|
| Supabase | BaaS (Backend as a Service) |
| PostgreSQL | 데이터베이스 |
| Supabase Auth | 인증 (Google OAuth) |
| Supabase Realtime | 실시간 통신 |
| Edge Functions (Deno) | 서버리스 함수 |

<details>
<summary>🎓 쉬운 설명 (클릭해서 펼치기)</summary>

| 기술 | 쉬운 설명 |
|------|----------|
| **Supabase** | "백엔드 올인원 패키지". 데이터 저장, 로그인, 실시간 기능을 한 번에 제공. 직접 서버를 만들 필요 없이 바로 사용 가능 |
| **PostgreSQL** | 거대한 엑셀 파일 같은 데이터베이스. 일자리 공고, 회원 정보 등 모든 데이터를 저장하는 창고 |
| **Supabase Auth** | 로그인 담당 경비원. "구글로 로그인" 버튼을 누르면 이 경비원이 구글과 대화해서 신원 확인 후 통과시켜줌 |
| **Supabase Realtime** | 카카오톡처럼 실시간 알림. 누가 채팅을 보내면 새로고침 없이 바로 메시지가 뜸 |
| **Edge Functions** | 로봇 비서. "AI 추천 만들어줘", "파일 다운로드해줘" 같은 복잡한 요청을 처리하는 자동화 도우미 |

</details>

### 크롤러
| 기술 | 용도 |
|------|------|
| Node.js | 런타임 |
| Playwright | 브라우저 자동화 |
| Gemini Vision API | AI 데이터 추출 |

<details>
<summary>🎓 쉬운 설명 (클릭해서 펼치기)</summary>

| 기술 | 쉬운 설명 |
|------|----------|
| **Node.js** | 자바스크립트를 웹브라우저 밖에서도 실행할 수 있게 해주는 엔진. 크롤러 프로그램을 돌리는 "동력원" |
| **Playwright** | 로봇 브라우저. 사람처럼 웹사이트에 접속해서 클릭하고, 스크롤하고, 정보를 읽어옴. 자동으로 여러 학교 사이트를 돌아다니며 채용공고를 수집 |
| **Gemini Vision API** | 구글의 AI 눈. 스크린샷을 찍어서 보여주면 "이건 채용공고고, 마감일은 12월 15일이고..." 하고 알아서 정보를 뽑아냄 |

**크롤러가 하는 일 (비유):**
> 마치 신문 스크랩하는 아르바이트생처럼, 매일 여러 교육청 홈페이지를 돌아다니면서
> 새로운 채용공고가 있으면 사진 찍고(스크린샷) → AI한테 "이거 뭐야?" 물어보고(Gemini) → 정리해서 우리 DB에 저장

</details>

### 배포
| 서비스 | 용도 |
|--------|------|
| Cloudflare Pages | 프론트엔드 호스팅 |
| Supabase Cloud | 백엔드 호스팅 |
| GitHub Actions | CI/CD (예정) |

<details>
<summary>🎓 쉬운 설명 (클릭해서 펼치기)</summary>

| 서비스 | 쉬운 설명 |
|--------|----------|
| **Cloudflare Pages** | 웹사이트 주차장. 우리가 만든 웹페이지를 전 세계 어디서든 빠르게 볼 수 있도록 보관하고 배달해주는 곳 |
| **Supabase Cloud** | 데이터 금고. 회원 정보, 일자리 공고 등 중요한 데이터를 안전하게 보관하는 클라우드 서비스 |
| **GitHub Actions** | 자동 배달부 (예정). 코드를 수정하면 자동으로 "테스트 → 빌드 → 배포"까지 해주는 로봇 |

**배포 과정 (비유):**
> 1. 개발자가 코드 수정 완료
> 2. GitHub에 올리면 (git push)
> 3. Cloudflare가 자동으로 새 버전 웹사이트를 세상에 공개
> 4. 사용자는 sellmebuyme.com 접속하면 새 버전을 봄

**왜 Cloudflare를 쓰나요?**
> - 무료 + 빠름 (전 세계에 서버가 있어서 어디서든 빠르게 로딩)
> - HTTPS 자동 제공 (보안 연결)
> - GitHub 연동으로 자동 배포

</details>

---

## 🗄 데이터베이스 스키마

### 핵심 테이블 (14개)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ═══════════════════════════════ 핵심 데이터 ═══════════════════════════════│
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐         │
│  │  job_postings   │     │     talents     │     │  experiences  │         │
│  │  (일자리 공고)   │     │   (인력/강사)    │     │    (체험)     │         │
│  ├─────────────────┤     ├─────────────────┤     ├───────────────┤         │
│  │ id (PK)         │     │ id (PK)         │     │ id (PK)       │         │
│  │ title           │     │ name            │     │ title         │         │
│  │ organization    │     │ specialty       │     │ description   │         │
│  │ location        │     │ location[]      │     │ location      │         │
│  │ compensation    │     │ experience_years│     │ target_levels │         │
│  │ deadline        │     │ rating          │     │ operation_type│         │
│  │ tags[]          │     │ license         │     │ created_by    │         │
│  │ school_level    │     │ is_verified     │     │ created_at    │         │
│  │ subject         │     │ created_by      │     └───────────────┘         │
│  │ is_urgent       │     │ created_at      │                               │
│  │ structured_content│   └─────────────────┘                               │
│  │ source_url      │                                                       │
│  │ created_by      │     ┌─────────────────┐                               │
│  │ created_at      │     │  user_profiles  │                               │
│  └─────────────────┘     │ (사용자 프로필)  │                               │
│                          ├─────────────────┤                               │
│  ┌─────────────────┐     │ user_id (PK,FK) │                               │
│  │recommendations_ │     │ display_name    │                               │
│  │     cache       │     │ roles[]         │                               │
│  │  (AI 추천 캐시)  │     │ interest_regions│                               │
│  ├─────────────────┤     │ experience_years│                               │
│  │ user_id (PK,FK) │     │ teacher_level   │                               │
│  │ cards (JSONB)   │◄────│ capable_subjects│                               │
│  │ ai_comment      │     │ instructor_fields                               │
│  │ profile_snapshot│     │ intro           │                               │
│  │ generated_at    │     │ created_at      │                               │
│  │ updated_at      │     └─────────────────┘                               │
│  └─────────────────┘                                                       │
│                                                                             │
│  ═══════════════════════════ 사용자 활동/시스템 ═══════════════════════════ │
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │    bookmarks    │     │   chat_rooms    │     │  chat_messages  │       │
│  │    (북마크)      │     │   (채팅방)       │     │   (채팅 메시지)  │       │
│  ├─────────────────┤     ├─────────────────┤     ├─────────────────┤       │
│  │ id (PK)         │     │ id (PK)         │     │ id (PK)         │       │
│  │ user_id (FK)    │     │ created_at      │────▶│ room_id (FK)    │       │
│  │ card_id         │     │ updated_at      │     │ sender_id (FK)  │       │
│  │ card_type       │     └─────────────────┘     │ content         │       │
│  │ created_at      │                             │ created_at      │       │
│  └─────────────────┘                             └─────────────────┘       │
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │   search_logs   │     │   error_logs    │                               │
│  │   (검색 로그)    │     │   (에러 로그)    │                               │
│  ├─────────────────┤     ├─────────────────┤                               │
│  │ id (PK)         │     │ id (PK)         │                               │
│  │ user_id (FK)    │     │ error_type      │                               │
│  │ query           │     │ error_message   │                               │
│  │ filters         │     │ stack_trace     │                               │
│  │ result_count    │     │ user_agent      │                               │
│  │ clicked_result_id     │ created_at      │                               │
│  │ created_at      │     └─────────────────┘                               │
│  └─────────────────┘                                                       │
│                                                                             │
│  ════════════════════════════ 크롤러/개발 관리 ════════════════════════════ │
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────────┐     ┌─────────────────┐   │
│  │  crawl_boards   │     │dev_board_submissions│     │  crawl_logs     │   │
│  │ (크롤러 설정)    │     │ (보드 제출)          │     │ (크롤 로그)      │   │
│  ├─────────────────┤     ├─────────────────────┤     ├─────────────────┤   │
│  │ id (PK)         │     │ id (PK)             │     │ id (PK)         │   │
│  │ name            │     │ board_url           │     │ board_id (FK)   │   │
│  │ board_url       │     │ board_name          │     │ status          │   │
│  │ is_active       │     │ crawler_code        │     │ items_found     │   │
│  │ status          │     │ submitted_by        │     │ items_new       │   │
│  │ crawl_batch_size│     │ is_approved         │     │ started_at      │   │
│  │ last_crawled_at │     │ is_local_government │     │ completed_at    │   │
│  │ region_code     │     │ region              │     │ error_log       │   │
│  │ school_level    │     │ created_at          │     │ created_at      │   │
│  │ approved_at     │     └─────────────────────┘     └─────────────────┘   │
│  └─────────────────┘                                                       │
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────────┐                           │
│  │  dev_comments   │     │ dev_comment_authors │                           │
│  │ (개발 코멘트)    │     │ (코멘트 작성자)      │                           │
│  ├─────────────────┤     ├─────────────────────┤                           │
│  │ id (PK)         │     │ id (PK)             │                           │
│  │ parent_id       │     │ ip_hash             │                           │
│  │ target_type     │     │ author_name         │                           │
│  │ target_id       │     │ comment_count       │                           │
│  │ author_name     │     │ created_at          │                           │
│  │ content         │     └─────────────────────┘                           │
│  │ created_at      │                                                       │
│  └─────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 테이블별 상세

#### job_postings (일자리 공고)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | uuid | 기본키 |
| title | text | 공고 제목 |
| organization | text | 조직/학교명 |
| location | text | 근무지 |
| compensation | text | 급여 정보 |
| deadline | date | 마감일 |
| tags | text[] | 태그 배열 |
| school_level | text | 학교급 (초등/중등/고등) |
| subject | text | 담당 과목 |
| is_urgent | boolean | 긴급 여부 |
| structured_content | jsonb | 구조화된 상세 정보 |
| source_url | text | 원본 URL (크롤링) |
| attachment_url | text | 첨부파일 URL |
| created_by | uuid | 작성자 (FK → auth.users) |
| created_at | timestamptz | 생성일시 |

#### user_profiles (사용자 프로필)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| user_id | uuid | 기본키 (FK → auth.users) |
| display_name | text | 표시 이름 |
| roles | text[] | 역할 (teacher, instructor) |
| interest_regions | jsonb | 관심 지역 |
| experience_years | integer | 경력 연수 |
| teacher_level | text | 교사 레벨 |
| capable_subjects | text[] | 가능 과목 |
| preferred_job_types | text[] | 선호 직종 |
| preferred_subjects | text[] | 선호 과목 |
| profile_image_url | text | 프로필 이미지 |

#### recommendations_cache (AI 추천 캐시)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| user_id | uuid | 기본키 (FK → auth.users) |
| cards | jsonb | 추천 카드 배열 |
| ai_comment | jsonb | AI 코멘트 |
| profile_snapshot | jsonb | 캐시 시점 프로필 |
| card_source_hash | text | 카드 소스 해시 (변경 감지용) |
| generated_at | timestamptz | 생성일시 |
| updated_at | timestamptz | 수정일시 |

#### search_logs (검색 로그)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | uuid | 기본키 |
| user_id | uuid | 검색자 (FK → auth.users, nullable) |
| query | text | 검색어 |
| filters | jsonb | 적용된 필터 |
| result_count | integer | 검색 결과 수 |
| clicked_result_id | uuid | 클릭한 결과 ID |
| created_at | timestamptz | 검색 일시 |

#### error_logs (에러 로그)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | uuid | 기본키 |
| error_type | text | 에러 유형 |
| error_message | text | 에러 메시지 |
| stack_trace | text | 스택 트레이스 |
| user_agent | text | 브라우저 정보 |
| created_at | timestamptz | 발생 일시 |

#### crawl_boards (크롤러 설정)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | uuid | 기본키 |
| name | text | 보드 이름 |
| board_url | text | 게시판 URL |
| is_active | boolean | 활성화 여부 |
| status | text | 상태 (active/broken/blocked) |
| crawl_batch_size | integer | 배치 크기 (기본 10) |
| last_crawled_at | timestamptz | 마지막 크롤링 |
| region_code | text | 지역 코드 |
| school_level | text | 학교급 |
| approved_at | timestamptz | 승인 일시 |
| approved_by | uuid | 승인자 |

#### dev_board_submissions (보드 제출)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | uuid | 기본키 |
| board_url | text | 제출 게시판 URL |
| board_name | text | 게시판 이름 |
| crawler_code | text | 크롤러 코드 |
| submitted_by | uuid | 제출자 |
| is_approved | boolean | 승인 여부 |
| is_local_government | boolean | 지자체 여부 |
| region | text | 지역 |
| created_at | timestamptz | 제출 일시 |

#### dev_comments (개발 코멘트)
| 컬럼 | 타입 | 설명 |
|------|-----|------|
| id | uuid | 기본키 |
| parent_id | uuid | 부모 코멘트 ID (대댓글) |
| target_type | text | 대상 타입 (idea, board 등) |
| target_id | uuid | 대상 ID |
| author_name | text | 작성자 이름 |
| author_ip_hash | text | IP 해시 |
| content | text | 코멘트 내용 |
| created_at | timestamptz | 작성 일시 |

---

## 🔌 Edge Functions

### profile-recommendations
> AI 맞춤 추천 생성

```
요청: POST /functions/v1/profile-recommendations
Body: { user_id: string }

처리 흐름:
1. user_profiles에서 사용자 프로필 조회
2. job_postings 전체 조회
3. 각 공고에 점수 계산:
   - 위치 점수 (같은 구: 1000, 같은 시: 900, 인접: 800)
   - 역할 점수 (매칭: 500)
   - 과목 점수 (매칭: 400)
   - 경력 점수 (적합: 300)
   - 긴급도 점수 (긴급/마감임박: 200)
4. 상위 6개 선별
5. recommendations_cache에 24시간 캐싱
6. 결과 반환

응답: { cards: [], ai_comment: {} }
```

### download-attachment
> 첨부파일 다운로드 프록시

```
요청: GET /functions/v1/download-attachment?url=...&filename=...

처리 흐름:
1. 원본 URL에서 파일 다운로드
2. 파일명 정규화
3. CORS 헤더 설정
4. 파일 반환
```

### generate-crawler
> AI 크롤러 코드 생성

```
요청: POST /functions/v1/generate-crawler
Body: { board_url: string, board_name: string }

처리 흐름:
1. 게시판 URL 분석
2. AI가 크롤러 코드 생성
3. 샌드박스에서 테스트
4. 결과 반환
```

### admin-crawl-run
> 관리자 크롤러 수동 실행

```
요청: POST /functions/v1/admin-crawl-run
Body: { board_id: string }

처리 흐름:
1. 관리자 권한 확인
2. crawl_boards에서 보드 정보 조회
3. 해당 크롤러 실행
4. crawl_logs에 결과 기록
5. 성공/실패 반환

응답: { success: boolean, items_found: number, items_new: number }
```

### sync-migrations
> DB 마이그레이션 상태 동기화

```
요청: POST /functions/v1/sync-migrations

처리 흐름:
1. supabase/migrations 폴더 스캔
2. 적용된 마이그레이션 확인
3. 미적용 마이그레이션 목록 반환
```

### track-deployment
> Cloudflare 배포 이벤트 추적

```
요청: POST /functions/v1/track-deployment
Body: { commit_hash: string, status: string }

처리 흐름:
1. 배포 정보 수신
2. deployments 테이블에 기록
3. 개발자노트 연동
```

### unapprove-crawl-board
> 크롤러 보드 승인 취소

```
요청: POST /functions/v1/unapprove-crawl-board
Body: { board_id: string }

처리 흐름:
1. 관리자 권한 확인
2. crawl_boards.is_approved = false 설정
3. 결과 반환
```

---

## 🔄 프론트엔드 ↔ 백엔드 연결

### 주요 API 호출 매핑

#### 검색/조회
| 프론트엔드 액션 | 호출 함수 | 백엔드 |
|----------------|----------|--------|
| 검색 | `searchCards()` | PostgreSQL FTS + ILIKE |
| AI 추천 조회 | `fetchRecommendationsCache()` | DB 캐시 |
| AI 추천 생성 | `generateRecommendations()` | Edge Function |
| 최신 공고 조회 | `fetchFreshJobs()` | SELECT job_postings |
| 북마크 조회 | `fetchBookmarkedCards()` | SELECT bookmarks + JOIN |

#### 일자리 관리
| 프론트엔드 액션 | 호출 함수 | 백엔드 |
|----------------|----------|--------|
| 일자리 등록 | `createJobPosting()` | INSERT job_postings |
| 일자리 수정 | `updateJobPosting()` | UPDATE job_postings |
| 일자리 상세 | `fetchJobPostingById()` | SELECT job_postings |

#### 인력 관리
| 프론트엔드 액션 | 호출 함수 | 백엔드 |
|----------------|----------|--------|
| 인력 등록 | `createTalent()` | INSERT talents |
| 인력 수정 | `updateTalent()` | UPDATE talents |
| 인력 상세 | `fetchTalentById()` | SELECT talents |

#### 체험 관리
| 프론트엔드 액션 | 호출 함수 | 백엔드 |
|----------------|----------|--------|
| 체험 등록 | `createExperience()` | INSERT experiences |
| 체험 수정 | `updateExperience()` | UPDATE experiences |
| 체험 상세 | `fetchExperienceById()` | SELECT experiences |

#### 북마크/채팅
| 프론트엔드 액션 | 호출 함수 | 백엔드 |
|----------------|----------|--------|
| 북마크 추가 | `addBookmark()` | INSERT bookmarks |
| 북마크 삭제 | `removeBookmark()` | DELETE bookmarks |
| 채팅 전송 | `sendMessage()` | INSERT + Realtime |
| 채팅 구독 | `useChatRealtime()` | Supabase Realtime |

#### 프로필/인증
| 프론트엔드 액션 | 호출 함수 | 백엔드 |
|----------------|----------|--------|
| 프로필 저장 | `upsertUserProfile()` | UPSERT user_profiles |
| 프로필 조회 | `fetchUserProfile()` | SELECT user_profiles |

#### 관리자 기능
| 프론트엔드 액션 | 호출 함수 | 백엔드 |
|----------------|----------|--------|
| 프로모카드 조회 | `fetchPromoCardSettings()` | SELECT promo_cards |
| 프로모카드 생성 | `createPromoCard()` | INSERT promo_cards |
| 프로모카드 수정 | `updatePromoCard()` | UPDATE promo_cards |
| 크롤보드 조회 | `fetchCrawlBoards()` | RPC search_crawl_boards |
| 크롤보드 생성 | `createCrawlBoard()` | INSERT crawl_boards |
| 크롤보드 수정 | `updateCrawlBoard()` | UPDATE crawl_boards |
| 크롤로그 조회 | `fetchCrawlLogs()` | SELECT crawl_logs |

---

## 📡 데이터 흐름 상세

### 1. 검색 흐름

```
┌─────────────┐
│ Header.tsx  │ 검색어 입력: "수원 초등 영어"
└──────┬──────┘
       │
       ▼
┌─────────────┐
│searchStore  │ setSearchQuery()
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ queries.ts  │ searchCards()
│             │
│ 1. 토큰 확장:
│    "수원" → ["수원", "수원시"]
│    "초등" → ["초등", "초등학교"]
│
│ 2. SQL 생성:
│    SELECT * FROM job_postings
│    WHERE title ILIKE '%수원%'
│       OR fts @@ to_tsquery('수원')
│    AND deadline >= NOW()
│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │ 쿼리 실행
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ CardGrid    │ 결과 렌더링
└─────────────┘
```

### 2. AI 추천 흐름

```
┌──────────────────┐
│AIRecommendations │ 컴포넌트 마운트
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ queries.ts       │ fetchRecommendationsCache()
└────────┬─────────┘
         │
    ┌────┴────┐
    │캐시 있음?│
    └────┬────┘
     No  │  Yes
    ┌────┴────────────┐
    │                 │
    ▼                 ▼
┌─────────┐     ┌──────────┐
│ Edge Fn │     │ 캐시 반환 │
│ 호출    │     └──────────┘
└────┬────┘
     │
     ▼
┌─────────────────────────┐
│ profile-recommendations │
│                         │
│ 1. 프로필 조회           │
│ 2. 전체 공고 조회        │
│ 3. 점수 계산 (5개 기준)  │
│ 4. 상위 6개 선별         │
│ 5. 캐시 저장 (24시간)    │
└────────┬────────────────┘
         │
         ▼
┌──────────────────┐
│ CompactJobCard   │ 추천 결과 렌더링
└──────────────────┘
```

### 3. 채팅 실시간 흐름

```
┌────────────────┐
│MobileChatRoom  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│useChatRealtime │ 구독 시작
│                │
│ supabase
│   .channel('chat')
│   .on('postgres_changes',
│       { table: 'chat_messages' },
│       callback)
│   .subscribe()
└───────┬────────┘
        │
        ▼
┌────────────────┐      ┌────────────────┐
│ 메시지 전송    │      │ 상대방         │
│ INSERT         │──────▶ Realtime 수신  │
└────────────────┘      └────────────────┘
```

### 4. 인증 흐름

```
┌───────────────────┐
│SocialSignupModal  │ "Google로 로그인"
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│supabase.auth      │
│.signInWithOAuth() │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│   Google OAuth    │ 인증 처리
└─────────┬─────────┘
          │ 리다이렉트
          ▼
┌───────────────────┐
│ AuthCallback.tsx  │ 세션 확인
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ authStore         │ initialize()
│                   │
│ 프로필 있음?       │
│   Yes → 메인으로   │
│   No → 프로필 설정 │
└───────────────────┘
```

---

## 🕷 크롤러 아키텍처

### 실행 흐름

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CRAWLER FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐                                                   │
│  │ index.js    │ 메인 오케스트레이터                                │
│  └──────┬──────┘                                                   │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────┐                                                   │
│  │crawl_boards │ 활성 소스 조회                                     │
│  │   테이블    │                                                   │
│  └──────┬──────┘                                                   │
│         │                                                          │
│    ┌────┴────┬────────┬────────┐                                   │
│    ▼         ▼        ▼        ▼                                   │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                               │
│ │경기도│ │성남시│ │의정부│ │남양주│  각 크롤러                      │
│ └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘                               │
│    │        │        │        │                                    │
│    └────────┴────────┴────────┘                                    │
│                   │                                                │
│                   ▼                                                │
│         ┌─────────────────┐                                        │
│         │   Playwright    │ 브라우저 자동화                         │
│         │   - 페이지 접속  │                                        │
│         │   - 스크린샷    │                                        │
│         └────────┬────────┘                                        │
│                  │                                                 │
│                  ▼                                                 │
│         ┌─────────────────┐                                        │
│         │  Gemini Vision  │ AI 데이터 추출                          │
│         │   - OCR         │                                        │
│         │   - 구조화      │                                        │
│         └────────┬────────┘                                        │
│                  │                                                 │
│                  ▼                                                 │
│         ┌─────────────────┐                                        │
│         │    Supabase     │ 데이터 저장                             │
│         │   - 중복 체크   │                                        │
│         │   - UPSERT      │                                        │
│         └─────────────────┘                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 크롤러 파일 구조

```
crawler/
├── index.js                 # 메인 실행
│
├── sources/                 # 사이트별 크롤러
│   ├── gyeonggi.js         # 경기도교육청
│   ├── seongnam.js         # 성남시교육청
│   ├── uijeongbu.js        # 의정부시교육청
│   └── namyangju.js        # 남양주시교육청
│
├── lib/                     # 공통 유틸리티
│   ├── playwright.js       # 브라우저 관리
│   ├── gemini.js           # AI API 호출
│   ├── supabase.js         # DB 저장
│   ├── screenshot.js       # 스크린샷
│   ├── logger.js           # 로깅
│   └── jobFieldParser.js   # 필드 파싱
│
└── ai-generator/            # AI 크롤러 생성
    └── agents/
        ├── boardAnalyzer.ts
        ├── codeGenerator.ts
        └── selfCorrection.ts
```

---

## 🔐 보안 (RLS)

### Row Level Security 정책

| 테이블 | 정책 | 설명 |
|--------|-----|------|
| job_postings | 읽기: 공개 | 누구나 조회 가능 |
| job_postings | 쓰기: 인증 | 로그인 사용자만 등록 |
| job_postings | 수정/삭제: 소유자 | 본인 글만 수정/삭제 |
| user_profiles | 읽기/쓰기: 소유자 | 본인 프로필만 접근 |
| bookmarks | 읽기/쓰기: 소유자 | 본인 북마크만 접근 |
| chat_messages | 읽기/쓰기: 참여자 | 채팅방 참여자만 접근 |

---

## 🌐 환경 변수

### 프론트엔드 (.env)
```bash
# Supabase (필수)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# AI 크롤러 생성용 (선택)
VITE_GITHUB_PAT=ghp_xxx...

# 지도 기능 (선택)
VITE_KAKAO_MAP_KEY=...
```

### Edge Functions (Supabase Secrets)
```bash
PROJECT_URL=https://xxx.supabase.co
ANON_KEY=eyJxxx...
GEMINI_API_KEY=AIzaSy...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

### 크롤러 (crawler/.env)
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
GEMINI_API_KEY=AIzaSy...
```

> ⚠️ **주의**: `.env` 파일은 절대 Git에 커밋하지 않습니다. `.env.example`을 참고하세요.

---

## 📁 프로젝트 구조 요약

```
SellmeBuyme/
│
├── src/                          # 프론트엔드
│   ├── pages/                    # 페이지 컴포넌트
│   ├── components/               # UI 컴포넌트
│   ├── stores/                   # Zustand 스토어 (5개)
│   │   ├── authStore.ts         # 인증 상태
│   │   ├── searchStore.ts       # 검색 상태
│   │   ├── bookmarkStore.ts     # 북마크 상태
│   │   ├── chatStore.ts         # 채팅 상태
│   │   └── toastStore.ts        # 알림 상태
│   ├── lib/                      # 유틸리티
│   │   ├── supabase/            # DB 쿼리
│   │   │   ├── client.ts        # 클라이언트
│   │   │   └── queries.ts       # 쿼리 함수 (핵심)
│   │   ├── constants/           # 상수
│   │   ├── hooks/               # 커스텀 훅
│   │   └── utils/               # 유틸리티
│   ├── hooks/                    # 프론트 훅
│   └── types/                    # 타입 정의
│
├── crawler/                      # 크롤러
│   ├── index.js                 # 메인 오케스트레이터
│   ├── sources/                 # 사이트별 크롤러 (4개+)
│   │   ├── gyeonggi.js          # 경기도교육청
│   │   ├── seongnam.js          # 성남시교육청
│   │   ├── uijeongbu.js         # 의정부시교육청
│   │   └── namyangju.js         # 남양주시교육청
│   ├── lib/                     # 유틸리티 (8개)
│   │   ├── playwright.js        # 브라우저 관리
│   │   ├── gemini.js            # AI API 호출
│   │   ├── supabase.js          # DB 저장
│   │   ├── screenshot.js        # 스크린샷
│   │   ├── logger.js            # 로깅
│   │   ├── debug-logger.js      # 디버그 로깅
│   │   ├── jobFieldParser.js    # 필드 파싱
│   │   └── fileConverter.js     # 파일 변환
│   └── ai-generator/            # AI 크롤러 생성
│       ├── agents/              # 에이전트
│       └── types/               # 타입 정의
│
├── supabase/                     # 백엔드
│   ├── migrations/              # DB 스키마 (50개+)
│   └── functions/               # Edge Functions (7개)
│       ├── profile-recommendations/
│       ├── download-attachment/
│       ├── generate-crawler/
│       ├── admin-crawl-run/
│       ├── sync-migrations/
│       ├── track-deployment/
│       └── unapprove-crawl-board/
│
├── scripts/                      # 관리 스크립트 (100개+)
│   ├── db/                      # DB 관리
│   ├── dev/                     # 개발용
│   └── test/                    # 테스트/검증
│
└── docs/                         # 문서 (31개)
```

---

## 🔗 주요 연결 경로

### 검색 기능
```
Header.tsx
    → searchStore.ts
    → queries.ts (searchCards)
    → PostgreSQL (FTS + ILIKE)
    → CardGrid.tsx
    → JobCard.tsx
```

### AI 추천
```
AIRecommendations.tsx
    → queries.ts (fetchRecommendationsCache)
    → [캐시 없으면] Edge Function (profile-recommendations)
    → recommendations_cache 테이블
    → CompactJobCard.tsx
```

### 북마크
```
JobCard.tsx (하트 클릭)
    → bookmarkStore.ts
    → queries.ts (addBookmark/removeBookmark)
    → bookmarks 테이블
    → BookmarkModal.tsx
```

### 채팅
```
MobileChat.tsx
    → chatStore.ts
    → useChatRealtime.ts (Supabase Realtime)
    → chat_messages 테이블
    → MobileChatRoom.tsx
```

### 인증
```
SocialSignupModal.tsx
    → supabase.auth.signInWithOAuth()
    → Google OAuth
    → AuthCallback.tsx
    → authStore.ts
    → ProfileSetupModal.tsx
    → user_profiles 테이블
```

---

## 🛠 개발 명령어

```bash
# 프론트엔드
npm run dev          # 개발 서버
npm run build        # 빌드
npm run lint         # 린트

# 크롤러
cd crawler && node index.js

# Edge Function 배포
supabase functions deploy profile-recommendations

# 스크립트 실행
npx tsx scripts/db/grant-admin-role.ts
```

---

## 🔗 연관 문서

| 문서 | 설명 |
|------|-----|
| `CLAUDE.md` | 개발 가이드 (핵심) |
| `GUIDE_DEVELOPER.md` | 폴더/파일 구조 |
| `GUIDE_PLANNER.md` | 기능/UI 설명 |
| `BACKEND_STRUCTURE.md` | 백엔드 상세 |
| `FRONTEND_STRUCTURE.md` | 프론트 상세 |

---

*마지막 업데이트: 2025-12-09*

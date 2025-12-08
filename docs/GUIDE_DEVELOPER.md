# 🧑‍💻 SellmeBuyme 개발자 가이드

> 새로 합류한 개발자가 프로젝트 구조를 빠르게 파악할 수 있도록 정리한 문서입니다.

---

## 📁 전체 폴더 구조

```
SellmeBuyme/
│
├── 📂 src/                    # 프론트엔드 소스코드
├── 📂 crawler/                # 크롤러 (Node.js)
├── 📂 supabase/               # 백엔드 (DB, Edge Functions)
├── 📂 scripts/                # 관리 스크립트 (TypeScript)
├── 📂 public/                 # 정적 파일
└── 📄 설정 파일들              # vite, ts, tailwind 등
```

---

## 🎯 src/ - 프론트엔드

### 📄 핵심 파일

| 파일 | 역할 |
|------|------|
| `main.tsx` | 앱 진입점, 라우팅 설정 |
| `App.tsx` | 메인 페이지, 전체 레이아웃 |
| `index.css` | 글로벌 스타일, Tailwind 임포트 |

### 📂 pages/ - 페이지 컴포넌트

| 파일 | URL | 역할 |
|------|-----|------|
| `App.tsx` | `/` | 메인 홈 (카드 그리드, AI 추천) |
| `AdminPage.tsx` | `/admin` | 관리자 대시보드 |
| `DeveloperPage.tsx` | `/note` | 개발팀 협업 도구 |
| `Landing.tsx` | `/landing` | 랜딩/시연 페이지 |
| `BookmarkPage.tsx` | `/bookmark` | 북마크 목록 |
| `MobileChat.tsx` | `/chat` | 모바일 채팅 목록 |
| `MobileChatRoom.tsx` | `/chat/:roomId` | 모바일 채팅방 |
| `MobileSearch.tsx` | `/search` | 모바일 검색 |
| `MobileRegister.tsx` | `/register` | 모바일 등록 |
| `AuthCallback.tsx` | `/auth/callback` | OAuth 콜백 처리 |

### 📂 components/ - UI 컴포넌트

#### 🗂 layout/ - 레이아웃
| 파일 | 역할 |
|------|------|
| `Header.tsx` | 상단 헤더 (검색, 필터, 유저 메뉴) |
| `StripeBanner.tsx` | 배너 광고 섹션 |

#### 🗂 auth/ - 인증/프로필
| 파일 | 역할 |
|------|------|
| `SocialSignupModal.tsx` | 소셜 로그인 모달 |
| `ProfileSetupModal.tsx` | 프로필 설정 (5단계) |
| `ProfileStep1Basic.tsx` | Step 1: 기본 정보 |
| `ProfileStep1Role.tsx` | Step 1: 역할 선택 |
| `ProfileStep2Education.tsx` | Step 2: 학력 |
| `ProfileStep2Field.tsx` | Step 2: 전공/과목 |
| `ProfileStep3Location.tsx` | Step 3: 거주지 |
| `ProfileStep3Preferences.tsx` | Step 3: 선호 조건 |
| `ProfileStep4Priority.tsx` | Step 4: 우선순위 |
| `ProfileStep5Skills.tsx` | Step 5: 스킬/자격증 |
| `ProfileViewModal.tsx` | 프로필 조회/편집 |
| `ProfileAwarenessModal.tsx` | 프로필 설정 알림 |

#### 🗂 cards/ - 카드 컴포넌트
| 파일 | 역할 |
|------|------|
| `CardGrid.tsx` | 카드 그리드 컨테이너 (무한스크롤) |
| `JobCard.tsx` | 일자리 카드 (메인) |
| `TalentCard.tsx` | 인력 카드 (메인) |
| `ExperienceCard.tsx` | 체험 카드 (메인) |
| `CompactJobCard.tsx` | 일자리 카드 (AI 추천용) |
| `CompactTalentCard.tsx` | 인력 카드 (AI 추천용) |
| `JobDetailModal.tsx` | 일자리 상세 모달 |
| `TalentDetailModal.tsx` | 인력 상세 모달 |
| `ExperienceDetailModal.tsx` | 체험 상세 모달 |

#### 🗂 ai/ - AI 추천
| 파일 | 역할 |
|------|------|
| `AIRecommendations.tsx` | AI 추천 섹션 |
| `AIInsightBox.tsx` | AI 인사이트 박스 |

#### 🗂 forms/ - 등록 폼
| 파일 | 역할 |
|------|------|
| `JobPostingForm.tsx` | 일자리 등록 폼 |
| `JobPostingEditModal.tsx` | 일자리 수정 모달 |
| `TalentRegistrationForm.tsx` | 인력 등록 폼 |
| `ExperienceRegistrationForm.tsx` | 체험 등록 폼 |
| `ExperienceEditModal.tsx` | 체험 수정 모달 |
| `FileUploadField.tsx` | 파일 업로드 |
| `RegionSelector.tsx` | 지역 선택 |
| `SchoolLevelSelector.tsx` | 학교급 선택 |
| `TargetSchoolLevelSelector.tsx` | 대상 학교급 선택 |
| `SpecialtySelector.tsx` | 전공/과목 선택 |
| `CategorySelector.tsx` | 카테고리 선택 |
| `OperationTypeSelector.tsx` | 운영 타입 선택 |
| `FormLayout.tsx` | 폼 레이아웃 래퍼 |

#### 🗂 mobile/ - 모바일 전용
| 파일 | 역할 |
|------|------|
| `MobileHeader.tsx` | 모바일 헤더 |
| `MobileBottomNav.tsx` | 모바일 하단 네비게이션 (현재 사용) |
| `BottomNav.tsx` | 구버전 하단 네비 (deprecated) |
| `MobileProfilePage.tsx` | 모바일 프로필 페이지 |
| `MobileAuthPage.tsx` | 모바일 인증 페이지 |
| `RegisterButtonsSection.tsx` | 등록 버튼 섹션 |
| `RegisterBottomSheet.tsx` | 등록 바텀시트 |
| `IntegratedHeaderPromo.tsx` | 헤더-프로모 통합 |
| `MobilePromoSection.tsx` | 모바일 프로모 섹션 |
| `StatisticsBanner.tsx` | 통계 배너 |

#### 🗂 admin/ - 관리자
| 파일 | 역할 |
|------|------|
| `CrawlBoardList.tsx` | 크롤 보드 목록 |
| `CrawlBoardForm.tsx` | 크롤 보드 폼 |
| `CrawlBatchSizeInput.tsx` | 배치 크기 입력 |
| `CrawlLogViewer.tsx` | 크롤 로그 뷰어 |
| `ErrorLogViewer.tsx` | 에러 로그 뷰어 |
| `BoardSubmissionList.tsx` | 보드 제출 목록 |
| `BoardApprovalModal.tsx` | 보드 승인 모달 |
| `PromoCardManager.tsx` | 프로모 카드 관리자 |
| `PromoCardListManager.tsx` | 프로모 카드 리스트 관리 |
| `PromoCardForm.tsx` | 프로모 카드 폼 |
| `PromoCardEditModal.tsx` | 프로모 카드 수정 모달 |
| `PromoCardEditSection.tsx` | 프로모 카드 수정 섹션 |
| `PromoCardPreview.tsx` | 프로모 카드 미리보기 |
| `PromoCardContent.tsx` | 프로모 카드 콘텐츠 |
| `PromoCardListItem.tsx` | 프로모 카드 리스트 아이템 |
| `PromoTabManager.tsx` | 프로모 탭 관리자 |
| `StripeBannerManager.tsx` | 배너 관리 |
| `BannerEditSection.tsx` | 배너 수정 섹션 |
| `ColorInputField.tsx` | 컬러 입력 |

#### 🗂 admin/dashboard/ - 대시보드
| 파일 | 역할 |
|------|------|
| `DashboardOverview.tsx` | 대시보드 개요 |
| `StatCard.tsx` | 통계 카드 |
| `StatsTable.tsx` | 통계 테이블 |
| `LineChart.tsx` | 라인 차트 |
| `PieChart.tsx` | 파이 차트 |

#### 🗂 developer/ - 개발팀 협업
| 파일 | 역할 |
|------|------|
| `ProjectCard.tsx` | 프로젝트 카드 |
| `ProjectFormModal.tsx` | 프로젝트 폼 모달 |
| `IdeaList.tsx` | 아이디어 목록 |
| `IdeaCard.tsx` | 아이디어 카드 |
| `IdeaDetailModal.tsx` | 아이디어 상세 |
| `IdeaForm.tsx` | 아이디어 폼 |
| `BoardSubmissionList.tsx` | 보드 제출 목록 |
| `BoardSubmissionCard.tsx` | 보드 제출 카드 |
| `BoardSubmissionForm.tsx` | 보드 제출 폼 |
| `DeploymentList.tsx` | 배포 목록 |
| `DeploymentCard.tsx` | 배포 카드 |
| `ErrorLogSection.tsx` | 에러 로그 섹션 |
| `FilterButton.tsx` | 필터 버튼 |
| `StatusBadge.tsx` | 상태 배지 |
| `CategoryBadge.tsx` | 카테고리 배지 |
| `CollapsibleSection.tsx` | 접기/펼치기 섹션 |
| `FloatingActionButton.tsx` | 플로팅 버튼 |
| `Pagination.tsx` | 페이지네이션 |
| `PaginationDots.tsx` | 페이지네이션 점 |
| `RegionSelector.tsx` | 지역 선택 |
| `SchoolLevelSelector.tsx` | 학교급 선택 |
| `ImageUploader.tsx` | 이미지 업로더 |
| `ActionMenu.tsx` | 액션 메뉴 |

#### 🗂 developer/comments/ - 댓글
| 파일 | 역할 |
|------|------|
| `CommentSection.tsx` | 댓글 섹션 |
| `CommentForm.tsx` | 댓글 폼 |
| `CommentThread.tsx` | 댓글 스레드 |

#### 🗂 bookmark/ - 북마크
| 파일 | 역할 |
|------|------|
| `BookmarkModal.tsx` | 북마크 모달 |

#### 🗂 chat/ - 채팅
| 파일 | 역할 |
|------|------|
| `DesktopChatModal.tsx` | 데스크톱 채팅 모달 |
| `UserSearchModal.tsx` | 사용자 검색 모달 |

#### 🗂 promo/ - 프로모션
| 파일 | 역할 |
|------|------|
| `PromoCardStack.tsx` | 프로모 카드 스택 |

#### 🗂 landing/ - 랜딩
| 파일 | 역할 |
|------|------|
| `HierarchicalFieldSelector.tsx` | 계층형 전공 선택기 |

#### 🗂 tour/ - 사이트 투어
| 파일 | 역할 |
|------|------|
| `SiteTour.tsx` | 사이트 투어 |
| `TourOverlay.tsx` | 투어 오버레이 |
| `TourTooltip.tsx` | 투어 툴팁 |
| `WelcomeTourModal.tsx` | 환영 투어 모달 |

#### 🗂 map/ - 지도
| 파일 | 역할 |
|------|------|
| `MapModal.tsx` | 지도 모달 |
| `MapPopup.tsx` | 지도 팝업 |
| `MapExtension.tsx` | 지도 확장 |

#### 🗂 common/ - 공통
| 파일 | 역할 |
|------|------|
| `ToastContainer.tsx` | 토스트 알림 |
| `TextType.tsx` | 텍스트 타입 |

### 📂 stores/ - 상태 관리 (Zustand)

| 파일 | 역할 | 주요 상태 |
|------|------|----------|
| `authStore.ts` | 인증 상태 | `user`, `status`, `initialize()`, `logout()` |
| `searchStore.ts` | 검색 상태 | `searchQuery`, `filters`, `viewType`, `offset` |
| `bookmarkStore.ts` | 북마크 상태 | `bookmarkedIds`, `addBookmark()`, `removeBookmark()` |
| `chatStore.ts` | 채팅 상태 | `rooms`, `messages`, `sendMessage()` |
| `toastStore.ts` | 토스트 상태 | `toasts`, `addToast()`, `removeToast()` |

### 📂 lib/ - 유틸리티

#### 🗂 lib/supabase/ - DB 쿼리
| 파일 | 역할 |
|------|------|
| `client.ts` | Supabase 클라이언트 초기화 |
| `queries.ts` | **핵심** - 모든 DB 쿼리 (134KB) |
| `profiles.ts` | 프로필 CRUD |
| `admin.ts` | 관리자 기능 |
| `developer.ts` | 개발팀 기능 |
| `dashboard.ts` | 대시보드 통계 |
| `chat.ts` | 채팅 기능 |
| `storage.ts` | 파일 스토리지 |
| `stripe-banner.ts` | 배너 관리 |
| `regions.ts` | 지역 정보 |
| `queries-pgroonga-test.ts` | pgroonga 검색 테스트 |

#### 🗂 lib/ - 기타 유틸리티
| 파일 | 역할 |
|------|------|
| `colorUtils.ts` | 색상 변환 유틸리티 |
| `dummyData.ts` | 개발용 더미 데이터 |
| `utils.ts` | 범용 유틸리티 함수 |

#### 🗂 lib/constants/ - 상수
| 파일 | 역할 |
|------|------|
| `filters.ts` | 필터 옵션 (카테고리, 지역, 정렬) |
| `regions.ts` | 전국 지역 데이터 |
| `hierarchicalFields.ts` | 계층형 전공 데이터 |

#### 🗂 lib/utils/ - 유틸리티 함수
| 파일 | 역할 |
|------|------|
| `errorReporter.ts` | 에러 보고 |
| `errorLogger.ts` | 에러 로깅 |
| `activityLogger.ts` | 활동 로깅 |
| `searchHistory.ts` | 검색 히스토리 |
| `storageManager.ts` | 로컬 스토리지 |
| `landingTransform.ts` | 랜딩 데이터 변환 |
| `geocoding.ts` | 지오코딩 |
| `cardImages.ts` | 카드 이미지 URL |
| `breadcrumb.ts` | 브래드크럼 |
| `linkify.tsx` | 링크 변환 |
| `environmentSnapshot.ts` | 환경 스냅샷 |
| `networkMonitor.ts` | 네트워크 모니터링 |
| `projectMetrics.ts` | 프로젝트 메트릭 |

#### 🗂 lib/hooks/ - 커스텀 훅
| 파일 | 역할 |
|------|------|
| `useAdminAuth.ts` | 관리자 인증 확인 |
| `useDebounce.ts` | 디바운스 |
| `useGeolocation.ts` | 지오로케이션 |
| `useProjects.ts` | 프로젝트 데이터 |
| `useIdeas.ts` | 아이디어 데이터 |
| `useBoardSubmissions.ts` | 보드 제출 |
| `useDeployments.ts` | 배포 데이터 |
| `useFilteredIdeas.ts` | 필터링된 아이디어 |
| `useFilteredSubmissions.ts` | 필터링된 제출 |
| `useComments.ts` | 댓글 |

#### 🗂 lib/validation/ - 폼 검증
| 파일 | 역할 |
|------|------|
| `formSchemas.ts` | Zod 스키마 (일자리, 인력, 체험) |

#### 🗂 lib/api/ - API
| 파일 | 역할 |
|------|------|
| `generateCrawler.ts` | 크롤러 생성 API |

### 📂 hooks/ - 프론트엔드 훅

| 파일 | 역할 |
|------|------|
| `useChatRealtime.ts` | Supabase Realtime 채팅 구독 |
| `useKakaoMaps.ts` | 카카오맵 API |
| `usePromoCardManager.ts` | 프로모 카드 관리 |
| `usePromoCardEditor.ts` | 프로모 카드 에디터 |

### 📂 types/ - 타입 정의

| 파일 | 역할 |
|------|------|
| `index.ts` | 주요 타입 (Card, JobPosting, Talent, SearchFilters) |
| `developer.ts` | 개발팀 타입 (Project, Idea, Deployment) |
| `chat.ts` | 채팅 타입 (ChatRoom, ChatMessage) |

### 📂 styles/ - 스타일

| 파일 | 역할 |
|------|------|
| `landing.css` | 랜딩 페이지 전용 스타일 |

---

## 🕷 crawler/ - 크롤러

### 📄 핵심 파일

| 파일 | 역할 |
|------|------|
| `index.js` | 메인 크롤러 오케스트레이터 |
| `package.json` | 크롤러 의존성 |

### 📂 sources/ - 사이트별 크롤러

| 파일 | 역할 |
|------|------|
| `gyeonggi.js` | 경기도교육청 크롤러 |
| `seongnam.js` | 성남시교육청 크롤러 |
| `uijeongbu.js` | 의정부시교육청 크롤러 |
| `namyangju.js` | 남양주시교육청 크롤러 |
| `남양주교육지원청-구인구직.js` | 남양주 구인구직 크롤러 |
| `남양주교육지원청-구인구직-테스트.js` | 남양주 테스트 크롤러 |

### 📂 lib/ - 크롤러 유틸

| 파일 | 역할 |
|------|------|
| `playwright.js` | Playwright 브라우저 관리 |
| `screenshot.js` | 스크린샷 캡처 |
| `gemini.js` | Gemini Vision API 호출 |
| `supabase.js` | DB 저장 |
| `logger.js` | 로깅 |
| `debug-logger.js` | 디버그 로깅 |
| `jobFieldParser.js` | 공고 필드 파싱 |
| `fileConverter.js` | 파일 변환 |

### 📂 ai-generator/ - AI 크롤러 생성

| 파일 | 역할 |
|------|------|
| `agents/boardAnalyzer.ts` | 게시판 분석 에이전트 |
| `agents/codeGenerator.ts` | 코드 생성 에이전트 |
| `agents/sandbox.ts` | 샌드박스 테스트 |
| `agents/selfCorrection.ts` | 자동 수정 에이전트 |

---

## 🗄 supabase/ - 백엔드

### 📂 migrations/ - DB 마이그레이션

| 주요 마이그레이션 | 역할 |
|-----------------|------|
| `20250117_initial_schema.sql` | 초기 스키마 (job_postings, talents, user_profiles) |
| `20250113_chat_system.sql` | 채팅 시스템 |
| `20250115_create_bookmarks_table.sql` | 북마크 테이블 |
| `20250119_add_search_vectors.sql` | 검색 벡터 (FTS) |
| `20250120_add_recommendations_cache.sql` | 추천 캐시 |
| `20251031_experiences_schema.sql` | 체험 테이블 |
| `20251114_fix_chat_participants_rls.sql` | 채팅 RLS 수정 |

### 📂 functions/ - Edge Functions

| 함수 | 역할 |
|------|------|
| `profile-recommendations/` | AI 맞춤 추천 생성 |
| `download-attachment/` | 첨부파일 다운로드 프록시 |
| `admin-crawl-run/` | 크롤러 수동 실행 |
| `generate-crawler/` | AI 크롤러 코드 생성 |
| `sync-migrations/` | 마이그레이션 동기화 |
| `track-deployment/` | 배포 추적 |
| `unapprove-crawl-board/` | 보드 승인 취소 |

### 📂 functions/_shared/ - 공유 유틸

| 파일 | 역할 |
|------|------|
| `cors.ts` | CORS 헤더 설정 |
| `ai-crawler.ts` | AI 크롤러 공유 코드 |
| `ai-crawler-with-gemini.ts` | Gemini 통합 |

---

## 📜 scripts/ - 관리 스크립트

> ⚠️ **모든 스크립트는 TypeScript(.ts) 필수** (PROJECT_RULES.md)

### 📂 db/ - DB 관리

| 파일 | 역할 |
|------|------|
| `grant-admin-role.ts` | admin 역할 부여 |
| `apply-migration.ts` | 마이그레이션 적용 |
| `run-migration.ts` | 마이그레이션 실행 |
| `check-keywords.ts` | 검색 키워드 확인 |
| `sync-deployments.ts` | 배포 동기화 |
| `verify-crawl-boards.ts` | 크롤 보드 검증 |
| `delete-duplicate-chat-rooms.ts` | 중복 채팅방 삭제 |

### 📂 test/ - 테스트

| 파일 | 역할 |
|------|------|
| `verify-stripe-banners.ts` | 배너 검증 |
| `verify-chat-features.ts` | 채팅 기능 검증 |
| `check-bookmarks-table.ts` | 북마크 테이블 확인 |
| `test-bookmark-insert.ts` | 북마크 삽입 테스트 |
| `chat-e2e-test.ts` | 채팅 E2E 테스트 |

---

## ⚙️ 설정 파일

| 파일 | 역할 |
|------|------|
| `package.json` | 의존성, npm 스크립트 |
| `tsconfig.json` | TypeScript 설정, `@/*` 경로 별칭 |
| `vite.config.ts` | Vite 빌드, PWA, API 미들웨어 |
| `tailwind.config.ts` | Tailwind 커스텀 색상, 폰트 |
| `postcss.config.js` | PostCSS 플러그인 |
| `eslint.config.js` | ESLint 규칙 |
| `capacitor.config.ts` | 모바일 앱 설정 |

---

## 📚 문서 파일

| 파일 | 역할 |
|------|------|
| `README.md` | 프로젝트 소개 |
| `CLAUDE.md` | Claude Code 개발 가이드 (핵심) |
| `PROJECT_RULES.md` | 코드 작성 규칙 |
| `FRONTEND_STRUCTURE.md` | 프론트엔드 구조 |
| `BACKEND_STRUCTURE.md` | 백엔드 구조 |
| `COLOR_STRUCTURE.md` | 색상 팔레트 |
| `CRAWLING_PLAN.md` | 크롤러 계획 |

---

## 🔧 주요 명령어

```bash
# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 린트
npm run lint

# 크롤러 실행
cd crawler && node index.js

# Edge Function 배포
supabase functions deploy profile-recommendations

# 스크립트 실행
npx tsx scripts/db/grant-admin-role.ts
```

---

## 📝 개발 규칙 요약

1. **TypeScript 필수** - 스크립트, 프론트엔드 모두 `.ts/.tsx`
2. **크롤러만 JS 허용** - `crawler/` 폴더만 `.js` 사용 가능
3. **경로 별칭** - `@/`는 `src/` 의미
4. **환경 변수** - 브라우저용은 `VITE_` 접두사 필수
5. **모달 상태** - 닫을 때 항상 초기화

---

## 🔗 파일 간 연결 관계

### 검색 기능
```
Header.tsx → searchStore.ts → queries.ts → CardGrid.tsx → JobCard.tsx
```

### AI 추천
```
AIRecommendations.tsx → queries.ts → profile-recommendations (Edge) → CompactJobCard.tsx
```

### 로그인
```
SocialSignupModal.tsx → authStore.ts → ProfileSetupModal.tsx → profiles.ts
```

### 북마크
```
JobCard.tsx → bookmarkStore.ts → queries.ts → BookmarkModal.tsx
```

### 채팅
```
MobileChat.tsx → chatStore.ts → useChatRealtime.ts → MobileChatRoom.tsx
```

---

*마지막 업데이트: 2025-12-08*

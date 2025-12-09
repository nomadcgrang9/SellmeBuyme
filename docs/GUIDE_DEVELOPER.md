# 🧑‍💻 SellmeBuyme 개발자 가이드

> 새로 합류한 개발자가 프로젝트 구조를 빠르게 파악할 수 있도록 정리한 문서입니다.

---

## 📁 전체 폴더 구조

```
SellmeBuyme/
│
├── 📂 src/                    # 프론트엔드 소스코드
│   ├── 📂 api/                # API 라우트 (Vite middleware)
│   ├── 📂 components/         # UI 컴포넌트
│   ├── 📂 hooks/              # 커스텀 훅
│   ├── 📂 lib/                # 유틸리티, Supabase 클라이언트
│   ├── 📂 pages/              # 페이지 컴포넌트
│   ├── 📂 stores/             # Zustand 상태 관리
│   ├── 📂 styles/             # 스타일 파일
│   └── 📂 types/              # TypeScript 타입 정의
├── 📂 crawler/                # 크롤러 (Node.js + Playwright)
│   ├── 📂 ai-generator/       # AI 크롤러 자동 생성
│   ├── 📂 lib/                # 크롤러 유틸리티
│   └── 📂 sources/            # 사이트별 크롤러
├── 📂 supabase/               # 백엔드 (DB, Edge Functions)
│   ├── 📂 functions/          # Edge Functions (Deno)
│   └── 📂 migrations/         # DB 마이그레이션 SQL
├── 📂 scripts/                # 관리 스크립트 (TypeScript) - 100개+
│   ├── 📂 db/                 # DB 관리 스크립트
│   ├── 📂 dev/                # 개발용 스크립트
│   └── 📂 test/               # 테스트/검증 스크립트
├── 📂 docs/                   # 문서 파일 (MD)
├── 📂 public/                 # 정적 파일, 폰트
└── 📄 설정 파일들              # vite, ts, tailwind, capacitor 등
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
| 파일 | 역할 | 상태 |
|------|------|-----|
| `SocialSignupModal.tsx` | 소셜 로그인 모달 | ✅ 사용 |
| `ProfileSetupModal.tsx` | 프로필 설정 (3단계) | ✅ 사용 |
| `ProfileStep1Role.tsx` | Step 1: 역할 선택 (교사/강사/업체/학교행정) | ✅ 사용 |
| `ProfileStep2Field.tsx` | Step 2: 분야 선택 (학교급/과목/강사분야) | ✅ 사용 |
| `ProfileStep3Location.tsx` | Step 3: 지역 + 자기소개 | ✅ 사용 |
| `ProfileViewModal.tsx` | 프로필 조회/편집 | ✅ 사용 |
| `ProfileAwarenessModal.tsx` | 프로필 설정 알림 | ✅ 사용 |
| `ProfileStep1Basic.tsx` | (미사용) 기본 정보 | ⚠️ deprecated |
| `ProfileStep2Education.tsx` | (미사용) 학력 | ⚠️ deprecated |
| `ProfileStep3Preferences.tsx` | (미사용) 선호 조건 | ⚠️ deprecated |
| `ProfileStep4Priority.tsx` | (미사용) 우선순위 | ⚠️ deprecated |
| `ProfileStep5Skills.tsx` | (미사용) 스킬/자격증 | ⚠️ deprecated |
| `ProfileSetupModalNew.tsx` | (백업) | ⚠️ backup |
| `ProfileSetupModal_backup.tsx` | (백업) | ⚠️ backup |

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
| 파일 | 역할 | 상태 |
|------|------|-----|
| `MobileHeader.tsx` | 모바일 헤더 | ✅ |
| `MobileBottomNav.tsx` | 모바일 하단 네비게이션 | ✅ 현재 사용 |
| `MobileProfilePage.tsx` | 모바일 프로필 페이지 | ✅ |
| `MobileAuthPage.tsx` | 모바일 인증 페이지 | ✅ |
| `MobilePromoSection.tsx` | 모바일 프로모 섹션 | ✅ |
| `RegisterButtonsSection.tsx` | 등록 버튼 섹션 | ✅ |
| `RegisterBottomSheet.tsx` | 등록 바텀시트 | ✅ |
| `IntegratedHeaderPromo.tsx` | 헤더-프로모 통합 | ✅ |
| `StatisticsBanner.tsx` | 통계 배너 | ✅ |
| `BottomNav.tsx` | 구버전 하단 네비 | ⚠️ deprecated |

#### 🗂 admin/ - 관리자
| 파일 | 역할 |
|------|------|
| `AdminUserManagement.tsx` | 사용자 관리 |
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

#### 🗂 기타 컴포넌트
| 파일 | 역할 |
|------|------|
| `BlurText.tsx` | 블러 텍스트 효과 |

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

### 📂 api/ - API 라우트

| 파일 | 역할 |
|------|------|
| `generate-crawler.ts` | 크롤러 생성 API (Vite middleware) |

---

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
| `debug-gyeonggi-html.js` | 경기도 HTML 디버그 |
| `migrate-attachment-urls.js` | 첨부파일 URL 마이그레이션 |

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

### 📂 ai-generator/ - AI 크롤러 자동 생성

#### agents/ - 에이전트
| 파일 | 역할 |
|------|------|
| `boardAnalyzer.ts` | 게시판 분석 에이전트 |
| `codeGenerator.ts` | 코드 생성 에이전트 |
| `sandbox.ts` | 샌드박스 테스트 |
| `selfCorrection.ts` | 자동 수정 에이전트 |

#### 기타 파일
| 파일 | 역할 |
|------|------|
| `types/index.ts` | 타입 정의 |
| `analyze-namyangju-structure.ts` | 남양주 구조 분석 |
| `explore-namyangju.ts` | 남양주 탐색 |
| `check-detail-page.ts` | 상세페이지 확인 |
| `test-phase5-*.ts` | Phase 5 테스트 스크립트 (4개) |

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
>
> 📝 현재 100개 이상의 스크립트가 있습니다. 아래는 주요 카테고리별 대표 스크립트입니다.

### 📂 db/ - DB 관리

| 파일 | 역할 |
|------|------|
| `grant-admin-role.ts` | admin 역할 부여 |
| `apply-migration.ts` | 마이그레이션 적용 |
| `run-migration.ts` | 마이그레이션 실행 |
| `check-keywords.ts` | 검색 키워드 확인 |
| `sync-deployments.ts` | 배포 동기화 |
| `patch-crawl-boards-meta.ts` | 크롤보드 메타 패치 |
| `backfill-search-vectors.ts` | 검색 벡터 백필 |
| `check-extensions.ts` | DB 확장 확인 |
| `check-pgroonga-availability.ts` | pgroonga 가용성 확인 |
| `check-search-data.ts` | 검색 데이터 확인 |

### 📂 dev/ - 개발용

| 파일 | 역할 |
|------|------|
| `inspect-db-data.ts` | DB 데이터 검사 |
| `inspect-db-data-fixed.ts` | DB 데이터 검사 (수정본) |

### 📂 test/ - 테스트/검증

| 파일 | 역할 |
|------|------|
| `verify-stripe-banners.ts` | 배너 검증 |
| `verify-auto-statistics.ts` | 자동 통계 검증 |
| `verify-synonym-search.ts` | 동의어 검색 검증 |
| `verify-phase4-integration.ts` | Phase 4 통합 검증 |
| `test-refresh-stats.ts` | 통계 새로고침 테스트 |
| `test-search-query.ts` | 검색 쿼리 테스트 |
| `test-stripe-banner-rls.ts` | 배너 RLS 테스트 |
| `test-crawl-boards-search.ts` | 크롤보드 검색 테스트 |
| `view-boards-with-regions.ts` | 지역별 보드 조회 |

### 📂 루트 스크립트 (주요)

| 카테고리 | 예시 스크립트 | 수량 |
|---------|-------------|------|
| `check-*.ts` | DB 상태, 크롤보드, 프로필 확인 등 | ~50개 |
| `delete-*.ts` | 중복/불량 데이터 삭제 | ~15개 |
| `analyze-*.ts` | 구조 분석, 링크 분석 등 | ~10개 |
| `cleanup-*.ts` | 데이터 정리 | ~8개 |
| `diagnose-*.ts` | 문제 진단 | ~5개 |
| `migrate-*.ts` | 데이터 마이그레이션 | ~3개 |
| 기타 | 유틸리티 | ~10개 |

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

### 루트 문서
| 파일 | 역할 |
|------|------|
| `README.md` | 프로젝트 소개 |
| `CLAUDE.md` | Claude Code 개발 가이드 (핵심) |

### docs/ 폴더 문서 (31개)
| 파일 | 역할 |
|------|------|
| `GUIDE_DEVELOPER.md` | 개발자 가이드 (이 문서) |
| `GUIDE_PLANNER.md` | 기획자/마케터 가이드 |
| `GUIDE_ARCHITECTURE.md` | 아키텍처 가이드 |
| `PROJECT_RULES.md` | 코드 작성 규칙 |
| `FRONTEND_STRUCTURE.md` | 프론트엔드 구조 |
| `BACKEND_STRUCTURE.md` | 백엔드 구조 |
| `COLOR_STRUCTURE.md` | 색상 팔레트 |
| `CRAWLING_PLAN.md` | 크롤러 계획 |
| `SECURITY.md` | 보안 가이드 |
| `MOBILE_*.md` | 모바일 관련 문서 (여러 개) |
| `BOOKMARK_*.md` | 북마크 관련 문서 (여러 개) |
| 기타 | 기능별 계획/디버그 문서 |

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

## 🗃️ Supabase 데이터베이스 테이블

> 실제 Supabase에서 사용 중인 테이블 목록입니다. (2025-12-09 기준)

### 📌 핵심 비즈니스 테이블

#### `job_postings` - 일자리 공고
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `organization` | text | YES | 기관명 |
| `title` | text | YES | 공고 제목 |
| `tags` | ARRAY | YES | 태그 배열 |
| `location` | text | YES | 위치 |
| `compensation` | text | YES | 급여 |
| `deadline` | text | YES | 마감일 |
| `work_period` | text | YES | 근무기간 |
| `work_time` | text | YES | 근무시간 |
| `contact` | text | YES | 연락처 |
| `detail_content` | text | YES | 상세내용 |
| `source_url` | text | YES | 원본 URL |
| `attachment_url` | text | YES | 첨부파일 URL |
| `attachment_path` | text | YES | 첨부파일 경로 |
| `is_urgent` | boolean | YES | 긴급 여부 |
| `school_level` | text | YES | 학교급 |
| `subject` | text | YES | 과목 |
| `required_license` | text | YES | 필수자격 |
| `structured_content` | jsonb | YES | 구조화된 내용 |
| `form_payload` | jsonb | YES | 폼 데이터 |
| `user_id` | uuid | YES | 작성자 |
| `search_vector` | tsvector | YES | FTS 벡터 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `talents` - 인재 풀
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `user_id` | uuid | YES | 연결된 유저 |
| `name` | text | NO | 이름 |
| `specialty` | text | NO | 전문분야 |
| `tags` | ARRAY | YES | 태그 |
| `location` | ARRAY | YES | 활동지역 |
| `experience_years` | integer | YES | 경력(년) |
| `phone` | text | YES | 전화번호 |
| `email` | text | YES | 이메일 |
| `license` | text | YES | 자격증 |
| `introduction` | text | YES | 자기소개 |
| `rating` | numeric | YES | 평점 |
| `review_count` | integer | YES | 리뷰 수 |
| `is_verified` | boolean | YES | 인증 여부 |
| `search_vector` | tsvector | YES | FTS 벡터 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `experiences` - 체험 프로그램
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `user_id` | uuid | YES | 작성자 |
| `program_title` | text | NO | 프로그램명 |
| `categories` | ARRAY | YES | 카테고리 |
| `target_school_levels` | ARRAY | YES | 대상 학교급 |
| `region_seoul` | ARRAY | YES | 서울 지역 |
| `region_gyeonggi` | ARRAY | YES | 경기 지역 |
| `location_summary` | text | YES | 위치 요약 |
| `operation_types` | ARRAY | YES | 운영 타입 |
| `capacity` | text | YES | 수용인원 |
| `introduction` | text | YES | 소개 |
| `contact_phone` | text | YES | 연락처 |
| `contact_email` | text | YES | 이메일 |
| `form_payload` | jsonb | YES | 폼 데이터 |
| `status` | text | YES | 상태 |
| `search_vector` | tsvector | YES | FTS 벡터 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `user_profiles` - 사용자 프로필
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK (auth.users FK) |
| `display_name` | text | YES | 표시 이름 |
| `roles` | ARRAY | YES | 역할 (교사/강사 등) |
| `interest_regions` | ARRAY | YES | 관심 지역 |
| `preferred_subjects` | ARRAY | YES | 선호 과목 |
| `preferred_job_types` | ARRAY | YES | 선호 직종 |
| `capable_subjects` | ARRAY | YES | 가능 과목 |
| `experience_years` | integer | YES | 경력(년) |
| `teacher_level` | text | YES | 교사 자격 |
| `profile_image_url` | text | YES | 프로필 이미지 |
| `is_admin` | boolean | YES | 관리자 여부 |
| `is_profile_complete` | boolean | YES | 프로필 완성 여부 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `bookmarks` - 북마크
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `user_id` | uuid | NO | 사용자 ID |
| `card_type` | text | NO | 카드 타입 (job/talent/experience) |
| `card_id` | uuid | NO | 카드 ID |
| `created_at` | timestamptz | YES | 생성일 |

---

### 💬 채팅 시스템

#### `chat_rooms` - 채팅방
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `name` | text | YES | 채팅방 이름 |
| `is_group` | boolean | YES | 그룹채팅 여부 |
| `last_message` | text | YES | 마지막 메시지 |
| `last_message_at` | timestamptz | YES | 마지막 메시지 시간 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `chat_participants` - 채팅 참가자
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `room_id` | uuid | NO | 채팅방 ID |
| `user_id` | uuid | NO | 참가자 ID |
| `joined_at` | timestamptz | YES | 참가일 |
| `last_read_at` | timestamptz | YES | 마지막 읽음 |

#### `chat_messages` - 채팅 메시지
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `room_id` | uuid | NO | 채팅방 ID |
| `sender_id` | uuid | NO | 발신자 ID |
| `content` | text | NO | 메시지 내용 |
| `is_read` | boolean | YES | 읽음 여부 |
| `created_at` | timestamptz | YES | 생성일 |

---

### 🕷️ 크롤러 시스템

#### `crawl_boards` - 크롤링 대상 게시판
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `name` | text | NO | 보드 이름 |
| `board_url` | text | NO | 게시판 URL |
| `category` | text | YES | 카테고리 |
| `description` | text | YES | 설명 |
| `is_active` | boolean | YES | 활성화 여부 |
| `status` | text | YES | 상태 (active/broken/blocked) |
| `crawl_config` | jsonb | YES | 크롤링 설정 |
| `crawl_batch_size` | integer | YES | 배치 크기 |
| `region_code` | text | YES | 지역 코드 |
| `subregion_code` | text | YES | 세부지역 코드 |
| `region_display_name` | text | YES | 지역 표시명 |
| `school_level` | text | YES | 학교급 |
| `last_crawled_at` | timestamptz | YES | 마지막 크롤링 |
| `last_success_at` | timestamptz | YES | 마지막 성공 |
| `error_count` | integer | YES | 에러 카운트 |
| `error_message` | text | YES | 에러 메시지 |
| `approved_at` | timestamptz | YES | 승인일 |
| `approved_by` | uuid | YES | 승인자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `crawl_logs` - 크롤링 로그
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `board_id` | uuid | YES | 보드 ID |
| `status` | text | YES | 상태 (pending/running/success/failed) |
| `started_at` | timestamptz | YES | 시작 시간 |
| `completed_at` | timestamptz | YES | 완료 시간 |
| `items_found` | integer | YES | 발견 건수 |
| `items_new` | integer | YES | 신규 건수 |
| `items_skipped` | integer | YES | 스킵 건수 |
| `ai_tokens_used` | integer | YES | AI 토큰 사용량 |
| `error_log` | text | YES | 에러 로그 |
| `created_at` | timestamptz | YES | 생성일 |

#### `crawl_sources` - 크롤러 소스 코드
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `board_id` | uuid | YES | 보드 ID |
| `source_code` | text | YES | 소스 코드 |
| `version` | integer | YES | 버전 |
| `is_active` | boolean | YES | 활성화 여부 |
| `generated_by` | text | YES | 생성자 |
| `created_at` | timestamptz | YES | 생성일 |

---

### 🎨 프로모션/배너 시스템

#### `promo_cards` - 프로모 카드
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `collection_id` | uuid | YES | 컬렉션 ID |
| `is_active` | boolean | YES | 활성화 |
| `headline` | text | YES | 헤드라인 |
| `image_url` | text | YES | 이미지 URL |
| `insert_position` | integer | YES | 삽입 위치 |
| `background_color` | text | YES | 배경색 |
| `background_color_mode` | text | YES | 배경 모드 |
| `background_gradient_start` | text | YES | 그라데이션 시작 |
| `background_gradient_end` | text | YES | 그라데이션 끝 |
| `font_color` | text | YES | 폰트 색상 |
| `font_size` | integer | YES | 폰트 크기 |
| `badge_color` | text | YES | 배지 색상 |
| `badge_color_mode` | text | YES | 배지 모드 |
| `badge_gradient_start` | text | YES | 배지 그라데이션 시작 |
| `badge_gradient_end` | text | YES | 배지 그라데이션 끝 |
| `image_scale` | numeric | YES | 이미지 스케일 |
| `auto_play` | boolean | YES | 자동 재생 |
| `duration` | integer | YES | 지속 시간 |
| `last_draft_at` | timestamptz | YES | 마지막 임시저장 |
| `last_applied_at` | timestamptz | YES | 마지막 적용 |
| `updated_by` | uuid | YES | 수정자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `promo_card_collections` - 프로모 카드 컬렉션
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `name` | text | YES | 컬렉션명 |
| `description` | text | YES | 설명 |
| `is_active` | boolean | YES | 활성화 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `stripe_banners` - 스트라이프 배너
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `type` | text | YES | 타입 (event/notice/review) |
| `title` | text | NO | 제목 |
| `description` | text | YES | 설명 |
| `link` | text | YES | 링크 |
| `bg_color` | text | YES | 배경색 |
| `bg_color_mode` | text | YES | 배경 모드 |
| `bg_gradient_start` | text | YES | 그라데이션 시작 |
| `bg_gradient_end` | text | YES | 그라데이션 끝 |
| `text_color` | text | YES | 텍스트 색상 |
| `display_order` | integer | YES | 표시 순서 |
| `is_active` | boolean | YES | 활성화 |
| `updated_by` | uuid | YES | 수정자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `stripe_banner_config` - 배너 설정
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `is_active` | boolean | YES | 활성화 |
| `rotation_speed` | integer | YES | 회전 속도 |
| `stats_mode` | text | YES | 통계 모드 |
| `keywords_mode` | text | YES | 키워드 모드 |
| `updated_by` | uuid | YES | 수정자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `stripe_statistics` - 스트라이프 통계
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `new_jobs_count` | integer | YES | 새 일자리 수 |
| `urgent_jobs_count` | integer | YES | 긴급 일자리 수 |
| `new_talents_count` | integer | YES | 새 인재 수 |
| `stats_date` | date | YES | 통계 날짜 |
| `updated_by` | uuid | YES | 수정자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `popular_keywords` - 인기 검색어
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `keyword` | text | NO | 키워드 |
| `display_order` | integer | YES | 표시 순서 |
| `is_active` | boolean | YES | 활성화 |
| `is_manual` | boolean | YES | 수동 설정 여부 |
| `search_count` | integer | YES | 검색 횟수 |
| `updated_by` | uuid | YES | 수정자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

---

### 🤖 AI/추천 시스템

#### `recommendations_cache` - AI 추천 캐시
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `user_id` | uuid | NO | PK (사용자 ID) |
| `cards` | jsonb | YES | 추천 카드 목록 |
| `ai_comment` | jsonb | YES | AI 코멘트 |
| `profile_snapshot` | jsonb | YES | 프로필 스냅샷 |
| `card_source_hash` | text | YES | 카드 소스 해시 |
| `generated_at` | timestamptz | YES | 생성 시간 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

---

### 👨‍💻 개발팀 협업

#### `dev_projects` - 개발 프로젝트
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `name` | text | NO | 프로젝트명 |
| `description` | text | YES | 설명 |
| `status` | text | YES | 상태 |
| `owner_id` | uuid | YES | 소유자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `dev_ideas` - 아이디어
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `project_id` | uuid | YES | 프로젝트 ID |
| `title` | text | NO | 제목 |
| `description` | text | YES | 설명 |
| `category` | text | YES | 카테고리 |
| `status` | text | YES | 상태 |
| `author_id` | uuid | YES | 작성자 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `dev_board_submissions` - 보드 제출
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `board_name` | text | NO | 보드명 |
| `board_url` | text | NO | 보드 URL |
| `region_code` | text | YES | 지역 코드 |
| `subregion_code` | text | YES | 세부지역 코드 |
| `school_level` | text | YES | 학교급 |
| `status` | text | YES | 상태 |
| `submitted_by` | uuid | YES | 제출자 |
| `reviewed_by` | uuid | YES | 검토자 |
| `review_note` | text | YES | 검토 노트 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `dev_comments` - 댓글
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `target_type` | text | NO | 대상 타입 |
| `target_id` | uuid | NO | 대상 ID |
| `content` | text | NO | 내용 |
| `author_id` | uuid | YES | 작성자 |
| `parent_id` | uuid | YES | 부모 댓글 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

#### `dev_comment_authors` - 댓글 작성자
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `display_name` | text | YES | 표시 이름 |
| `avatar_url` | text | YES | 아바타 URL |
| `created_at` | timestamptz | YES | 생성일 |

---

### 📊 시스템 로그

#### `search_logs` - 검색 로그
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `user_id` | uuid | YES | 사용자 ID |
| `query` | text | YES | 검색어 |
| `filters` | jsonb | YES | 필터 조건 |
| `result_count` | integer | YES | 결과 수 |
| `created_at` | timestamptz | YES | 생성일 |

#### `error_logs` - 에러 로그
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `error_type` | text | YES | 에러 타입 |
| `error_message` | text | YES | 에러 메시지 |
| `stack_trace` | text | YES | 스택 트레이스 |
| `user_id` | uuid | YES | 사용자 ID |
| `url` | text | YES | URL |
| `metadata` | jsonb | YES | 메타데이터 |
| `created_at` | timestamptz | YES | 생성일 |

#### `github_deployments` - GitHub 배포
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `deployment_id` | bigint | YES | GitHub 배포 ID |
| `environment` | text | YES | 환경 |
| `status` | text | YES | 상태 |
| `commit_sha` | text | YES | 커밋 SHA |
| `commit_message` | text | YES | 커밋 메시지 |
| `author` | text | YES | 작성자 |
| `deployed_at` | timestamptz | YES | 배포 시간 |
| `created_at` | timestamptz | YES | 생성일 |

---

### ⚙️ 기타

#### `regions` - 지역 마스터
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `code` | text | NO | PK (지역 코드) |
| `name` | text | NO | 지역명 |
| `level` | text | YES | 레벨 (province/city/district) |
| `parent_code` | text | YES | 부모 코드 |
| `display_order` | integer | YES | 표시 순서 |
| `created_at` | timestamptz | YES | 생성일 |

#### `help_settings` - 도움말 설정
| 컬럼 | 타입 | Nullable | 설명 |
|------|------|----------|------|
| `id` | uuid | NO | PK |
| `user_id` | uuid | YES | 사용자 ID |
| `show_tour` | boolean | YES | 투어 표시 여부 |
| `show_tooltips` | boolean | YES | 툴팁 표시 여부 |
| `created_at` | timestamptz | YES | 생성일 |
| `updated_at` | timestamptz | YES | 수정일 |

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

*마지막 업데이트: 2025-12-09*

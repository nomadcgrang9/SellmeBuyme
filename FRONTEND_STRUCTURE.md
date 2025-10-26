# 셀미바이미 (SellmeBuyme) UI 구조 설계

## 🔄 최근 변경사항 (2025-01-18)
- **프레임워크 전환**: Next.js → Vite + React
- **배포 플랫폼**: Vercel → Cloudflare Pages
- **프로젝트 구조**: `app/` → `src/` 기반 구조로 변경
- **Supabase 클라이언트**: SSR 제거, 클라이언트 전용으로 단순화
- **환경 변수**: `NEXT_PUBLIC_` → `VITE_` 접두사로 변경
- **빌드 명령어**: `next build` → `vite build` (출력: `dist/`)
- **디버깅 코드 정리**: AIRecommendations.tsx의 레이아웃 디버깅 코드 제거
- **구버전 컴포넌트 삭제**: SelvaAISection.tsx 제거 (AIRecommendations.tsx로 통합)

### 추가 업데이트 (2025-10-21)
- **로그인 버튼 동작**: `Header.tsx`의 `로그인` 버튼이 `SocialSignupModal`을 로그인 모드로 열어 구글 OAuth를 즉시 호출하고, 인증 후 `/auth/callback`으로 리다이렉트.
- **프로필 모달 조건**: `App.tsx`가 인증 완료 후 `fetchUserProfile()`을 호출해 신규 회원만 `ProfileSetupModal`을 띄우고, 기존 회원은 바로 프로필 버튼을 사용할 수 있도록 변경.
- **프로필 보기 모달 안정화**: `ProfileViewModal.tsx`가 동일한 `user_profiles` 데이터를 사용해 로그인 상태에서 항상 일관된 프로필 정보를 표시.

### 추가 업데이트 (2025-10-18)
- **검색 스토어 연동**: `Header.tsx`가 Zustand 스토어를 통해 검색어·필터·토글을 즉시 반영하고, 입력 디바운스 및 Enter 키 검색을 지원하도록 개선.
- **무한 스크롤 전환**: `App.tsx`에 `IntersectionObserver` 기반 페이징을 도입해 “더 보기” 버튼 없이 자동 로딩 및 마지막 페이지 안내 UI를 제공.
- **로딩 상태 개선**: 검색 결과가 없거나 추가 로딩 중인 상태를 구분해 `CardGrid` 하단에 별도 메시지·로딩 문구를 표시.

### UI 개선 (2025-10-18)
- **상세보기 모달**: 단일 스크롤 레이아웃으로 개선, 헤더 압축(2줄), 문의 정보를 정보 그리드에 통합
- **카드 호버**: absolute 포지셔닝으로 확장 영역 구현, 테두리/모서리 연결로 시각적 통합
- **첨부 다운로드 흐름**: 카드 호버 슬라이드에서는 `원문링크`·`상세보기` 버튼만 유지하고, `공고문 다운로드`는 `JobDetailModal` 내 버튼으로 일원화.
- **Supabase 환경 변수**: `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가하여 Vite 런타임에서 `src/lib/supabase/client.ts` 초기화 보장.

### 추가 업데이트 (2025-10-19)
- **첨부 다운로드 안정화**: `JobDetailModal`의 `공고문 다운로드` 버튼이 Supabase Edge Function 경유 URL(`attachment_url`)을 사용하도록 문서화. 마이그레이션 이후 다운로드 파일명이 `"<학교명> 공고문.hwp"` 형식으로 일관되게 노출됨.
- **크롤러 상태 표시 계획**: 관리자 UI에서 게시판별 `crawl_batch_size` 및 최근 토큰 사용량 요약을 노출할 준비를 위해 크롤링 메타데이터 섹션 추가 예정.

### 추가 업데이트 (2025-10-20)
- **AI 추천 섹션 실데이터 연동**: `App.tsx`에서 더미 `aiRecommendations`를 제거하고 `fetchRecommendationsCache()` 결과를 `AIRecommendations`로 전달.
- **AIRecommendations 확장**: 빈 상태·로딩 상태·헤드라인/설명 오버라이드를 props로 받아, 캐시가 없으면 자리 표시 카드와 안내 문구를 표시하도록 개선.
- **프로모 카드 유지**: 추천 카드가 비어 있어도 광고용 프로모 카드가 항상 캐러셀 마지막에 노출되도록 조정.

### 추가 업데이트 (2025-10-23)
- **공고 카드 하단 구조 정리**: `JobCard.tsx`에서 태그 섹션 여백 제거 및 정보 블록 `mt-auto`를 `mt-3`로 조정해 태그·기본 정보 간 간격을 압축.
- **호버 확장 레이아웃 재정렬**: 카드 확장 영역을 `top-full` 기준으로 배치하고 초기 `translate` 값을 줄여 본체와 연결된 상태에서 자연스럽게 확장되도록 개선.
- **프로필 초기 모달 정리**: `App.tsx`에서 `ProfileAwarenessModal`을 제거하고 신규 사용자는 즉시 `ProfileSetupModal`만 보도록 단순화.
- **프로필 사진 유지 및 업로드 개선**: `ProfileSetupModal.tsx`와 `ProfileStep1Basic.tsx`가 Supabase Storage(`profiles` 버킷)에 이미지를 업로드하고, edit 모드에서도 기존 URL을 미리보기로 표시하도록 상태 구조를 업데이트.
- **프로필 보기 모달 확장**: `ProfileViewModal.tsx`에서 저장된 교사·강사 상세 필드와 업로드된 프로필 이미지를 렌더링해 편집 시 데이터가 일관되게 노출되도록 조정.

### 추가 업데이트 (2025-10-24)
- **검색 토큰 그룹화**: `src/lib/supabase/queries.ts`가 `TokenGroup` 기반으로 검색어를 확장해 `중등 → [중등, 중학교, 고등학교]` 식의 동의어 묶음을 유지하도록 개선.
- **FTS + ILIKE 동작 안정화**: 동일 파일에서 FTS 표현식과 ILIKE 조건을 통합해 `성남 중학교`, `의정부 고등학교`처럼 접미사 `학교`가 포함된 검색도 일관되게 결과가 노출되도록 수정.
- **결과 후처리 강화**: `filterJobsByTokenGroups()`와 `filterTalentsByTokenGroups()`가 모든 토큰 그룹에서 최소 1개 키워드가 매칭되도록 보장해, 확장된 동의어가 카드 정렬과 추천 점수에 반영되도록 조정.

### 추가 업데이트 (2025-10-25)
- **띠지배너 시스템 통합**: `AIInsightBox.tsx`가 `stripe_banner_config`에서 통계 모드(`auto`/`manual`)를 조회해, `auto` 모드는 실시간 집계(`getAutoStatistics()`), `manual` 모드는 DB 저장값(`getTodayStripeStatistics()`)을 표시.
- **관리자 UI 개선**: `StripeBannerManager.tsx`에서 배너·통계·키워드를 로컬 상태로 수정 후 통합 저장 버튼으로 일괄 저장하여 한글 입력 깨짐 문제 해결. `loadAutoStats()` 호출 시 Toast 알림으로 새로고침 피드백 제공.
- **UI 정리**: 메인 페이지에서 배너 타입 표시 제거(관리자 전용 정보), 통계 폰트 크기를 `text-xs` → `text-sm`(1.2배)으로 확대, 2줄 구조로 간소화.

### 추가 업데이트 (2025-10-26)
- **띠지배너 그라데이션 지원**: `StripeBannerManager.tsx`에 배경 색상 모드 전환(`single`/`gradient`) 및 그라데이션 시작/종료 색상 선택 UI 추가.
- **띠지배너 렌더링 개선**: `AIInsightBox.tsx`에서 `bgColorMode`에 따라 단색(`backgroundColor`) 또는 그라데이션(`linear-gradient`) 배경 동적 적용.

## 📋 목차
1. [페이지 레이아웃 구조](#페이지-레이아웃-구조)
2. [1. 헤더 (Header)](#1-헤더-header)
3. [2. AI 섹션 (AI Section)](#2-ai-섹션-ai-section)
4. [3. 띠지 배너 (Info Banner)](#3-띠지-배너-info-banner)
5. [4. 하단 카드 리스트 (Main Card List)](#4-하단-카드-리스트-main-card-list)
6. [공통 카드 컴포넌트 구조](#공통-카드-컴포넌트-구조)
7. [AI 메시지 톤 가이드](#ai-메시지-톤-가이드)
8. [반응형 디자인](#반응형-디자인)

---

## 페이지 레이아웃 구조

### 전체 구성 (4개 주요 영역)

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [1] HEADER (헤더 영역 - 고정)                                                                                             ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                                            ┃
┃   ┌────────────────┐                                                                                                       ┃
┃   │                │                                                                                                       ┃
┃   │  셀미바이미     │                                                                                                       ┃
┃   │   SellmeBuyme  │                                                                                                       ┃
┃   │                │                                                                                                       ┃
┃   │  [로고 이미지]  │                                                                                                       ┃
┃   │                │                                                                                                       ┃
┃   └────────────────┘                                                                                                       ┃
┃   ┌──────┬──────┐                                                                                                          ┃
┃   │ 공고만│인력풀만│  ← 전환버튼 (로고 바로 아래 작게 붙음)                                                                   ┃
┃   │ 보기 │ 보기  │                                                                                                          ┃
┃   └──────┴──────┘                                                                                                          ┃
┃                                                                                                                            ┃
┃                                                                                                                            ┃
┃                          ┌───────────────────────────────────────────────────────────────┐                                 ┃
┃                          │  🤖 AI 검색:  "수원 코딩강사 구해요"                            │                                 ┃
┃                          └───────────────────────────────────────────────────────────────┘                                 ┃
┃                                                                                                                            ┃
┃                          지역: [전체 ▼]    분야: [전체 ▼]    정렬: [AI 추천순 ▼]                                            ┃
┃                                                                                                                            ┃
┃                                                                                                                            ┃
┃                                                      ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐              ┃
┃                                                      │  + 공고 등록  │  │  + 인력 등록  │  │  로그인/프로필   │              ┃
┃                                                      └──────────────┘  └──────────────┘  └─────────────────┘              ┃
┃                                                                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [2] AI SECTION (AI 섹션 - 셀바 AI)                                                                                        ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                                            ┃
┃   ✨ 셀바AI가 OO님을 위해 골라봤어요!                                                                                        ┃
┃                                                                                                                            ┃
┃                                                                                                                            ┃
┃   <   ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐   >             ┃
┃       │ 🔥 긴급               │  │ 🏢 공고              │  │ 🧑‍🏫 인력풀            │  │ 🏢 공고              │                 ┃
┃       │                     │  │                     │  │                     │  │                     │                 ┃
┃       │ 수원 OO초            │  │ 용인 XX중            │  │ 김OO 강사            │  │ 성남 △△초            │                 ┃
┃       │ 대체교사 긴급 모집    │  │ 코딩 방과후 강사     │  │ 초등 과학실험 전문   │  │ 영어 원어민 보조     │                 ┃
┃       │                     │  │                     │  │                     │  │                     │                 ┃
┃       │ #초등전학년          │  │ #파이썬 #AI         │  │ #STEAM #영재교육    │  │ #회화 #TEE          │                 ┃
┃       │                     │  │                     │  │                     │  │                     │                 ┃
┃       │ 📍 수원              │  │ 📍 용인              │  │ 📍 수원/용인/화성    │  │ 📍 성남              │                 ┃
┃       │ ⏰ D-1 내일 마감!    │  │ ⏰ ~ 10.25          │  │ ⭐ 4.9 (23명 평가)  │  │ ⏰ ~ 11.05          │                 ┃
┃       │                     │  │                     │  │                     │  │                     │                 ┃
┃       └─────────────────────┘  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘                 ┃
┃                                                                                                                            ┃
┃   * 좌우 끝에 < > 버튼으로 슬라이드 제어                                                                                     ┃
┃   * 마우스 드래그 또는 터치 스와이프 가능                                                                                    ┃
┃                                                                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [3] INFO BANNER (띠지 배너)                                                                                               ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                                            ┃
┃   [좌측 띠지 - 50%]                                    [우측 배너 - 50%]                                                     ┃
┃   📊 오늘 신규 공고 23건 · ⏰ 마감임박 5건             🎉 이벤트: 신규 회원 가입 프리미엄 1개월 무료!                          ┃
┃   👥 신규 인력 12명 등록                               📢 공지: 시스템 점검 안내 10/20 02:00-04:00                           ┃
┃   인기: #코딩강사 #영어강사 #방과후 #수원 #성남         ⭐ 후기: 3일 만에 강사 구했어요!                                        ┃
┃                                                                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [4] MAIN CARD LIST (하단 카드 리스트)                                                                                      ┃
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┫
┃                                                                                                                            ┃
┃   ┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐   ┃
┃   │  💬 셀바AI가 찾아봤어요!                                                                                            │   ┃
┃   ├────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   ┃
┃   │                                                                                                                    │   ┃
┃   │  수원 및 인근 지역에서 코딩 관련 분야, 방과후 강사 중심으로 검색했을 때                                              │   ┃
┃   │  **23개의 결과**가 있었어요! 😊                                                                                     │   ┃
┃   │                                                                                                                    │   ┃
┃   │  그중에서도 **1번째 카드**에 있는 분이 만족도가 높다는 결과가 있어요!                                                │   ┃
┃   │                                                                                                                    │   ┃
┃   │  💡 원하는 결과가 없으신가요? 위의 '지역'이나 '분야' 필터를 조정해 보세요!                                          │   ┃
┃   │                                                                                                                    │   ┃
┃   └────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘   ┃
┃                                                                                                                            ┃
┃                                                                                                                            ┃
┃   ┌────────────────────────────┐  ┌────────────────────────────┐  ┌────────────────────────────┐                          ┃
┃   │ 🏢 공고                     │  │ 🧑‍🏫 인력풀  |  ⭐ 인증됨      │  │ 🏢 공고                     │                          ┃
┃   ├────────────────────────────┤  ├────────────────────────────┤  ├────────────────────────────┤                          ┃
┃   │                            │  │                            │  │                            │                          ┃
┃   │ 수원 OO초등학교             │  │ 이OO 강사님                 │  │ 용인 XX중학교               │                          ┃
┃   │                            │  │                            │  │                            │                          ┃
┃   │ 코딩 방과후 강사 모집        │  │ 파이썬/AI 교육 전문          │  │ AI 코딩 교육 강사 모집       │                          ┃
┃   │                            │  │                            │  │                            │                          ┃
┃   │ #파이썬 #스크래치 #초등      │  │ #파이썬 #머신러닝           │  │ #인공지능 #파이썬 #중등      │                          ┃
┃   │                            │  │ #초등코딩 #중등코딩         │  │                            │                          ┃
┃   │                            │  │                            │  │                            │                          ┃
┃   │ 📍 수원 영통구              │  │ 📍 수원/용인/화성           │  │ 📍 용인 수지구              │                          ┃
┃   │ 💰 시급 30,000원           │  │ 💼 경력 6년                │  │ 💰 시급 35,000원           │                          ┃
┃   │ ⏰ ~ 10.25 (D-9)          │  │ ⭐ 4.9 (18명이 평가)       │  │ ⏰ ~ 10.30 (D-14)          │                          ┃
┃   │                            │  │                            │  │                            │                          ┃
┃   └────────────────────────────┘  └────────────────────────────┘  └────────────────────────────┘                          ┃
┃                                                                                                                            ┃
┃                                          ⋮                                                                                 ┃
┃                                   (무한 스크롤)                                                                             ┃
┃                                                                                                                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## 1. 헤더 (Header)

### 명칭
- **컴포넌트**: `<Header />`
- **파일**: `src/components/layout/Header.tsx`
- **역할**: 전역 네비게이션 및 검색 인터페이스

### 구성 요소 (5개 하위 영역)

#### 1.1 로고 영역 (Logo Area)
- **명칭**: `<Logo />`
   - 위치: 좌측 상단
   - 내용: "셀미바이미 (SellmeBuyme)" 브랜드 로고
   - 기능: 클릭 시 홈으로 이동

#### 1.2 전환 토글 (View Toggle)
- **명칭**: `<ViewToggle />`
   - 위치: 로고 바로 아래
   - 형태: 탭 형식 (공고만 보기 | 인력풀만 보기)
   - 동작:
     - 기본: 전체 표시 (둘 다 비활성)
     - 클릭: 해당 타입만 필터링
     - 재클릭: 토글 해제

#### 1.3 검색창 (Search Bar)
- **명칭**: `<SearchBar />`
   - 위치: 헤더 중앙
   - 플레이스홀더: "🤖 AI 검색: 원하는 공고나 인력을 검색해 보세요"
   - 기능: 자연어 검색 지원

#### 1.4 필터 바 (Filter Bar)
- **명칭**: `<FilterBar />`
   - 위치: 검색창 바로 아래
   - 구성: 지역 / 분야 / 정렬 드롭다운
   - 동작:
     - 미선택 시: AI가 자연어 해석
     - 선택 시: 선택 조건 우선 적용

#### 1.5 로그인 버튼 (Auth Button)
- **명칭**: `<AuthButton />`
   - 위치: 우측 상단
   - 구성:
     - `+ 공고 등록`: 학교/기관용
     - `+ 인력 등록`: 강사/교사용
     - `로그인/프로필`: 사용자 계정

### 스타일 가이드

```css
/* 헤더 고정 */
position: sticky;
top: 0;
z-index: 100;
background: white;
box-shadow: 0 2px 8px rgba(0,0,0,0.1);

/* 전환 버튼 */
.toggle-button {
  font-size: 14px;
  padding: 6px 12px;
  border: 1px solid #e0e0e0;
  background: white;
}

.toggle-button.active {
  background: #4285f4;
  color: white;
  border-color: #4285f4;
}
```

---

## 2. AI 섹션 (AI Section)

### 명칭
- **컴포넌트**: `<AIRecommendations />`
- **파일**: `src/components/ai/AIRecommendations.tsx`
- **역할**: 개인화 추천 카드 슬라이더

### 구성 요소 (2개 하위 영역)

#### 2.1 AI 코멘트 패널 (AI Comment Panel)
- **명칭**: `<AICommentPanel />`
- **위치**: 좌측 고정 영역 (모바일에서는 상단)
- **크기**: `lg:w-[300px] lg:h-[260px]` (모바일 최소 높이 `200px`)
- **내용**:
  - **헤더**: "AI 코멘트" 라벨 + 아이콘
  - **메시지**: `headline`(굵은 제목) + `description`(단락)로 한 문단 구성
  - **CTA 그리드**: 공고 / 인력 / 체험 3개의 버튼이 가로 한 줄로 배치, 각 버튼은 두 줄 텍스트(예: 첫 줄 "공고", 둘째 줄 "등록"), 아이콘 없이 색상으로 구분

#### 2.2 AI 추천 카드 슬라이더 (Recommendation Slider)
- **명칭**: `<RecommendationSlider />`
- **위치**: 우측 확장 영역
- **표시 개수**: 3장 (데스크톱 기준)
- **카드 타입**: `<CompactJobCard />` 또는 `<CompactTalentCard />`
- **레이아웃**:
  - 전체 높이 `lg:h-[260px]`, 카드 컨테이너는 `h-[210px]`로 축소하여 패널과 균형 유지
  - 카드 간격 `gap-2.5`, 최대 폭 `lg:max-w-[760px]`로 조정
  - 카드 내부 텍스트는 `line-clamp`와 축소된 패딩을 사용해 겹침 방지
- **인터랙션**:
  - 좌우 화살표 버튼 (`<` `>`)
  - 키보드 화살표 지원
  - 슬라이드 애니메이션 (300ms ease-in-out)

### 슬라이드 동작

```typescript
interface SlideControl {
  currentIndex: number;
  totalCards: number;
  visibleCount: number;  // 화면 크기에 따라 변경
  
  canGoLeft: boolean;    // currentIndex > 0
  canGoRight: boolean;   // currentIndex < totalCards - visibleCount
  
  onPrev(): void;        // currentIndex--
  onNext(): void;        // currentIndex++
}
```

---

## 3. 띠지 배너 (Info Banner)

### 명칭
- **컴포넌트**: `<AIInsightBox />`
- **파일**: `src/components/ai/AIInsightBox.tsx`
- **역할**: 실시간 통계 + 관리자 배너 슬라이더

### 구성 요소 (2개 하위 영역)

#### 3.1 좌측 띠지 (Left Info Strip)
- **명칭**: `<InfoStrip />`
- **비율**: 50%
- **내용**:
  - **실시간 통계**: 오늘 신규 공고 N건 · 마감임박 N건 · 신규 인력 N명
  - **인기 태그**: #코딩강사 #영어강사 #방과후 #수원 #성남

#### 3.2 우측 배너 (Right Banner Slider)
- **명칭**: `<BannerSlider />`
- **비율**: 50%
- **내용**: 관리자 페이지에서 등록한 광고/공지/후기
- **타입**:
  - `event`: 이벤트 (주황 그라데이션)
  - `notice`: 공지사항 (파랑 그라데이션)
  - `review`: 후기 (초록 그라데이션)
- **자동 슬라이드**: 3초 간격

---

## 4. 하단 카드 리스트 (Main Card List)

### 명칭
- **컴포넌트**: `<CardGrid />`
- **파일**: `src/components/cards/CardGrid.tsx`
- **역할**: 전체 공고/인력풀 카드 그리드

### AI 검색 결과 박스

**친근한 대화체 메시지 형식**:

```
💬 셀바AI가 찾아봤어요!

[지역] 및 인근 지역에서 [분야] 관련 분야, [유형] 중심으로 검색했을 때
**[N]개의 결과**가 있었어요! 😊

그중에서도 **[순서]번째 카드**에 있는 분이 만족도가 높다는 결과가 있어요!

💡 원하는 결과가 없으신가요? 위의 '지역'이나 '분야' 필터를 조정해 보세요!
```

### 카드 그리드 레이아웃

- **데스크톱**: 3열 그리드
- **태블릿**: 2열 그리드
- **모바일**: 1열 리스트
- **스크롤**: 무한 스크롤 (Intersection Observer)

---

## 공통 카드 컴포넌트 구조

### 개요
- AI 섹션의 `CompactJobCard` / `CompactTalentCard`와 하단 리스트의 `JobCard` / `TalentCard`는 **동일한 구조**를 공유합니다.
- 차이점: AI 섹션 카드는 높이 `240px` 고정, 하단 카드도 동일 높이 적용

### 카드 공통 구조 (6개 영역)

```
┌─────────────────────────────────┐
│ [1] 상단 띠지 (Top Banner)       │  ← 0.5px 높이 그라데이션
├─────────────────────────────────┤
│ [2] 헤더 영역 (Header)           │  ← 공고/인력풀 라벨 + 긴급/인증 배지
├─────────────────────────────────┤
│ [3] 제목 타이틀 (Title)          │  ← 기관명 또는 강사명
├─────────────────────────────────┤
│ [4] 부제목 (Subtitle)            │  ← 공고 제목 또는 전문 분야
├─────────────────────────────────┤
│ [5] 태그 영역 (Tags)             │  ← 최대 2개 태그 (회색 아웃라인)
├─────────────────────────────────┤
│ [6] 정보 영역 (Info)             │  ← 지역/비용/일정 (공고)
│                                 │     지역/경력/별점 (인력풀)
└─────────────────────────────────┘
```

---

### 공고 카드 (Job Card)

```typescript
interface JobPostingCard {
  type: 'job';
  isUrgent?: boolean;           // 🔥 긴급 표시
  
  organization: string;         // "수원 OO초등학교"
  title: string;                // "코딩 방과후 강사 모집"
  tags: string[];               // ["파이썬", "스크래치", "초등"]
  
  location: string;             // "수원 영통구"
  compensation: string;         // "시급 30,000원"
  deadline: string;             // "~ 10.25 (D-9)"
}
```

#### 영역별 상세 구조

**[1] 상단 띠지**:
- 높이: `0.5px`
- 색상: `bg-gradient-to-r from-primary to-blue-600`

**[2] 헤더 영역**:
- 라벨: "공고" (`text-primary`)
- 긴급 배지: `🔥 긴급` (빨강 배경, 우측 정렬)

**[3] 제목 타이틀**:
- 내용: 기관명 (예: "수원 ○○초등학교")
- 스타일: `text-lg font-extrabold text-gray-900`

**[4] 부제목**:
- 내용: 공고 제목 (예: "코딩 방과후 강사 모집")
- 스타일: `text-base font-semibold text-gray-700`

**[5] 태그 영역**:
- 개수: 최대 2개
- 스타일: `border border-gray-200 bg-white text-gray-700 font-medium`

**[6] 정보 영역** (`mt-auto`로 하단 고정):
- 📍 지역: `text-sm font-medium`
- 💰 비용: `text-sm font-medium text-gray-900`
- ⏰ 일정: `text-sm font-medium` + D-day 배지

### 인력풀 카드 (Talent Card)

```typescript
interface TalentCard {
  type: 'talent';
  isVerified: boolean;          // ⭐ 인증됨 표시
  
  name: string;                 // "이OO 강사님"
  specialty: string;            // "파이썬/AI 교육 전문"
  tags: string[];               // ["파이썬", "머신러닝"]
  
  location: string;             // "수원/용인/화성"
  experience: string;           // "경력 6년"
  rating: number;               // 4.9
  reviewCount: number;          // 18
}
```

#### 영역별 상세 구조

**[1] 상단 띠지**:
- 높이: `0.5px`
- 색상: `bg-gradient-to-r from-green-500 to-emerald-600`

**[2] 헤더 영역**:
- 라벨: "인력풀" (`text-emerald-600`)
- 인증 배지: `✓ 인증` (초록 배경, 우측 정렬)

**[3] 제목 타이틀**:
- 내용: 강사명 (예: "김○○ 강사")
- 스타일: `text-lg font-extrabold text-gray-900`
- 특수 처리: `break-keep overflow-hidden` (텍스트 깨짐 방지)

**[4] 부제목**:
- 내용: 전문 분야 (예: "초등 과학실험 전문")
- 스타일: `text-base font-semibold text-gray-700`

**[5] 태그 영역**:
- 개수: 최대 2개
- 스타일: `border border-gray-200 bg-white text-gray-700 font-medium`

**[6] 정보 영역** (`mt-auto`로 하단 고정):
- 📍 지역: `text-sm font-medium`
- 💼 경력: `text-sm font-medium text-gray-900`
- ⭐ 별점: `text-sm font-medium text-gray-900` + 리뷰 수

### 제거된 요소

❌ **삭제된 정보**:
- `[크롤링: OO교육청]` - 기술적 출처
- `[AI 매칭률 XX%]` - 내부 지표
- `[매칭률 XX%]` - 모든 매칭 관련 표시

---

## AI 메시지 톤 가이드

### 기본 원칙

1. **친근하고 대화체**: "~했어요", "~해 보세요"
2. **이모지 활용**: 😊 💡 🔥 등으로 감정 전달
3. **구체적 안내**: 숫자와 위치 명시
4. **긍정적 톤**: 결과 없을 때도 대안 제시

### 메시지 패턴

#### 검색 결과 표시
```
[지역]에서 [분야] 관련, [유형] 중심으로 검색했을 때 
[N]개의 결과가 있었어요! 😊
```

#### 추천 강조
```
그중에서도 [순서]번째 카드에 있는 분이 
[특징]이라는 결과가 있어요!
```

#### 빈 결과
```
아쉽게도 '[검색어]'에 딱 맞는 결과를 찾지 못했어요 😢
하지만 비슷한 결과 [N]개를 찾았어요!
```

#### 필터 제안
```
💡 원하는 결과가 없으신가요? 
위의 '지역'이나 '분야' 필터를 조정해 보세요!
```

#### 로딩 상태
```
💬 셀바AI가 열심히 찾고 있어요!

🔄 잠시만 기다려 주세요...

25개 교육청 게시판을 확인 중이에요!
```

#### 첫 방문
```
💬 셀바AI가 인사드려요!

처음 오셨군요! 반가워요 😊

위 검색창에 원하는 강사나 공고를 입력하면
경기도 전체 교육청 공고를 한 번에 찾아드려요!

예) "수원 코딩강사", "용인 대체교사"
```

---

## 반응형 디자인

### 브레이크포인트

```css
/* 데스크톱 */
@media (min-width: 1200px) {
  .ai-recommendations { grid-template-columns: repeat(4, 1fr); }
  .card-grid { grid-template-columns: repeat(3, 1fr); }
}

/* 태블릿 */
@media (min-width: 768px) and (max-width: 1199px) {
  .ai-recommendations { grid-template-columns: repeat(3, 1fr); }
  .card-grid { grid-template-columns: repeat(2, 1fr); }
}

/* 모바일 */
@media (max-width: 767px) {
  .ai-recommendations { grid-template-columns: 1fr; }
  .card-grid { grid-template-columns: 1fr; }
  
  /* AI 메시지 박스 폰트 축소 */
  .ai-message { font-size: 14px; padding: 16px; }
}
```

### 모바일 최적화

- **슬라이드**: 스와이프 제스처 우선
- **카드**: 리스트 형태로 세로 배치
- **필터**: 아코디언 또는 바텀시트
- **검색창**: 전체 너비 사용

---

## 색상 시스템

### 타입별 색상

```css
/* 공고 카드 */
.card-job {
  border-left: 4px solid #4285f4;  /* 파란색 */
}

/* 인력풀 카드 */
.card-talent {
  border-left: 4px solid #34a853;  /* 초록색 */
}

/* 긴급 공고 */
.card-urgent {
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border-left: 4px solid #ea4335;  /* 빨간색 */
}
```

### 상태 색상

```css
--primary: #4285f4;
--success: #34a853;
--warning: #fbbc04;
--danger: #ea4335;
--text-primary: #202124;
--text-secondary: #5f6368;
--border: #dadce0;
--background: #f8f9fa;
```

---

## 최근 컬러 업데이트 (2025-10-17)

- **공고 색상**: `#a8c5e0` 계열로 전체 일관성 유지 (`tailwind.config.ts`의 `primary` 변경).
- **인력 색상**: `#c5e3d8` 기반으로 토글/카드/배너에 민트 하이라이트 (`#7db8a3`, `#6fb59b`).
- **체험 색상**: `#ffd98e` (향후 토글 3-way 확장 대비, `Header.tsx` 토글에 적용).
- **카드 상단 띠지**:
  - 공고 카드(`JobCard`, `CompactJobCard`): `from-primary to-[#8fb4d6]`.
  - 인력 카드(`TalentCard`, `CompactTalentCard`): `from-[#9fd5bf] to-[#6fb59b]`.
- **AI 추천 패널 버튼**: 공고 등록 `#7aa3cc`, 인력 등록 `#7db8a3`.
- **AI 인사이트 배너**: `notice`는 연블루, `review`는 민트 그라데이션, `event`는 주황 유지.
- **헤더 토글**: 공고/인력/체험 순환형 슬라이더, 색 각각 `#7aa3cc`, `#7db8a3`, `#f4c96b`.
- **필터 활성 배경**: `#f0f6fa`로 변경하여 새 팔레트에 맞춘 강조.

---

## 접근성 (a11y)

### 키보드 탐색

- `Tab`: 카드 간 이동
- `Enter`: 카드 상세보기
- `←` `→`: AI 추천 슬라이드 이동
- `Esc`: 모달 닫기

### 스크린 리더

```html
<div role="region" aria-label="AI 추천 공고 및 인력">
  <button aria-label="이전 추천 보기" aria-disabled="false">
    <
  </button>
  
  <article aria-label="공고: 수원 OO초등학교 코딩 방과후 강사 모집">
    <!-- 카드 내용 -->
  </article>
</div>
```

### 대비율

- 텍스트: 최소 4.5:1
- 큰 텍스트: 최소 3:1
- 인터랙티브 요소: 명확한 포커스 표시

---

## 성능 최적화

### 이미지

- 로고: SVG 사용
- 아이콘: SVG 스프라이트
- 프로필 사진: WebP + lazy loading

### 스크롤

```typescript
// Intersection Observer로 무한 스크롤
const observer = new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) {
      loadMoreCards();
    }
  },
  { threshold: 0.1 }
);
```

### 스켈레톤 UI

로딩 중 회색 박스로 레이아웃 미리 표시:

```
┌────────────────────────────┐
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                            │
│ ░░░░░░░░░░░░░░░░░░░░       │
│ ░░░░░░░░░░░░░░░░░░░░░░░    │
│                            │
│ ░░░░░░ ░░░░░░ ░░░░░░       │
└────────────────────────────┘
```

---

## 5. 등록 폼 시스템 (Registration Forms)

### 개요
- **배경**: Phase 3 백엔드 계획에 따라 사용자가 공고/인력/체험을 직접 등록할 수 있는 폼 시스템 구축
- **UX 컨셉**: 독립 모달이 아닌 **우측 확장 패널** 방식
  - AI 추천 영역(코멘트 + 카드 + 프로모)을 우측으로 슬라이드 아웃하며 폼이 자연스럽게 확장
  - 좌측 등록 버튼(3개)은 그대로 유지하여 폼 간 즉시 전환 가능
  - 280px 고정 높이 내에서 모든 필드가 한눈에 보이도록 2-3단 컬럼 그리드 레이아웃

### 명칭
- **컴포넌트**: `<JobPostingForm />`, `<TalentRegistrationForm />`, `<ExperienceForm />`
- **파일 위치**: `src/components/forms/`
- **공통 레이아웃**: `<FormLayout />` (헤더, 푸터, 닫기 버튼 공통화)
- **지역 선택**: `<RegionSelector />` (서울 25개 구 + 경기 31개 시/군)

### 레이아웃 구조

```
┌────────────┬───────────────────────────────────────────────────────────────┐
│  등록버튼  │  등록 폼 (280px 고정 높이, 우측 확장)                          │
│  (140px)   │  ┌─────────────────┬─────────────────┬─────────────────┐    │
│            │  │  좌측 컬럼       │  중앙 컬럼       │  우측 컬럼       │    │
│  ┌────┐   │  │  (1/3)          │  (1/3)          │  (1/3)          │    │
│  │공고│   │  │                 │                 │                 │    │
│  │등록│◀──┼──│  기본 정보       │  모집 조건       │  연락처          │    │
│  └────┘   │  │                 │                 │                 │    │
│  [활성]   │  └─────────────────┴─────────────────┴─────────────────┘    │
│            │                                                             │
│  ┌────┐   │  슬라이드 인 애니메이션 (300ms, Framer Motion)              │
│  │인력│   │  AI 코멘트 + 추천카드 + 프로모카드 영역을 덮음               │
│  │등록│   │                                                             │
│  └────┘   │                                                             │
│            │                                                             │
│  ┌────┐   │                                                             │
│  │체험│   │                                                             │
│  │등록│   │                                                             │
│  └────┘   │                                                             │
└────────────┴───────────────────────────────────────────────────────────────┘
```

---

### 5.1 공고 등록 폼 (JobPostingForm)

#### 필드 구성 (3단 컬럼)

**좌측 컬럼 - 기본 정보**
```typescript
- 학교/기관명 * (text input)
- 공고 제목 * (text input)
- 학교급 * (체크박스, 다중 선택)
  □ 유치원  □ 초등  □ 중등  □ 고등  □ 특수
  □ 교직원 및 학부모 등 성인대상 강의연수
  □ 기타 (체크 시 직접 입력창 표시)
- 과목 (중등 또는 성인대상 체크 시에만 표시)
  예: "국어, 수학" 또는 "교권보호, 생활지도"
```

**중앙 컬럼 - 모집 조건**
```typescript
- 근무 지역 * (서울/경기 라디오 + 체크박스)
  ○ 서울 [▼] → 25개 구 체크박스 확장
  ○ 경기 [▼] → 31개 시/군 체크박스 확장
- 급여/처우 (text input)
  예: "월 250만원, 4대보험"
- 모집기간 * (date range)
  [시작일] ~ [종료일]
  □ 상시 모집 체크박스
- 근무기간 * (date range)
  [시작일] ~ [종료일]
  □ 협의 가능 체크박스
```

**우측 컬럼 - 추가 정보**
```typescript
- 상세 설명 (textarea, 최대 3줄)
- 첨부파일 (file input)
  PDF, DOC, HWP, 이미지 (최대 10MB)
- 전화번호 * (text input)
  예시: "031-XXXX-XXXX" (유선 우선, 010 입력 가능)
- 이메일 * (email input)
  예시: "example@school.kr"
```

#### 데이터 구조

```typescript
interface JobPostingFormData {
  // 기본 정보
  organization: string;
  title: string;
  schoolLevel: {
    kindergarten: boolean;
    elementary: boolean;
    secondary: boolean;      // → 과목 입력 트리거
    high: boolean;
    special: boolean;
    adultTraining: boolean;  // → 과목 입력 트리거
    other?: string;          // 직접 입력
  };
  subject?: string;          // 조건부 표시

  // 모집 조건
  location: {
    seoul?: string[];        // 구 배열
    gyeonggi?: string[];     // 시/군 배열
  };
  compensation?: string;
  recruitmentStart: string;
  recruitmentEnd: string;
  isOngoing: boolean;
  workStart: string;
  workEnd: string;
  isNegotiable: boolean;

  // 추가 정보
  description?: string;
  attachments?: File[];
  phone: string;
  email: string;
}
```

---

### 5.2 인력 등록 폼 (TalentRegistrationForm)

#### 필드 구성 (3단 컬럼)

**좌측 컬럼 - 프로필 정보**
```typescript
- 이름 * (text input)
- 전문 분야 * (체크박스, 중복 선택)
  □ 기간제교사 [▼]
    └ □ 유치원  □ 초등  □ 중등 [▼]  □ 특수
       └ 중등 과목 직접 입력: _____________
          [국어] [수학] [영어] (입력된 과목 태그로 표시)
  □ 진로교육
  □ 상담교육
  □ 방과후 강사
  □ 늘봄 강사
  □ 협력강사
  □ 교원, 직원 및 학부모 대상 연수강의 [ⓘ]
    (툴팁: "교권보호, 생활지도, 에듀테크 등 성인대상 연수를 뜻합니다")
  □ 기타 (체크 시 직접 입력창 표시)
- 경력 * (라디오 버튼)
  ○ 신규  ○ 1~3년  ○ 3~5년  ○ 5년 이상
```

**중앙 컬럼 - 활동 선호 조건**
```typescript
- 희망 지역 * (서울/경기 라디오 + 체크박스)
  ○ 서울 [▼] → 25개 구
  ○ 경기 [▼] → 31개 시/군
- 자격/면허 (text input)
  예: "중등교사 2급 정교사 (영어)"
```

**우측 컬럼 - 자기소개 & 연락처**
```typescript
- 자기소개 (textarea, 최대 3줄)
  "전문성, 경력, 교육 철학 등"
- 포트폴리오/이력서 (file input)
- 전화번호 * (text input)
  예시: "010-XXXX-XXXX"
  하단 안내: "휴대전화 번호는 일반에 공개되지 않으며 로그인 및
            인증과정을 거친 학교 사용자들을 대상으로만 공개됩니다."
- 이메일 * (email input)
```

---

### 5.3 체험 등록 폼 (ExperienceForm)

#### 필드 구성 (3단 컬럼)

**좌측 컬럼 - 기본 정보**
```typescript
- 프로그램명 * (text input)
- 제공 기관/단체 * (text input)
- 프로그램 유형 * (라디오 + 직접입력)
  ○ 정규교육과정 연계 협력수업
  ○ 방과후
  ○ 늘봄
  ○ 기타 → 입력창 표시, 태그로 표현
- 대상 학교급 * (체크박스)
  □ 유치원  □ 초등  □ 중등  □ 고등
  □ 교직원 및 학부모 등 성인대상
- 주제/분야 * (드롭다운, 20개 옵션)
  코딩/프로그래밍, AI, 로봇공학, 3D프린팅/메이커, 드론,
  VR/AR/메타버스, 악기연주, 미술/공예, 연극/뮤지컬,
  영상제작/방송, 독서/글쓰기, 토론/발표, 과학실험,
  환경/생태, 경제/금융, 창업/기업가정신, 진로탐색,
  인성/리더십, 안전교육, 다문화/세계시민
```

**중앙 컬럼 - 운영 정보**
```typescript
- 운영 방식 * (라디오)
  ○ 찾아가는 수업 (학교 방문)
  ○ 센터/시설 방문
  ○ 온라인
- 가능 지역 * (서울/경기 라디오 + 체크박스)
- 프로그램 기간 (date range)
  [시작일] ~ [종료일]
  □ 연중 상시 운영
- 참가 비용 * (라디오 + 숫자)
  ○ 무료
  ○ 유료 [_______] 원
```

**우측 컬럼 - 상세 & 연락처**
```typescript
- 프로그램 소개 * (textarea, 2줄)
- 프로그램 자료 (file input)
- 전화번호 * (text input)
  예시: "010-XXXX-XXXX"
  하단 안내: "휴대전화 번호는 일반에 공개되지 않으며..."
- 이메일 * (email input)
- 신청 URL (url input)
  하단 안내: "구글설문 등을 넣어주시면 기관과 업체
            자체적으로 상시 모집하실 수 있습니다"
```

---

### 5.4 공통 컴포넌트

#### RegionSelector.tsx

```typescript
// 서울 25개 구
const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구'
];

// 경기 31개 시/군
const GYEONGGI_CITIES = [
  '가평군', '고양시', '과천시', '광명시', '광주시',
  '구리시', '군포시', '김포시', '남양주시', '동두천시',
  '부천시', '성남시', '수원시', '시흥시', '안산시',
  '안성시', '안양시', '양주시', '양평군', '여주시',
  '연천군', '오산시', '용인시', '의왕시', '의정부시',
  '이천시', '파주시', '평택시', '포천시', '하남시',
  '화성시'
];
```

---

### 5.5 AIRecommendations.tsx 수정사항

```typescript
// 조건부 렌더링으로 AI 추천 ↔ 등록 폼 전환
<AnimatePresence mode="wait">
  {activeSection === null ? (
    // 기본 상태: AI 추천
    <motion.div key="recommendations" ...>
      <div>AI 코멘트 + 카드</div>
      <aside>프로모카드</aside>
    </motion.div>
  ) : (
    // 폼 상태: 슬라이드 인
    <motion.div key={`form-${activeSection}`} ...>
      {activeSection === 'job' && <JobPostingForm onClose={...} />}
      {activeSection === 'talent' && <TalentRegistrationForm onClose={...} />}
      {activeSection === 'experience' && <ExperienceForm onClose={...} />}
    </motion.div>
  )}
</AnimatePresence>
```

---

### 5.6 파일 구조

```
src/
├── components/
│   ├── forms/
│   │   ├── JobPostingForm.tsx
│   │   ├── TalentRegistrationForm.tsx
│   │   ├── ExperienceForm.tsx
│   │   ├── FormLayout.tsx
│   │   └── RegionSelector.tsx
│   └── ai/
│       └── AIRecommendations.tsx    # 수정 필요
├── lib/
│   └── validation/
│       └── formSchemas.ts           # Zod 스키마
└── types/
    └── forms.ts                     # 폼 타입 정의
```

---

### 5.7 구현 우선순위

**Phase 1: 공통 컴포넌트 (1일)**
- RegionSelector.tsx 구현
- FormLayout.tsx 구현
- Zod 스키마 작성

**Phase 2: 공고 등록 폼 (2일)**
- JobPostingForm.tsx UI 구현
- AIRecommendations.tsx 조건부 렌더링
- React Hook Form 통합

**Phase 3: 인력 등록 폼 (2일)**
- TalentRegistrationForm.tsx 구현
- 중첩 체크박스 로직

**Phase 4: 체험 등록 폼 (1.5일)**
- ExperienceForm.tsx 구현
- 드롭다운 주제 선택기

**Phase 5: 통합 (0.5일)**
- 인증 체크 및 통합 테스트

**총 예상 기간: 7일**

---

### 5.8 공고 등록 폼 구현 가이드 (실제 구현 기준)

> **중요**: 이 섹션은 실제 대화를 통해 확립된 디자인 패턴과 사용자 선호도를 반영합니다.
> 인력 등록, 체험 등록 폼 구현 시 동일한 패턴을 따라야 합니다.

#### 핵심 UX/UI 원칙

**1. X버튼 없음**
- 폼 우측 상단에 X 버튼을 두지 않음
- 닫기 방법:
  - 좌측 등록 버튼 재클릭 (토글)
  - 폼 내부 "취소" 버튼 클릭
- 이유: 공간 절약 + 심플한 디자인

**2. 드롭다운 패턴 (Dropdown Pattern)**
- 여러 옵션 중 선택하는 필드는 드롭다운으로 구현
- 적용 대상: 학교급, 근무지역
- 특징:
  - 단일 버튼으로 토글 (위/아래 화살표 아이콘)
  - 선택된 항목 개수 표시 (예: "서울(3)", "유치원 외 2개")
  - 드롭다운 패널 내부에 "선택 완료" 버튼
  - 드롭다운 닫기: 선택 완료 버튼 클릭 또는 바깥 영역 클릭

**3. 280px 고정 높이 + 스크롤 없음**
- FormLayout: `h-[280px]` 고정
- 모든 필드가 한눈에 보여야 함
- 스크롤이 생기면 레이아웃 재조정 필요
- 해결 방법: 3단 컬럼 그리드 + 폰트 크기 최적화

**4. 3단 컬럼 그리드 레이아웃**
```typescript
<div className="grid grid-cols-3 gap-x-2 gap-y-1">
  <div className="space-y-1">{/* 좌측 컬럼 */}</div>
  <div className="space-y-1">{/* 중앙 컬럼 */}</div>
  <div className="space-y-1">{/* 우측 컬럼 */}</div>
</div>
```
- `gap-x-2`: 컬럼 간 수평 간격
- `gap-y-1`: 필드 간 수직 간격
- `space-y-1`: 컬럼 내부 필드 간격

**5. 심플한 디자인**
- 불필요한 테두리, 그림자 최소화
- 헤더 제거 (폼 제목 없음)
- 푸터 제거 (버튼을 폼 내부로 통합)

---

#### 폰트 크기 통일 기준

**모든 등록 폼에서 동일하게 적용**:

```css
/* 라벨 (필드명) */
.label {
  font-size: 12px;        /* text-[12px] */
  font-weight: 600;       /* font-semibold */
  color: #374151;         /* text-gray-700 */
}

/* 입력 필드 (input, textarea, select) */
.input {
  font-size: 12px;        /* text-[12px] */
  height: 28px;           /* h-7 */
  padding: 0 8px;         /* px-2 */
}

/* 보조 텍스트 (체크박스 라벨, date 구분자 ~) */
.helper-text {
  font-size: 11px;        /* text-[11px] */
  color: #6b7280;         /* text-gray-500 */
}

/* 에러 메시지 */
.error {
  font-size: 11px;        /* text-[11px] */
  color: #dc2626;         /* text-red-600 */
}

/* 플레이스홀더 및 설명 */
.description {
  font-size: 10px;        /* text-[10px] */
  color: #9ca3af;         /* text-gray-400 */
}

/* 체크박스 크기 */
.checkbox {
  width: 12px;            /* w-3 */
  height: 12px;           /* h-3 */
}

/* 드롭다운 내부 체크박스 */
.dropdown-checkbox {
  width: 14px;            /* w-3.5 */
  height: 14px;           /* h-3.5 */
}
```

---

#### 드롭다운 컴포넌트 패턴

**SchoolLevelSelector (학교급 선택기)**:

```typescript
// 구조
<div className="space-y-0.5 relative">
  <label className="text-[12px] font-semibold text-gray-700">학교급 *</label>

  {/* 드롭다운 버튼 */}
  <button className="w-full h-7 px-2 text-[12px] border rounded">
    <span>{getDisplayText()}</span>  {/* "학교급 선택" 또는 "유치원 외 2개" */}
    <IconChevronDown size={14} />
  </button>

  {/* 드롭다운 패널 */}
  {isOpen && (
    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border rounded-lg shadow-lg z-20 p-2">
      {/* 체크박스 리스트 */}
      {SCHOOL_LEVELS.map(level => (
        <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
          <input type="checkbox" className="w-3.5 h-3.5" />
          <span className="text-[12px]">{level.label}</span>
        </label>
      ))}

      {/* 기타 직접 입력 */}
      <div className="pt-1 border-t">
        <label>
          <input type="checkbox" className="w-3.5 h-3.5" />
          <span className="text-[12px]">기타</span>
          {showOtherInput && (
            <input type="text" placeholder="직접 입력" className="w-full h-6 px-1.5 text-[11px]" />
          )}
        </label>
      </div>

      {/* 선택 완료 버튼 */}
      <button className="w-full mt-2 h-7 bg-gradient-to-r from-[#7aa3cc] to-[#68B2FF] text-white text-[12px] rounded">
        선택 완료
      </button>
    </div>
  )}
</div>
```

**RegionSelector (근무지역 선택기)**:

```typescript
// 구조
<div className="space-y-0.5 relative">
  <label className="text-[12px] font-semibold text-gray-700">근무 지역 *</label>

  {/* 드롭다운 버튼 */}
  <button className="w-full h-7 px-2 text-[12px] border rounded">
    <span>{getDisplayText()}</span>  {/* "지역 선택" 또는 "서울(3), 경기(5)" */}
    <IconChevronDown size={14} />
  </button>

  {/* 드롭다운 패널 */}
  {isOpen && (
    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border rounded-lg shadow-lg z-20 p-2">
      {/* 서울/경기 라디오 선택 */}
      <div className="flex gap-2 mb-2 pb-2 border-b">
        <label>
          <input type="radio" name="region" value="seoul" className="w-3.5 h-3.5" />
          <span className="text-[12px]">서울 {seoulCount > 0 && `(${seoulCount})`}</span>
        </label>
        <label>
          <input type="radio" name="region" value="gyeonggi" className="w-3.5 h-3.5" />
          <span className="text-[12px]">경기 {gyeonggiCount > 0 && `(${gyeonggiCount})`}</span>
        </label>
      </div>

      {/* 선택된 지역의 구/시 체크박스 (3열 그리드) */}
      {selectedRegion === 'seoul' && (
        <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto">
          {SEOUL_DISTRICTS.map(district => (
            <label className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded">
              <input type="checkbox" className="w-3 h-3" />
              <span className="text-[11px]">{district}</span>
            </label>
          ))}
        </div>
      )}

      {/* 선택 완료 버튼 */}
      <button className="w-full mt-2 pt-2 border-t text-[11px] text-blue-600">
        선택 완료
      </button>
    </div>
  )}
</div>
```

---

#### 파일 업로드 UI 패턴

**FileUploadField (공고문 첨부)**:

```typescript
<div className="space-y-0.5">
  <label className="text-[12px] font-semibold text-gray-700">
    공고문 첨부 <span className="text-gray-400 font-normal">(선택)</span>
  </label>

  {/* 파일 선택 전 */}
  {!file ? (
    <div className="relative border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400">
      <input type="file" accept=".pdf,.doc,.docx,.hwp" className="absolute inset-0 opacity-0 cursor-pointer" />
      <div className="flex flex-col items-center justify-center py-2.5 px-2">
        <IconUpload size={18} className="text-gray-400 mb-1" />
        <p className="text-[11px] text-gray-600 text-center">
          파일을 드래그하거나 클릭하여 업로드
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          .pdf, .doc, .docx, .hwp (최대 10MB)
        </p>
      </div>
    </div>
  ) : (
    /* 파일 선택 후 */
    <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-300 rounded-lg">
      <IconFile size={16} className="text-blue-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-gray-900 truncate">{file.name}</p>
        <p className="text-[10px] text-gray-500">{formatFileSize(file.size)}</p>
      </div>
      <button type="button" onClick={removeFile} className="shrink-0 p-0.5 hover:bg-gray-200 rounded">
        <IconX size={14} className="text-gray-500" />
      </button>
    </div>
  )}
</div>
```

---

#### 버튼 위치 및 스타일

**취소/등록 버튼을 폼 내부에 배치**:

```typescript
{/* 우측 컬럼 하단에 버튼 배치 */}
<div className="space-y-1">
  {/* 과목 (조건부) */}
  {shouldShowSubject && <div>...</div>}

  {/* 전화번호 */}
  <div>...</div>

  {/* 이메일 */}
  <div>...</div>

  {/* 공고문 첨부 */}
  <FileUploadField />

  {/* 취소/등록 버튼 */}
  <div className="flex items-center justify-end gap-1.5 pt-1">
    <button
      type="button"
      onClick={onClose}
      className="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
    >
      취소
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      className="px-3 py-1.5 text-[12px] font-medium text-white bg-gradient-to-r from-[#7aa3cc] to-[#68B2FF] rounded hover:from-[#6a93bc] hover:to-[#58A2EF] disabled:opacity-50"
    >
      {isSubmitting ? '등록 중...' : '등록하기'}
    </button>
  </div>
</div>
```

**버튼 스타일 가이드**:
- 취소 버튼: 흰색 배경 + 회색 테두리
- 등록 버튼: 블루 그라데이션 (공고 테마색)
- 등록 중 상태: `disabled:opacity-50` + 텍스트 변경
- 버튼 크기: `px-3 py-1.5 text-[12px]`

---

#### 공고 등록 폼 최종 레이아웃

**3단 컬럼 구조 (실제 구현 기준)**:

```typescript
<div className="grid grid-cols-3 gap-x-2 gap-y-1">
  {/* 좌측 컬럼: 기본 정보 */}
  <div className="space-y-1">
    - 학교/기관명 * (text input)
    - 공고 제목 * (text input)
    - 학교급 * (SchoolLevelSelector 드롭다운)
    - 근무 지역 * (RegionSelector 드롭다운)
  </div>

  {/* 중앙 컬럼: 모집/근무 조건 */}
  <div className="space-y-1">
    - 모집기간 * (date range, 상시 모집 체크박스)
    - 근무기간 * (date range, 협의 가능 체크박스)
    - 급여/처우 (text input)
    - 상세 설명 (textarea, 2줄)
  </div>

  {/* 우측 컬럼: 과목, 연락처, 첨부, 버튼 */}
  <div className="space-y-1">
    - 과목 (조건부, 중등/성인대상 선택 시만 표시)
    - 전화번호 * (text input, "예: 031-XXXX-XXXX")
    - 이메일 * (email input)
    - 공고문 첨부 (FileUploadField, 선택)
    - 취소/등록하기 버튼 (flex justify-end)
  </div>
</div>
```

**필드별 높이 조정**:
- Text input: `h-7`
- Date input: `h-7`
- Textarea (상세 설명): `rows={2}` 고정
- 드롭다운 버튼: `h-7`

**간격 조정**:
- 컬럼 간 수평 간격: `gap-x-2`
- 필드 간 수직 간격: `gap-y-1`
- 컬럼 내부 필드 간격: `space-y-1`

---

#### 조건부 렌더링 로직

**과목 필드 표시 조건**:

```typescript
const schoolLevel = watch('schoolLevel');

// 중등 또는 성인대상 강의연수 체크 시 과목 필드 표시
const shouldShowSubject = schoolLevel.secondary || schoolLevel.adultTraining;

{shouldShowSubject && (
  <div>
    <label className="text-[12px] font-semibold text-gray-700">
      과목 <span className="text-red-500">*</span>
    </label>
    <input
      {...register('subject')}
      placeholder="예: 국어, 수학, 영어"
      className="w-full h-7 px-2 text-[12px] border rounded"
    />
    {errors.subject && (
      <p className="text-[11px] text-red-600 mt-0.5">{errors.subject.message}</p>
    )}
  </div>
)}
```

**Zod 스키마에서 조건부 필수 검증**:

```typescript
export const jobPostingSchema = z.object({
  // ... other fields
  subject: z.string().optional(),
}).refine(
  (data) => {
    // 중등 또는 성인대상 체크 시 과목 필수
    if (data.schoolLevel.secondary || data.schoolLevel.adultTraining) {
      return data.subject && data.subject.length > 0;
    }
    return true;
  },
  {
    message: '중등 또는 성인대상 강의연수 선택 시 과목을 입력해주세요',
    path: ['subject']
  }
);
```

---

#### 인력 등록, 체험 등록 폼 구현 시 주의사항

**동일하게 적용해야 할 패턴**:

1. ✅ 280px 고정 높이, 스크롤 없음
2. ✅ 3단 컬럼 그리드 레이아웃
3. ✅ 폰트 크기 통일 (라벨 12px, 입력 12px, 보조 11px)
4. ✅ X버튼 없음 (취소 버튼으로 닫기)
5. ✅ 드롭다운 패턴 사용 (여러 옵션 선택)
6. ✅ 파일 업로드 UI (드래그 앤 드롭)
7. ✅ 버튼을 폼 내부에 배치 (우측 컬럼 하단)
8. ✅ 심플한 디자인 (불필요한 장식 최소화)

**인력 등록 폼 특이사항**:
- 전문 분야: 중첩 체크박스 (기간제교사 → 학교급 → 과목)
- 드롭다운 또는 아코디언 패턴 권장

**체험 등록 폼 특이사항**:
- 주제/분야: 20개 옵션 드롭다운 (단일 선택)
- 운영 방식: 라디오 버튼

---

#### FormLayout 컴포넌트 (공통 래퍼)

**최종 구조 (헤더/푸터 제거)**:

```typescript
interface FormLayoutProps {
  title: string;            // 사용하지 않음 (호환성 유지)
  onClose: () => void;      // 사용하지 않음 (버튼 내부에서 직접 처리)
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  submitText?: string;      // 사용하지 않음
  isSubmitting?: boolean;   // 사용하지 않음
}

export default function FormLayout({ onSubmit, children }: FormLayoutProps) {
  return (
    <div className="h-[280px] bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <form onSubmit={onSubmit} className="h-full overflow-y-auto p-2">
        {children}
      </form>
    </div>
  );
}
```

**사용 예시**:

```typescript
<FormLayout onSubmit={handleSubmit(handleFormSubmit)}>
  <div className="grid grid-cols-3 gap-x-2 gap-y-1">
    {/* 좌측/중앙/우측 컬럼 */}
  </div>
</FormLayout>
```

---

#### React Hook Form + Zod 통합 패턴

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { jobPostingSchema, type JobPostingFormData } from '@/lib/validation/formSchemas';

export default function JobPostingForm({ onClose }: { onClose: () => void }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<JobPostingFormData>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      organization: '',
      title: '',
      schoolLevel: {
        kindergarten: false,
        elementary: false,
        secondary: false,
        high: false,
        special: false,
        adultTraining: false,
        other: ''
      },
      location: {
        seoul: [],
        gyeonggi: []
      },
      // ... other defaults
    }
  });

  const handleFormSubmit = async (data: JobPostingFormData) => {
    console.log('폼 데이터:', data);
    // TODO: API 호출
    onClose();
  };

  return (
    <FormLayout onSubmit={handleSubmit(handleFormSubmit)}>
      {/* 폼 필드 */}
    </FormLayout>
  );
}
```

---

#### 파일 구조 (최종)

```
src/
├── components/
│   └── forms/
│       ├── JobPostingForm.tsx              # 공고 등록 폼 (완성)
│       ├── TalentRegistrationForm.tsx      # 인력 등록 폼 (예정)
│       ├── ExperienceForm.tsx              # 체험 등록 폼 (예정)
│       ├── FormLayout.tsx                  # 공통 래퍼
│       ├── SchoolLevelSelector.tsx         # 학교급 드롭다운
│       ├── RegionSelector.tsx              # 근무지역 드롭다운
│       └── FileUploadField.tsx             # 파일 업로드
├── lib/
│   └── validation/
│       └── formSchemas.ts                  # Zod 스키마
└── types/
    └── forms.ts                            # TypeScript 타입
```

---

### 5.9 다음 구현 단계 (인력 등록 폼)

**인력 등록 폼에서 동일하게 적용**:
- 280px 고정 높이 + 3단 컬럼
- 폰트 크기 통일 (라벨 12px, 입력 12px)
- 드롭다운 패턴 (전문 분야, 희망 지역)
- X버튼 없음, 버튼 내부 배치
- 파일 업로드 UI (포트폴리오/이력서)

**추가 고려사항**:
- 전문 분야: 중첩 체크박스 UI 패턴 필요
  - 기간제교사 체크 → 학교급 체크박스 확장 → 중등 체크 → 과목 입력
  - 아코디언 또는 2단계 드롭다운 권장

---

## 다음 단계

1. ✅ UI 구조 설계 완료
2. ✅ 등록 폼 시스템 설계 완료 (Phase 3 대응)
3. ✅ 공고 등록 폼 구현 완료 (실제 디자인 패턴 확립)
4. ⏳ 인력 등록 폼 구현 (공고 폼 패턴 적용)
5. ⏳ 체험 등록 폼 구현
6. ⏳ 백엔드 API 연동
7. ⏳ Supabase Storage 파일 업로드 구현

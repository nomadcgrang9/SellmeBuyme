# 색상 구조 정리 (2025-10-17)

## 1. 핵심 팔레트
- **Primary (공고/Job)**: Gradient `#9DD2FF → #68B2FF`
  - 주요 하이라이트: `#8BC8FF`, `#58A8FF`
  - 텍스트 포인트: `#68B2FF`
- **Talent (인력/Talent)**: `#c5e3d8`
  - 짙은 하이라이트: `#9fd5bf`, `#7db8a3`, `#6fb59b`
- **Experience (체험/Experience)**: `#ffd98e`
  - 짙은 하이라이트: `#f4c96b`
- **Utility**: `#DC2626 (danger)`, `#111827 (기본 텍스트)`

## 2. 글로벌 설정 변경
- `tailwind.config.ts`
  - `theme.extend.colors.primary = #a8c5e0`
  - `theme.extend.colors.talent = #c5e3d8`
  - `theme.extend.colors.experience = #ffd98e`
- `app/globals.css`
  - `--primary = #a8c5e0`

## 3. 컴포넌트별 색상 사용
- `components/layout/Header.tsx`
  - 토글 슬라이더 색: 공고 `#7aa3cc`, 인력 `#7db8a3`, 체험 `#f4c96b`
  - 로고 타이틀 & 인증 버튼 그라데이션: `#9DD2FF → #68B2FF`
  - 인증/로그인/회원가입 버튼 텍스트: `#68B2FF`
  - 필터 버튼 활성 배경: `#f0f6fa`
- `components/cards/JobCard.tsx`
  - 상단 띠지: `bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF]`
  - 헤더 텍스트: `#68B2FF`
  - 위치 아이콘: `#2563EB`
  - 급여 아이콘: `#1D4ED8`
- `components/cards/CompactJobCard.tsx`
  - 상단 띠지: `from-[#9DD2FF] to-[#68B2FF]`
  - 헤더 텍스트: `#68B2FF`
  - 태그 1번 스타일: `bg-[#e8f1f8] text-[#5a8ab8]`
  - 위치/급여 아이콘: `#1D4ED8`, `#3B82F6`
- `components/cards/TalentCard.tsx`
  - 상단 띠지: `from-[#9DD2FF] to-[#68B2FF]`
  - 헤더 텍스트: `#1D4ED8`
  - 인증 배지: `bg-[#9DD2FF] text-[#0F172A]`
  - 위치 아이콘: `#1D4ED8`
- `components/cards/CompactTalentCard.tsx`
  - 상단 띠지: `from-[#9fd5bf] to-[#6fb59b]`
  - 인증 배지: `#7db8a3`
  - 태그 팔레트: `bg-[#e5f4f0] text-[#5a9d85]`, `bg-[#dff0ea] text-[#5a9d85]`
  - 위치 아이콘: `#7aa3cc`
- `components/ai/AIRecommendations.tsx`
  - 섹션 배경: `from-[#f0f6fa]`
  - 등록 버튼 공통 그라데이션: `#9DD2FF → #68B2FF`
  - 등록 버튼 텍스트 컬러: `#68B2FF`
- `components/ai/AIInsightBox.tsx`
  - 배너 그라데이션: `event` → `from-orange-400 to-yellow-500`, `notice` → `from-[#a8c5e0] to-[#8fb4d6]`, `review` → `from-[#9fd5bf] to-[#6fb59b]`
  - 통계 아이콘: 공고 `#7db8a3`, 인력 `#7aa3cc`

## 4. 재활용 가이드
- **상단 띠지**: 타입별 그라데이션을 최소 2톤으로 구성하여 구분성 확보
- **버튼**: 기본 상태는 짙은 톤(`[#7aa3cc]`, `[#7db8a3]`) 사용, hover 시 `brightness` + `shadow` 적용
- **필터/드롭다운**: 연한 톤(`[#f0f6fa]`)으로 강조, 기본 값은 회색 유지
- **아이콘**: 위치/통계 등 맥락에 맞춰 primary 계열(`[#7aa3cc]`) 또는 talent 계열(`[#7db8a3]`) 선택

## 5. 변경 이력
- 2025-10-26: Primary 스카이블루 팔레트(`9DD2FF→68B2FF`)로 재정렬. 헤더 로고/인증 버튼, 공고/인력 카드 상단 띠지, AI 등록 버튼, '공고' 텍스트 컬러를 `#68B2FF` 계열로 통일.
- 2025-10-17: 기존 블루/그린 조합을 Accent Blue & Mint & Yellow 삼분화 구조로 개편. 위 컴포넌트에 반영 완료.

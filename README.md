# 셀미바이미 (SellmeBuyme) - 프론트엔드

경기도 교육청 공고 통합 플랫폼의 메인 페이지 프론트엔드 구현

## 🚀 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 폰트 파일 추가

`public/fonts/` 디렉토리에 `esamanru Medium.ttf` 폰트 파일을 추가하세요.

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📁 프로젝트 구조

```
sellme-buyme/
├── app/
│   ├── globals.css          # 글로벌 스타일 + 폰트 설정
│   ├── layout.tsx           # 루트 레이아웃
│   └── page.tsx             # 메인 페이지
├── components/
│   ├── layout/
│   │   └── Header.tsx       # 헤더 (검색, 필터, 버튼)
│   ├── cards/
│   │   ├── JobCard.tsx      # 공고 카드
│   │   ├── TalentCard.tsx   # 인력풀 카드
│   │   └── CardGrid.tsx     # 카드 그리드
│   └── ai/
│       ├── AIRecommendations.tsx  # AI 추천 슬라이드
│       └── AIInsightBox.tsx       # AI 검색 결과 메시지
├── lib/
│   ├── dummyData.ts         # 더미 데이터
│   └── utils.ts             # 유틸리티 함수
├── types/
│   └── index.ts             # TypeScript 타입 정의
└── public/
    └── fonts/               # 폰트 파일 (esamanru Medium.ttf)
```

## 🎨 주요 기능

### 1. 헤더
- 로고 및 브랜드명
- 공고/인력풀 전환 토글 버튼
- AI 검색창
- 지역/분야/정렬 필터
- 공고 등록, 인력 등록, 로그인 버튼

### 2. AI 추천 섹션
- 좌우 슬라이드 네비게이션
- 반응형 카드 개수 (데스크톱 4개, 태블릿 3개, 모바일 1개)
- 인디케이터 표시

### 3. AI 검색 결과 메시지
- 친근한 대화체 메시지
- 검색 결과 요약
- 필터 조정 제안

### 4. 카드 그리드
- 공고 카드: 긴급 표시, 기관명, 제목, 태그, 위치, 급여, 마감일
- 인력풀 카드: 인증 배지, 이름, 전문분야, 태그, 위치, 경력, 평점

## 🎨 디자인 시스템

### 색상
- Primary (파란색): `#4285f4`
- Success (초록색): `#34a853`
- Warning (노란색): `#fbbc04`
- Danger (빨간색): `#ea4335`

### 폰트
- esamanru Medium (로컬 폰트)

### 아이콘
- Tabler Icons React

## 📱 반응형 디자인

- **데스크톱 (1200px+)**: 3열 그리드, AI 추천 4개
- **태블릿 (768px-1199px)**: 2열 그리드, AI 추천 3개
- **모바일 (~767px)**: 1열 리스트, AI 추천 1개

## 🔧 기술 스택

- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **스타일링**: TailwindCSS
- **아이콘**: Tabler Icons React
- **애니메이션**: CSS Transitions (Framer Motion 준비)

## 📝 다음 단계

- [ ] Framer Motion 애니메이션 추가
- [ ] 무한 스크롤 구현
- [ ] 실제 API 연동
- [ ] 상세 페이지 구현
- [ ] 반응형 모바일 최적화
- [ ] 접근성 개선

## 🎯 현재 상태

✅ 정적 UI 구현 완료 (더미 데이터)  
⏳ 백엔드 연결 대기  
⏳ 인터랙션 고도화 예정

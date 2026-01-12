# 크롤링 상태 대시보드 구현 계획

> **작성일**: 2026-01-12
> **위치**: 개발자노트 페이지 내 신규 섹션
> **목적**: 팀원 누구나 원클릭으로 크롤링 상태를 검증할 수 있는 시스템

---

## 1. 문제 정의

### 현재 상황
```
❌ 팀장이 직접 Playwright + SQL 쿼리로 검증
❌ 팀원들이 자기 담당 지역 상태를 스스로 확인 불가
❌ 서울 크롤러 9일 공백 같은 문제를 사전 감지 못함
```

### 목표
```
✅ 개발자노트에서 원클릭으로 전체/일부 지역 검증
✅ Gemini AI가 원본 게시판 방문 → DB 비교 → 결과 리포트
✅ PWA 푸시 알림으로 문제 발생 시 즉시 알림
```

---

## 2. 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                    크롤링 상태 대시보드                          │
│                    /developer (개발자노트)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │   Frontend  │────▶│   Supabase  │────▶│   Gemini    │       │
│  │   (React)   │     │   Edge Fn   │     │   2.0 Flash │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│         │                   │                   │               │
│         │                   │                   ▼               │
│         │                   │           ┌─────────────┐        │
│         │                   │           │  원본 게시판 │        │
│         │                   │           │  (교육청 17개)│       │
│         │                   │           └─────────────┘        │
│         │                   ▼                                   │
│         │           ┌─────────────┐                            │
│         └──────────▶│   DB 비교   │                            │
│                     │  (job_postings)│                         │
│                     └─────────────┘                            │
│                           │                                     │
│                           ▼                                     │
│                   ┌─────────────────┐                          │
│                   │   PWA 푸시 알림  │                          │
│                   │  (문제 감지 시)   │                         │
│                   └─────────────────┘                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 기술 스택

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **Frontend** | React + TypeScript | 대시보드 UI, 지역 선택, 결과 표시 |
| **API** | Supabase Edge Function | Gemini 호출, DB 쿼리, 결과 반환 |
| **AI** | Gemini 2.0 Flash | 원본 게시판 HTML 분석, 공고 목록 추출 |
| **DB** | Supabase PostgreSQL | job_postings 테이블 조회 |
| **알림** | PWA Web Push | 문제 발생 시 푸시 알림 |

---

## 4. 데이터베이스 스키마

### 4.1 크롤링 상태 테이블 (신규)

```sql
-- 크롤링 검증 결과 저장 테이블
CREATE TABLE crawler_health_checks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 지역 정보
  region_code TEXT NOT NULL,           -- 'seoul', 'busan', ...
  region_name TEXT NOT NULL,           -- '서울', '부산', ...
  board_url TEXT NOT NULL,             -- 원본 게시판 URL

  -- 검증 결과
  original_count INTEGER NOT NULL,     -- 원본 게시판 공고 수
  db_count INTEGER NOT NULL,           -- DB 저장 공고 수
  match_count INTEGER NOT NULL,        -- 일치하는 공고 수
  missing_count INTEGER NOT NULL,      -- 누락된 공고 수

  -- 상태 계산
  collection_rate DECIMAL(5,2),        -- 수집률 (%)
  days_since_crawl INTEGER,            -- 마지막 크롤링 이후 일수
  status TEXT NOT NULL,                -- 'healthy', 'warning', 'critical'

  -- 상세 정보
  missing_titles JSONB,                -- 누락된 공고 제목 목록
  ai_analysis TEXT,                    -- Gemini 분석 코멘트

  -- 메타
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  checked_by TEXT,                     -- 검증 실행자

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_crawler_health_region ON crawler_health_checks(region_code);
CREATE INDEX idx_crawler_health_status ON crawler_health_checks(status);
CREATE INDEX idx_crawler_health_checked_at ON crawler_health_checks(checked_at DESC);
```

### 4.2 지역별 게시판 URL 매핑 (sources.json 기반)

```typescript
export const REGION_BOARD_URLS: Record<string, {
  code: string;
  name: string;
  boardUrl: string;
  active: boolean;
  assignee: string;
}> = {
  seoul: {
    code: 'seoul',
    name: '서울',
    boardUrl: 'https://work.sen.go.kr/work/search/recInfo/BD_selectSrchRecInfo.do',
    active: true,
    assignee: '김성균'
  },
  busan: {
    code: 'busan',
    name: '부산',
    boardUrl: 'https://www.pen.go.kr/main/na/ntt/selectNttList.do?mi=30367&bbsId=2364',
    active: false,
    assignee: '최선결'
  },
  // ... 17개 지역 전체
};
```

---

## 5. API 설계

### 5.1 Supabase Edge Function: `/api/crawler-health`

**경로**: `supabase/functions/crawler-health/index.ts`

```typescript
// POST /crawler-health
// Body: { regions: string[], forceRefresh?: boolean }
// Response: CrawlerHealthResult[]

interface CrawlerHealthRequest {
  regions: string[];        // ['seoul', 'busan'] 또는 ['all']
  forceRefresh?: boolean;   // 캐시 무시하고 새로 검증
}

interface CrawlerHealthResult {
  regionCode: string;
  regionName: string;
  assignee: string;

  // 원본 게시판 정보 (Gemini 분석)
  originalCount: number;
  originalTitles: string[];
  boardUrl: string;

  // DB 정보
  dbCount: number;
  latestCrawlDate: string;
  daysSinceCrawl: number;

  // 비교 결과
  matchCount: number;
  missingCount: number;
  collectionRate: number;
  missingTitles: string[];

  // 상태
  status: 'healthy' | 'warning' | 'critical' | 'inactive';
  statusReason: string;

  // AI 분석
  aiComment: string;

  checkedAt: string;
}
```

### 5.2 Gemini 2.0 Flash 호출 함수

```typescript
// supabase/functions/_shared/crawler-health-ai.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * 원본 게시판 HTML을 분석하여 공고 목록 추출
 */
export async function analyzeEducationBoard(
  boardUrl: string,
  regionName: string
): Promise<{
  totalCount: number;
  titles: string[];
  schoolNames: string[];
}> {
  // 1. fetch로 게시판 HTML 가져오기
  const response = await fetch(boardUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; SellmeBuyme-HealthCheck/1.0)'
    }
  });
  const html = await response.text();

  // 2. Gemini에게 HTML 분석 요청
  const prompt = `
다음은 ${regionName} 교육청 채용 게시판의 HTML입니다.
이 페이지에서 채용 공고 목록을 추출해주세요.

HTML (앞 30000자):
${html.substring(0, 30000)}

출력 형식 (JSON만):
{
  "total_count": 606,
  "titles": ["[구룡중학교]배움터지킴이 채용", "2026 다니엘학교 늘봄 프로그램 강사 채용", ...],
  "school_names": ["구룡중학교", "다니엘학교", ...]
}

규칙:
1. 1페이지에 표시된 공고 제목만 추출 (보통 10-20개)
2. 학교명이 제목에 포함되어 있으면 함께 추출
3. total_count는 페이지에 표시된 전체 건수 (예: "검색건수 606건")
4. JSON 외 다른 텍스트 출력 금지
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // JSON 파싱
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    totalCount: parsed.total_count,
    titles: parsed.titles || [],
    schoolNames: parsed.school_names || []
  };
}

/**
 * 검증 결과에 대한 AI 코멘트 생성
 */
export async function generateHealthComment(
  regionName: string,
  originalCount: number,
  dbCount: number,
  daysSinceCrawl: number,
  missingTitles: string[]
): Promise<string> {
  if (daysSinceCrawl > 7) {
    return `⚠️ ${regionName} 크롤러가 ${daysSinceCrawl}일간 실행되지 않았습니다. 즉시 점검이 필요합니다.`;
  }

  if (missingTitles.length === 0) {
    return `✅ ${regionName} 크롤러 정상 작동 중. 수집률 100%.`;
  }

  const prompt = `
${regionName} 교육청 크롤링 검증 결과입니다.

- 원본 게시판: ${originalCount}건
- DB 저장: ${dbCount}건
- 마지막 크롤링: ${daysSinceCrawl}일 전
- 누락 공고: ${missingTitles.slice(0, 5).join(', ')}${missingTitles.length > 5 ? ` 외 ${missingTitles.length - 5}건` : ''}

위 결과를 바탕으로 50자 이내의 간결한 상태 코멘트를 작성해주세요.
문제가 있다면 원인을 추정하고, 정상이면 긍정적으로 표현하세요.
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
```

---

## 6. Frontend 구현

### 6.1 컴포넌트 구조

```
src/components/developer/
├── CrawlerHealthSection.tsx      # 메인 섹션 컴포넌트
├── CrawlerHealthCard.tsx         # 지역별 상태 카드
├── CrawlerHealthSummary.tsx      # 전체 요약 (긴급/주의/정상 개수)
├── CrawlerHealthFilters.tsx      # 담당자/상태 필터
└── CrawlerHealthModal.tsx        # 상세 결과 모달
```

### 6.2 메인 컴포넌트: CrawlerHealthSection.tsx

```tsx
// src/components/developer/CrawlerHealthSection.tsx

import { useState } from 'react';
import { Activity, RefreshCw, Bell, AlertTriangle } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';
import CrawlerHealthCard from './CrawlerHealthCard';
import CrawlerHealthSummary from './CrawlerHealthSummary';
import CrawlerHealthFilters from './CrawlerHealthFilters';
import { useCrawlerHealth } from '@/lib/hooks/useCrawlerHealth';

export default function CrawlerHealthSection() {
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['all']);
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  const {
    healthData,
    loading,
    error,
    checkHealth,
    lastChecked
  } = useCrawlerHealth();

  // 담당자별 필터링
  const filteredData = healthData.filter(h =>
    assigneeFilter === 'all' || h.assignee === assigneeFilter
  );

  // 상태별 분류
  const criticalCount = filteredData.filter(h => h.status === 'critical').length;
  const warningCount = filteredData.filter(h => h.status === 'warning').length;
  const healthyCount = filteredData.filter(h => h.status === 'healthy').length;

  const handleCheckAll = () => {
    checkHealth(['all']);
  };

  const handleCheckSelected = (regions: string[]) => {
    checkHealth(regions);
  };

  return (
    <CollapsibleSection
      title="크롤링 상태"
      icon={<Activity className="w-5 h-5" />}
      defaultOpen={true}
      badge={criticalCount > 0 ? (
        <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
          {criticalCount} 긴급
        </span>
      ) : null}
    >
      <div className="p-4 space-y-4">
        {/* 요약 카드 */}
        <CrawlerHealthSummary
          critical={criticalCount}
          warning={warningCount}
          healthy={healthyCount}
          inactive={filteredData.filter(h => h.status === 'inactive').length}
        />

        {/* 필터 & 새로고침 */}
        <div className="flex items-center justify-between">
          <CrawlerHealthFilters
            assignee={assigneeFilter}
            onAssigneeChange={setAssigneeFilter}
          />

          <button
            onClick={handleCheckAll}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            전체 검증
          </button>
        </div>

        {/* 마지막 검증 시간 */}
        {lastChecked && (
          <p className="text-xs text-gray-500">
            마지막 검증: {new Date(lastChecked).toLocaleString('ko-KR')}
          </p>
        )}

        {/* 지역별 카드 리스트 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
            Gemini AI가 원본 게시판을 분석 중...
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            검증 중 오류 발생: {error}
          </div>
        ) : (
          <div className="space-y-3">
            {/* 긴급 먼저 */}
            {filteredData
              .sort((a, b) => {
                const order = { critical: 0, warning: 1, healthy: 2, inactive: 3 };
                return order[a.status] - order[b.status];
              })
              .map((health) => (
                <CrawlerHealthCard
                  key={health.regionCode}
                  health={health}
                  onCheck={() => handleCheckSelected([health.regionCode])}
                />
              ))}
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
```

### 6.3 상태 카드: CrawlerHealthCard.tsx

```tsx
// src/components/developer/CrawlerHealthCard.tsx

import { ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import type { CrawlerHealthResult } from '@/types/developer';

interface Props {
  health: CrawlerHealthResult;
  onCheck: () => void;
}

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    label: '정상'
  },
  warning: {
    icon: Clock,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    label: '주의'
  },
  critical: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    label: '긴급'
  },
  inactive: {
    icon: Clock,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    iconColor: 'text-gray-400',
    label: '비활성'
  }
};

export default function CrawlerHealthCard({ health, onCheck }: Props) {
  const config = STATUS_CONFIG[health.status];
  const StatusIcon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
          <span className="font-semibold">{health.regionName}</span>
          <span className="text-xs text-gray-500">@{health.assignee}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* 원본 게시판 링크 */}
          <a
            href={health.boardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-gray-400 hover:text-blue-500"
            title="원본 게시판 열기"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          {/* 개별 검증 버튼 */}
          <button
            onClick={onCheck}
            className="p-1 text-gray-400 hover:text-blue-500"
            title="이 지역만 검증"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-2 text-center text-sm mb-2">
        <div>
          <div className="text-gray-500 text-xs">원본</div>
          <div className="font-semibold">{health.originalCount}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">DB</div>
          <div className="font-semibold">{health.dbCount}</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">수집률</div>
          <div className={`font-semibold ${health.collectionRate < 80 ? 'text-red-500' : ''}`}>
            {health.collectionRate}%
          </div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">지연</div>
          <div className={`font-semibold ${health.daysSinceCrawl > 3 ? 'text-red-500' : ''}`}>
            {health.daysSinceCrawl}일
          </div>
        </div>
      </div>

      {/* AI 코멘트 */}
      <p className="text-sm text-gray-600">{health.aiComment}</p>

      {/* 누락 공고 (있으면) */}
      {health.missingTitles.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs text-red-500 cursor-pointer">
            누락 공고 {health.missingTitles.length}건 보기
          </summary>
          <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
            {health.missingTitles.slice(0, 5).map((title, i) => (
              <li key={i}>{title}</li>
            ))}
            {health.missingTitles.length > 5 && (
              <li>... 외 {health.missingTitles.length - 5}건</li>
            )}
          </ul>
        </details>
      )}
    </div>
  );
}
```

---

## 7. PWA 푸시 알림 연동

### 7.1 알림 트리거 조건

```typescript
// 문제 감지 시 푸시 알림 발송
const ALERT_CONDITIONS = {
  // 긴급: 7일 이상 크롤링 없음
  critical: (daysSinceCrawl: number) => daysSinceCrawl >= 7,

  // 주의: 3-7일 크롤링 없음
  warning: (daysSinceCrawl: number) => daysSinceCrawl >= 3 && daysSinceCrawl < 7,

  // 수집률 저하
  lowCollection: (rate: number) => rate < 80
};
```

### 7.2 푸시 알림 메시지 포맷

```typescript
interface CrawlerAlertPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  tag: string;
  data: {
    regionCode: string;
    status: string;
    url: string;
  };
}

// 예시
{
  title: '🔴 서울 크롤러 긴급',
  body: '9일간 크롤링이 실행되지 않았습니다. 점검이 필요합니다.',
  icon: '/icons/crawler-alert.png',
  badge: '/icons/badge.png',
  tag: 'crawler-seoul',
  data: {
    regionCode: 'seoul',
    status: 'critical',
    url: '/developer'
  }
}
```

---

## 8. 구현 단계

### Phase 1: 기본 대시보드 (1-2일)

| 작업 | 파일 | 설명 |
|------|------|------|
| DB 스키마 생성 | `supabase/migrations/` | crawler_health_checks 테이블 |
| 타입 정의 | `src/types/developer.ts` | CrawlerHealthResult 타입 추가 |
| DB 조회 함수 | `src/lib/supabase/crawlerHealth.ts` | 최신 검증 결과 조회 |
| 커스텀 훅 | `src/lib/hooks/useCrawlerHealth.ts` | 상태 관리 및 API 호출 |
| UI 컴포넌트 | `src/components/developer/` | 섹션, 카드, 요약 컴포넌트 |
| 페이지 통합 | `src/pages/DeveloperPage.tsx` | CrawlerHealthSection 추가 |

### Phase 2: AI 검증 기능 (2-3일)

| 작업 | 파일 | 설명 |
|------|------|------|
| Edge Function | `supabase/functions/crawler-health/` | 검증 API 엔드포인트 |
| AI 분석 모듈 | `supabase/functions/_shared/crawler-health-ai.ts` | Gemini 2.0 Flash 연동 |
| 게시판 URL 매핑 | `src/constants/regionBoards.ts` | 17개 지역 게시판 정보 |
| 비교 로직 | Edge Function 내 | 원본 vs DB 비교 |

### Phase 3: PWA 알림 연동 (1일)

| 작업 | 파일 | 설명 |
|------|------|------|
| 알림 조건 정의 | `src/lib/utils/crawlerAlerts.ts` | 긴급/주의 조건 |
| 푸시 알림 발송 | `supabase/functions/crawler-health/` | 문제 감지 시 알림 |
| 서비스 워커 | `public/sw.js` | 알림 클릭 핸들러 |

---

## 9. UI 와이어프레임

```
┌─────────────────────────────────────────────────────────────────┐
│  🔍 크롤링 상태                                    [🔴 3 긴급]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 전체 현황                                           │   │
│  │  ┌─────────┬─────────┬─────────┬─────────┐             │   │
│  │  │ 🔴 3    │ 🟡 2    │ 🟢 9    │ ⚪ 3    │             │   │
│  │  │ 긴급    │ 주의    │ 정상    │ 비활성  │             │   │
│  │  └─────────┴─────────┴─────────┴─────────┘             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ 담당자 ─────────────────────────────────┐  [🔄 전체 검증]  │
│  │ [전체] [김성균] [최선결] [이진혁]         │                  │
│  └───────────────────────────────────────────┘                  │
│                                                                 │
│  마지막 검증: 2026-01-12 15:30                                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔴 서울                           @김성균   [🔗] [🔄]   │   │
│  │ ┌────────┬────────┬────────┬────────┐                   │   │
│  │ │ 원본   │ DB     │ 수집률 │ 지연   │                   │   │
│  │ │ 606    │ 104    │ 17%    │ 9일    │                   │   │
│  │ └────────┴────────┴────────┴────────┘                   │   │
│  │ ⚠️ 서울 크롤러가 9일간 실행되지 않았습니다.             │   │
│  │ ▶ 누락 공고 15건 보기                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🔴 부산                           @최선결   [🔗] [🔄]   │   │
│  │ ┌────────┬────────┬────────┬────────┐                   │   │
│  │ │ 원본   │ DB     │ 수집률 │ 지연   │                   │   │
│  │ │ 35     │ 0      │ 0%     │ -      │                   │   │
│  │ └────────┴────────┴────────┴────────┘                   │   │
│  │ ❌ 크롤러가 비활성 상태입니다. 개발이 필요합니다.        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🟢 경기                           @김성균   [🔗] [🔄]   │   │
│  │ ┌────────┬────────┬────────┬────────┐                   │   │
│  │ │ 원본   │ DB     │ 수집률 │ 지연   │                   │   │
│  │ │ 89     │ 85     │ 96%    │ 1일    │                   │   │
│  │ └────────┴────────┴────────┴────────┘                   │   │
│  │ ✅ 경기 크롤러 정상 작동 중.                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. 예상 비용

### Gemini API 사용량 (월간 추정)

| 시나리오 | 호출 횟수 | 토큰/호출 | 총 토큰 | 비용 |
|----------|-----------|-----------|---------|------|
| 수동 검증 (17지역 × 5회/월) | 85 | ~5,000 | 425,000 | ~$0.05 |
| 자동 검증 (17지역 × 30일) | 510 | ~5,000 | 2,550,000 | ~$0.30 |

**예상 월간 비용: $0.35 이하** (Gemini 2.0 Flash 기준)

---

## 11. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|-----------|
| 검증 응답 시간 | < 30초 | API 응답 시간 |
| 문제 감지율 | 100% | 실제 문제 vs 감지된 문제 |
| 알림 전달율 | > 95% | 발송 vs 수신 |
| 팀원 활용도 | > 80% | 주간 검증 실행 횟수 |

---

## 12. 참고 자료

- 기존 Gemini 연동: `crawler/lib/gemini.js`
- 개발자노트 구조: `src/pages/DeveloperPage.tsx`
- PWA 유틸: `src/lib/utils/pwaUtils.ts`
- 크롤링 소스: `crawler/config/sources.json`

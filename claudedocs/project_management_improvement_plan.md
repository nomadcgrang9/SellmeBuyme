# 프로젝트 관리 시스템 개선 계획

## 문서 개요

**작성일**: 2025-11-14
**대상 시스템**: 셀바 개발자노트 - 프로젝트 관리 기능
**현재 버전**: v1.0 (기본 CRUD + 단계 체크리스트)
**목표**: 효과적인 프로젝트 추적 및 진행 관리 시스템 구축

---

## A. 현재 시스템의 5가지 주요 문제점

### 1. 전체 현황 파악 불가 (Dashboard 부재)

**문제점 설명**:
- 개별 카드만 표시되며, 전체 프로젝트 현황을 한눈에 볼 수 있는 대시보드가 없음
- 사용자는 스크롤하며 각 카드를 하나씩 확인해야 현재 진행 중인 프로젝트 수를 파악 가능
- "지금 어느 프로젝트에 집중해야 하는가?"라는 핵심 질문에 즉각 답할 수 없음

**사용자 경험 영향**:
- **인지 부하 증가**: 10개 프로젝트가 있다면 10개를 모두 열어봐야 현황 파악 가능
- **우선순위 혼란**: 어떤 프로젝트가 막혔는지, 급한지, 거의 완성인지 구분 불가
- **동기 부여 저하**: 전체 성과가 시각화되지 않아 성취감 경험 어려움

**레퍼런스 비교**:
- **Linear**: 상단에 "Active", "Backlog", "Done" 요약 카운터 + 진행률 바
- **GitHub Projects**: Dashboard view에서 전체 이슈/PR 상태를 한 화면에 표시
- **Notion**: Database view에서 필터/그룹화로 전체 현황 즉시 파악 가능

**개선 필요성**: 🔴 긴급 - 사용자가 시스템의 가치를 느끼는 첫 단계

---

### 2. 우선순위 및 중요도 관리 부재

**문제점 설명**:
- 현재 상태 필드: `active | paused | completed | difficult`만 존재
- 우선순위(priority), 중요도(importance), 긴급도(urgency) 개념 없음
- 프로젝트 간 상대적 중요도를 판단할 방법이 없음

**사용자 경험 영향**:
- **선택 마비**: 5개 active 프로젝트 중 어디서부터 시작할지 결정 불가
- **비효율적 시간 배분**: 중요하지 않은 프로젝트에 시간 낭비 가능성
- **전략적 사고 부재**: "왜 이 프로젝트를 하는가?"에 대한 맥락 손실

**레퍼런스 비교**:
- **Eisenhower Matrix**: 중요도 × 긴급도 2차원 매트릭스로 우선순위 시각화
- **Linear**: Priority (Urgent/High/Medium/Low) + Labels로 다차원 분류
- **JIRA**: Priority 필드 + Custom fields로 비즈니스 가치 추적

**개선 필요성**: 🟡 중요 - 효과적인 시간 관리의 핵심

---

### 3. 진행 상황 메트릭 부족

**문제점 설명**:
- 진행률 계산: 단순히 `(완료된 단계 / 전체 단계) * 100%`
- 시간 기반 메트릭 없음: Lead Time, Cycle Time, 단계별 소요 시간 등
- 병목 지점 식별 불가: 어느 단계에서 오래 걸리는지 알 수 없음

**사용자 경험 영향**:
- **예측 불가능성**: "이 프로젝트 언제 끝나나요?" → 답할 수 없음
- **문제 인지 지연**: 특정 단계에서 2주째 멈춰있어도 알림 없음
- **학습 기회 상실**: 과거 프로젝트 데이터로부터 배울 수 없음 (속도 개선 불가)

**레퍼런스 비교**:
- **JIRA**: Velocity chart (스프린트당 완료 작업량), Burndown chart
- **Linear**: Cycle Time 추적으로 단계별 소요 시간 분석
- **GitHub Projects**: Insights에서 이슈 완료 트렌드, 평균 완료 시간 제공

**개선 필요성**: 🟡 중요 - 데이터 기반 의사결정 기반

---

### 4. WIP(Work In Progress) 제한 없음

**문제점 설명**:
- 사용자가 무제한으로 프로젝트를 "active" 상태로 생성 가능
- 칸반 철학의 핵심 원칙(WIP 제한)이 구현되지 않음
- 멀티태스킹으로 인한 생산성 저하 방지 메커니즘 없음

**사용자 경험 영향**:
- **집중력 분산**: 10개 active 프로젝트 → 하나도 제대로 완료 못함
- **완료율 저하**: 새 프로젝트 계속 추가 → 기존 프로젝트 방치
- **번아웃**: "할 일이 너무 많다"는 압박감 증가

**레퍼런스 비교**:
- **Kanban 기본 원칙**: "In Progress" 컬럼에 최대 3-5개 제한
- **Trello**: Power-Up으로 WIP 제한 기능 제공
- **Personal Kanban**: "Stop Starting, Start Finishing" 철학 강조

**개선 필요성**: 🟢 장기 - 건강한 작업 습관 형성

---

### 5. 협업 및 책임 소유 구조 미흡

**문제점 설명**:
- `participants` 필드: 단순 문자열 배열 (`string[]`)
- 역할 구분 없음: 누가 리더인지, 누가 담당자인지 불명확
- 단계별 책임자 배정 불가능
- 사용자 참조(user reference) 없음: 실제 사용자 ID와 연결되지 않음

**사용자 경험 영향**:
- **책임 회피**: "이거 누가 하기로 했지?" → 불명확한 소유권
- **알림 불가능**: 특정 단계 담당자에게 알림을 보낼 수 없음
- **팀 협업 한계**: 혼자 쓰기엔 괜찮지만, 팀 단위 사용 불가능

**레퍼런스 비교**:
- **Linear**: Assignee(담당자) + Subscribers(관심있는 사람들) 구분
- **GitHub Issues**: Assignees (복수 지정 가능) + Reviewers
- **Asana**: Task owner + Collaborators + Followers 계층 구조

**개선 필요성**: 🟢 장기 - 팀 협업 기능 확장 시 필수

---

## B. 개선안 제안 (우선순위별)

### 🔴 긴급 (1주 내 적용 가능)

#### 1-1. 프로젝트 요약 대시보드 추가

**구현 방법**:
```typescript
// 새로운 컴포넌트: ProjectDashboard.tsx
interface ProjectSummary {
  total: number;
  active: number;
  paused: number;
  completed: number;
  difficult: number;
  avgProgress: number; // 평균 진행률
}

function calculateSummary(projects: DevProject[]): ProjectSummary {
  return {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    paused: projects.filter(p => p.status === 'paused').length,
    completed: projects.filter(p => p.status === 'completed').length,
    difficult: projects.filter(p => p.status === 'difficult').length,
    avgProgress: projects.reduce((sum, p) => {
      const completedStages = p.stages.filter(s => s.isCompleted).length;
      return sum + (completedStages / p.stages.length) * 100;
    }, 0) / projects.length || 0,
  };
}
```

**UI 구조** (DeveloperPage.tsx 상단에 삽입):
```tsx
{/* 프로젝트 요약 대시보드 */}
<div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg mb-4">
  <div className="grid grid-cols-2 gap-3 mb-3">
    <div className="bg-white p-3 rounded-lg shadow-sm">
      <div className="text-2xl font-bold text-gray-900">{summary.active}</div>
      <div className="text-xs text-gray-600">진행중</div>
    </div>
    <div className="bg-white p-3 rounded-lg shadow-sm">
      <div className="text-2xl font-bold text-green-600">{summary.completed}</div>
      <div className="text-xs text-gray-600">완료됨</div>
    </div>
    <div className="bg-white p-3 rounded-lg shadow-sm">
      <div className="text-2xl font-bold text-yellow-600">{summary.paused}</div>
      <div className="text-xs text-gray-600">보류됨</div>
    </div>
    <div className="bg-white p-3 rounded-lg shadow-sm">
      <div className="text-2xl font-bold text-red-600">{summary.difficult}</div>
      <div className="text-xs text-gray-600">어려움</div>
    </div>
  </div>

  {/* 전체 평균 진행률 */}
  <div className="bg-white p-3 rounded-lg shadow-sm">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-gray-600">전체 평균 진행률</span>
      <span className="text-sm font-semibold">{summary.avgProgress.toFixed(0)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full"
        style={{ width: `${summary.avgProgress}%` }}
      />
    </div>
  </div>
</div>
```

**예상 효과**:
- ✅ 진입 3초 내 전체 현황 파악 가능
- ✅ 스크롤 없이 핵심 정보 즉시 접근
- ✅ 완료 프로젝트 수 증가 시각화로 성취감 제공

---

#### 1-2. 프로젝트 정렬 및 퀵 필터 개선

**구현 방법**:
```typescript
// 정렬 옵션 추가
type ProjectSortOption =
  | 'recent'       // 최근 수정일
  | 'progress'     // 진행률 높은 순
  | 'name'         // 이름 가나다순
  | 'status';      // 상태별 (active → paused → difficult → completed)

// ProjectCard에 "진행 중 단계" 표시 추가
function getCurrentStage(project: DevProject): string | null {
  const nextIncomplete = project.stages.find(s => !s.isCompleted);
  return nextIncomplete ? nextIncomplete.description : null;
}
```

**UI 개선**:
```tsx
{/* ProjectCard.tsx 헤더 섹션에 추가 */}
{project.status === 'active' && getCurrentStage(project) && (
  <div className="mt-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
    ⏳ 진행 중: {getCurrentStage(project)}
  </div>
)}
```

**예상 효과**:
- ✅ "거의 완성된" 프로젝트 우선 정렬로 완료 촉진
- ✅ 현재 작업 중인 단계 명시로 컨텍스트 전환 비용 감소

---

### 🟡 중요 (2-4주)

#### 2-1. 우선순위 및 중요도 필드 추가

**데이터 구조 개선**:
```typescript
// developer.ts에 추가
export type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low';
export type ProjectImportance = 'critical' | 'important' | 'nice-to-have';

export interface DevProject {
  // ... 기존 필드
  priority?: ProjectPriority;       // 긴급도
  importance?: ProjectImportance;   // 중요도
  deadline?: string | null;         // 목표 완료일
  estimatedHours?: number | null;   // 예상 소요 시간
}

export const PROJECT_PRIORITY_CONFIG: Record<ProjectPriority, { label: string; color: string }> = {
  urgent: { label: '🔥 긴급', color: 'bg-red-100 text-red-800' },
  high: { label: '⚡ 높음', color: 'bg-orange-100 text-orange-800' },
  medium: { label: '➡️ 보통', color: 'bg-blue-100 text-blue-800' },
  low: { label: '📦 낮음', color: 'bg-gray-100 text-gray-600' },
};
```

**UI 구현 - Eisenhower Matrix View**:
```tsx
// EisenhowerMatrixView.tsx (새 컴포넌트)
<div className="grid grid-cols-2 gap-2">
  {/* Q1: Urgent & Important */}
  <div className="border-2 border-red-300 bg-red-50 p-3 rounded-lg">
    <h4 className="text-xs font-semibold text-red-700 mb-2">🔥 긴급 & 중요</h4>
    {projectsQ1.map(p => <MiniProjectCard key={p.id} project={p} />)}
  </div>

  {/* Q2: Not Urgent but Important */}
  <div className="border-2 border-blue-300 bg-blue-50 p-3 rounded-lg">
    <h4 className="text-xs font-semibold text-blue-700 mb-2">📅 중요 (계획)</h4>
    {projectsQ2.map(p => <MiniProjectCard key={p.id} project={p} />)}
  </div>

  {/* Q3: Urgent but Not Important */}
  <div className="border-2 border-yellow-300 bg-yellow-50 p-3 rounded-lg">
    <h4 className="text-xs font-semibold text-yellow-700 mb-2">⚡ 긴급 (위임)</h4>
    {projectsQ3.map(p => <MiniProjectCard key={p.id} project={p} />)}
  </div>

  {/* Q4: Neither Urgent nor Important */}
  <div className="border-2 border-gray-300 bg-gray-50 p-3 rounded-lg">
    <h4 className="text-xs font-semibold text-gray-600 mb-2">📦 낮은 우선순위</h4>
    {projectsQ4.map(p => <MiniProjectCard key={p.id} project={p} />)}
  </div>
</div>
```

**마이그레이션 SQL**:
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_project_priority.sql
ALTER TABLE dev_projects
ADD COLUMN priority TEXT CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
ADD COLUMN importance TEXT CHECK (importance IN ('critical', 'important', 'nice-to-have')),
ADD COLUMN deadline TIMESTAMPTZ,
ADD COLUMN estimated_hours INTEGER;

-- 기존 데이터에 기본값 설정
UPDATE dev_projects
SET priority = 'medium', importance = 'important'
WHERE priority IS NULL;
```

**기대 효과**:
- ✅ 전략적 사고 촉진: "왜 이 프로젝트를 하는가?" 명확화
- ✅ 시간 배분 최적화: 중요한 일에 집중 가능
- ✅ 스트레스 감소: 긴급하지 않은 일 분리로 심리적 부담 완화

---

#### 2-2. 시간 추적 및 메트릭 시스템

**데이터 구조**:
```typescript
// ProjectStage에 시간 추적 필드 추가
export interface ProjectStage {
  id: string;
  order: number;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;

  // 새 필드
  startedAt: string | null;     // 단계 시작 시간
  estimatedDays?: number;       // 예상 소요 일수
  actualDays?: number;          // 실제 소요 일수 (자동 계산)
}

// 프로젝트 메트릭 계산 유틸리티
interface ProjectMetrics {
  leadTime: number;              // 시작부터 완료까지 총 일수
  cycleTime: number;             // 작업 시작부터 완료까지 실제 일수
  stageVelocity: number;         // 일평균 완료 단계 수
  bottleneckStage: string | null; // 가장 오래 걸린 단계
  predictedCompletion: Date | null; // 완료 예상일
}

function calculateMetrics(project: DevProject): ProjectMetrics {
  // 구현...
}
```

**UI - 프로젝트 인사이트 섹션**:
```tsx
{/* ProjectCard 확장 영역에 추가 */}
<div className="mt-4 p-3 bg-blue-50 rounded-lg">
  <h5 className="text-xs font-semibold text-gray-700 mb-2">📊 프로젝트 인사이트</h5>

  <div className="grid grid-cols-2 gap-2 text-xs">
    <div>
      <span className="text-gray-600">총 소요 시간:</span>
      <span className="ml-1 font-semibold">{metrics.leadTime}일</span>
    </div>
    <div>
      <span className="text-gray-600">평균 단계 속도:</span>
      <span className="ml-1 font-semibold">{metrics.stageVelocity.toFixed(1)}일/단계</span>
    </div>
  </div>

  {metrics.bottleneckStage && (
    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
      ⚠️ 병목 단계: <strong>{metrics.bottleneckStage}</strong> (가장 오래 걸림)
    </div>
  )}

  {metrics.predictedCompletion && (
    <div className="mt-2 text-xs text-gray-600">
      🎯 예상 완료일: {formatDate(metrics.predictedCompletion)}
    </div>
  )}
</div>
```

**기대 효과**:
- ✅ 예측 가능성 향상: "언제 끝나나요?" 질문에 답할 수 있음
- ✅ 병목 인지: 특정 단계에서 지체되면 시각적 피드백
- ✅ 지속적 개선: 과거 데이터 기반 프로세스 최적화

---

### 🟢 장기 (1-3개월)

#### 3-1. 칸반 보드 뷰 + WIP 제한

**비전**:
```tsx
// KanbanBoardView.tsx (새 뷰 모드)
<div className="flex gap-4 overflow-x-auto pb-4">
  {/* To Do 컬럼 */}
  <div className="min-w-[280px] bg-gray-50 p-3 rounded-lg">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-semibold text-gray-700">📋 To Do</h4>
      <span className="text-xs text-gray-500">{todoProjects.length}</span>
    </div>
    <div className="space-y-2">
      {todoProjects.map(p => <ProjectKanbanCard key={p.id} project={p} />)}
    </div>
  </div>

  {/* In Progress 컬럼 (WIP 제한 적용) */}
  <div className="min-w-[280px] bg-blue-50 p-3 rounded-lg border-2 border-blue-200">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-semibold text-blue-700">🚧 In Progress</h4>
      <span className={`text-xs font-semibold ${
        inProgressProjects.length >= WIP_LIMIT ? 'text-red-600' : 'text-blue-600'
      }`}>
        {inProgressProjects.length} / {WIP_LIMIT}
      </span>
    </div>

    {inProgressProjects.length >= WIP_LIMIT && (
      <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
        ⚠️ WIP 한계 도달! 진행 중인 프로젝트를 먼저 완료하세요.
      </div>
    )}

    <div className="space-y-2">
      {inProgressProjects.map(p => <ProjectKanbanCard key={p.id} project={p} />)}
    </div>
  </div>

  {/* Done 컬럼 */}
  <div className="min-w-[280px] bg-green-50 p-3 rounded-lg">
    <div className="flex items-center justify-between mb-3">
      <h4 className="font-semibold text-green-700">✅ Done</h4>
      <span className="text-xs text-gray-500">{doneProjects.length}</span>
    </div>
    <div className="space-y-2">
      {doneProjects.map(p => <ProjectKanbanCard key={p.id} project={p} />)}
    </div>
  </div>
</div>
```

**WIP 제한 설정**:
```typescript
// 사용자 설정으로 관리
interface UserPreferences {
  wipLimit: number; // 기본값 3
  enableWipWarning: boolean;
  autoArchiveCompleted: boolean; // 완료 프로젝트 자동 아카이브
}
```

---

#### 3-2. 협업 기능 - 역할 기반 참여자 관리

**데이터 구조 개선**:
```typescript
// participants를 객체 배열로 변경
export interface ProjectParticipant {
  userId: string;              // Supabase auth user ID
  displayName: string;
  role: 'owner' | 'contributor' | 'reviewer';
  joinedAt: string;
}

export interface DevProject {
  // participants: string[]; // 삭제
  participants: ProjectParticipant[]; // 교체

  // 단계별 담당자
  stages: ProjectStageWithAssignee[];
}

export interface ProjectStageWithAssignee extends ProjectStage {
  assignedTo?: string; // userId
}
```

**마이그레이션**:
```sql
-- participants를 JSONB 배열로 변경
ALTER TABLE dev_projects
DROP COLUMN participants,
ADD COLUMN participants JSONB DEFAULT '[]'::jsonb;

-- stages에 assigned_to 컬럼 추가 (JSONB 내부 구조 업데이트)
-- 예: stages[0].assigned_to = 'user-uuid'
```

**UI - 참여자 배정**:
```tsx
{/* ProjectFormModal.tsx - 참여자 섹션 개선 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    팀원 배정
  </label>

  {participants.map((participant, idx) => (
    <div key={idx} className="flex gap-2 mb-2">
      <select
        value={participant.userId}
        onChange={(e) => handleParticipantChange(idx, 'userId', e.target.value)}
        className="flex-1 px-3 py-2 border rounded-lg"
      >
        <option value="">팀원 선택...</option>
        {teamMembers.map(member => (
          <option key={member.id} value={member.id}>{member.displayName}</option>
        ))}
      </select>

      <select
        value={participant.role}
        onChange={(e) => handleParticipantChange(idx, 'role', e.target.value)}
        className="w-32 px-3 py-2 border rounded-lg"
      >
        <option value="owner">👑 오너</option>
        <option value="contributor">👨‍💻 기여자</option>
        <option value="reviewer">👀 리뷰어</option>
      </select>
    </div>
  ))}
</div>
```

---

## C. 구체적인 UI/UX 개선안

### 개선 시나리오: "개발자 홈 화면 진입 → 5초 내 중요 정보 파악"

#### 현재 경험 (Before)
```
1. 페이지 로드
2. "프로젝트" 섹션 스크롤
3. 첫 번째 카드 클릭하여 확장
4. 진행률 확인 (50%)
5. 두 번째 카드 클릭
6. ... (반복)
7. 10개 카드 모두 확인 후 "아, 3개는 거의 다 됐네" 인지
```
**총 소요 시간**: ~30초
**인지 부하**: 높음 (각 카드의 정보를 기억하고 비교해야 함)

---

#### 개선 후 경험 (After)

**화면 구조** (모바일 퍼스트):
```
┌─────────────────────────────┐
│  📊 프로젝트 현황            │
│  ┌─────┬─────┬─────┬─────┐  │
│  │ 진행│ 완료│ 보류│어려움│  │
│  │  3 │  5 │  1 │  1  │  │
│  └─────┴─────┴─────┴─────┘  │
│                             │
│  전체 평균 진행률 68% ████▒  │
│                             │
│  🔥 긴급 프로젝트 (2)       │
│  • [92%] 채팅 기능 완성     │
│  • [45%] 검색 최적화        │
│                             │
│  🎯 추천: "채팅 기능" 먼저! │
│  (이번주 완료 가능)          │
└─────────────────────────────┘
│                             │
│  📋 모든 프로젝트 (10)      │
│  [정렬: 진행률 높은 순 ▼]   │
│                             │
│  🚀 채팅 기능 완성 [92%] 🔥│
│  ⏳ 진행중: "실시간 알림"    │
│  └──────────────────────────┘
```

**정보 계층 구조**:
1. **Level 1 (최상단)**: 요약 숫자 → 3초 내 전체 현황 파악
2. **Level 2 (중간)**: 긴급 프로젝트 + AI 추천 → 즉각 행동 유도
3. **Level 3 (하단)**: 전체 리스트 → 필요 시 상세 탐색

---

### 인터랙션 플로우

#### 플로우 1: 프로젝트 우선순위 설정
```
[사용자 행동]
1. 프로젝트 카드 "수정" 버튼 클릭
2. 모달에서 "우선순위" 탭 선택

[시스템 반응]
3. Eisenhower Matrix 시각화 표시
4. 현재 프로젝트 위치 하이라이트
5. 드래그 앤 드롭 또는 버튼으로 위치 변경

[저장 후]
6. 대시보드에서 프로젝트 자동 재정렬
7. "🔥 긴급 & 중요" 섹션에 즉시 표시
```

#### 플로우 2: 병목 단계 인지
```
[자동 감지]
1. 시스템이 단계별 소요 시간 계산
2. "데이터베이스 설계" 단계가 5일째 미완료
3. 평균 단계 완료 시간(2일) 대비 250% 초과

[사용자 알림]
4. ProjectCard에 ⚠️ 아이콘 표시
5. 확장 시 "병목 단계: 데이터베이스 설계 (5일 경과)" 메시지
6. "도움이 필요하신가요?" 액션 버튼 제공

[선택적 행동]
7. "어려움" 상태로 변경 또는
8. 댓글로 팀원에게 도움 요청
```

---

## D. 데이터 구조 개선안

### 현재 구조의 한계

```typescript
// ❌ 문제점들
export interface DevProject {
  participants: string[];  // 1. 타입 안전성 부족 (역할 불명확)
  status: ProjectStatus;   // 2. 우선순위 정보 없음
  stages: ProjectStage[];  // 3. 시간 추적 불가능
  // 4. 메트릭 데이터 없음
  // 5. 태그/라벨 시스템 없음
}

export interface ProjectStage {
  isCompleted: boolean;
  completedAt: string | null;
  // 6. 시작 시간, 담당자 없음
  // 7. 예상 vs 실제 소요시간 비교 불가
}
```

---

### 개선된 타입 정의

```typescript
// ✅ 개선된 구조
import type { Database } from '@/lib/supabase/database.types';

// =============================================================================
// Enums & Union Types (확장)
// =============================================================================

export type ProjectPriority = 'urgent' | 'high' | 'medium' | 'low';
export type ProjectImportance = 'critical' | 'important' | 'nice-to-have';
export type ParticipantRole = 'owner' | 'contributor' | 'reviewer';
export type ProjectViewMode = 'list' | 'kanban' | 'matrix'; // UI 뷰 모드

// =============================================================================
// 핵심 인터페이스 (확장)
// =============================================================================

export interface ProjectParticipant {
  userId: string;              // Supabase Auth user ID
  displayName: string;         // 표시 이름
  avatarUrl?: string;          // 프로필 이미지
  role: ParticipantRole;       // 역할
  joinedAt: string;            // 참여 시작일
  contribution?: number;       // 기여도 % (자동 계산)
}

export interface ProjectStageEnhanced {
  // 기존 필드
  id: string;
  order: number;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;

  // 시간 추적
  startedAt: string | null;    // 단계 시작 시간
  estimatedDays?: number;      // 예상 소요 일수
  actualDays?: number;         // 실제 소요 일수 (자동 계산)

  // 담당자
  assignedTo?: string;         // userId

  // 상태
  isBlocked?: boolean;         // 블로킹 여부
  blockerReason?: string;      // 블로킹 이유
}

export interface DevProjectEnhanced {
  // 기존 필드
  id: string;
  userId: string | null;       // 생성자
  name: string;
  goal: string;
  startDate: string;
  status: ProjectStatus;
  sourceIdeaId: string | null;
  createdAt: string;
  updatedAt: string;

  // 개선된 필드
  participants: ProjectParticipant[];  // 역할 기반 참여자
  stages: ProjectStageEnhanced[];      // 시간 추적 가능 단계

  // 새로운 필드 - 우선순위
  priority: ProjectPriority;           // 긴급도
  importance: ProjectImportance;       // 중요도
  deadline?: string | null;            // 목표 완료일

  // 새로운 필드 - 메타데이터
  tags?: string[];                     // 프로젝트 태그 (예: "frontend", "bug-fix")
  estimatedHours?: number;             // 총 예상 소요 시간
  actualHours?: number;                // 총 실제 소요 시간 (자동 계산)

  // 새로운 필드 - 협업
  isPublic?: boolean;                  // 공개 프로젝트 여부
  allowComments?: boolean;             // 댓글 허용 여부

  // 새로운 필드 - 아카이브
  isArchived?: boolean;                // 아카이브 여부
  archivedAt?: string | null;          // 아카이브 시간
}

// =============================================================================
// 계산된 메트릭 (런타임)
// =============================================================================

export interface ProjectMetrics {
  // 진행 메트릭
  progressPercent: number;             // 진행률 (0-100)
  completedStages: number;             // 완료된 단계 수
  totalStages: number;                 // 전체 단계 수

  // 시간 메트릭
  leadTime: number;                    // 시작부터 완료까지 총 일수
  cycleTime: number;                   // 작업 시작부터 완료까지 실제 일수
  stageVelocity: number;               // 일평균 완료 단계 수 (단계/일)

  // 병목 분석
  currentStage: ProjectStageEnhanced | null;  // 현재 진행 중인 단계
  bottleneckStage: ProjectStageEnhanced | null; // 가장 오래 걸린 단계
  longestStageTime: number;            // 최장 단계 소요 시간 (일)

  // 예측
  predictedCompletionDate: Date | null; // 완료 예상일
  remainingDays: number | null;        // 남은 예상 일수
  onTrack: boolean;                    // 일정 내 완료 가능 여부

  // 팀 메트릭
  activeContributors: number;          // 활동 중인 기여자 수
  ownerName: string;                   // 오너 이름
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

export function calculateProjectMetrics(project: DevProjectEnhanced): ProjectMetrics {
  const completedStages = project.stages.filter(s => s.isCompleted).length;
  const totalStages = project.stages.length;
  const progressPercent = totalStages > 0 ? (completedStages / totalStages) * 100 : 0;

  // 현재 진행 중인 단계 (첫 번째 미완료 단계)
  const currentStage = project.stages.find(s => !s.isCompleted) || null;

  // 병목 단계 (완료된 단계 중 가장 오래 걸린 것)
  const completedStagesWithTime = project.stages
    .filter(s => s.isCompleted && s.actualDays)
    .sort((a, b) => (b.actualDays || 0) - (a.actualDays || 0));
  const bottleneckStage = completedStagesWithTime[0] || null;
  const longestStageTime = bottleneckStage?.actualDays || 0;

  // Lead Time 계산
  const startDate = new Date(project.startDate);
  const endDate = project.status === 'completed'
    ? new Date(project.updatedAt)
    : new Date();
  const leadTime = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Cycle Time (실제 작업 일수)
  const cycleTime = project.stages.reduce((sum, s) => sum + (s.actualDays || 0), 0);

  // Velocity (완료된 단계 / 경과 일수)
  const stageVelocity = leadTime > 0 ? completedStages / leadTime : 0;

  // 완료 예상일 계산
  let predictedCompletionDate: Date | null = null;
  let remainingDays: number | null = null;
  let onTrack = true;

  if (project.status !== 'completed' && stageVelocity > 0) {
    const remainingStages = totalStages - completedStages;
    remainingDays = Math.ceil(remainingStages / stageVelocity);
    predictedCompletionDate = new Date(Date.now() + remainingDays * 24 * 60 * 60 * 1000);

    // 목표 마감일과 비교
    if (project.deadline) {
      const deadline = new Date(project.deadline);
      onTrack = predictedCompletionDate <= deadline;
    }
  }

  // 팀 메트릭
  const activeContributors = project.participants.filter(p => p.role !== 'reviewer').length;
  const owner = project.participants.find(p => p.role === 'owner');

  return {
    progressPercent: Math.round(progressPercent),
    completedStages,
    totalStages,
    leadTime,
    cycleTime,
    stageVelocity,
    currentStage,
    bottleneckStage,
    longestStageTime,
    predictedCompletionDate,
    remainingDays,
    onTrack,
    activeContributors,
    ownerName: owner?.displayName || '미지정',
  };
}

// Eisenhower Matrix 분류 함수
export function categorizeProjectsByMatrix(
  projects: DevProjectEnhanced[]
): {
  q1: DevProjectEnhanced[]; // Urgent & Important
  q2: DevProjectEnhanced[]; // Not Urgent but Important
  q3: DevProjectEnhanced[]; // Urgent but Not Important
  q4: DevProjectEnhanced[]; // Neither
} {
  const result = { q1: [], q2: [], q3: [], q4: [] };

  projects.forEach(project => {
    const isUrgent = project.priority === 'urgent' || project.priority === 'high';
    const isImportant = project.importance === 'critical' || project.importance === 'important';

    if (isUrgent && isImportant) result.q1.push(project);
    else if (!isUrgent && isImportant) result.q2.push(project);
    else if (isUrgent && !isImportant) result.q3.push(project);
    else result.q4.push(project);
  });

  return result;
}
```

---

### 데이터베이스 마이그레이션 계획

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_project_management_v2.sql

-- 1. 새 컬럼 추가
ALTER TABLE dev_projects
ADD COLUMN priority TEXT DEFAULT 'medium'
  CHECK (priority IN ('urgent', 'high', 'medium', 'low')),
ADD COLUMN importance TEXT DEFAULT 'important'
  CHECK (importance IN ('critical', 'important', 'nice-to-have')),
ADD COLUMN deadline TIMESTAMPTZ,
ADD COLUMN estimated_hours INTEGER,
ADD COLUMN actual_hours INTEGER,
ADD COLUMN tags TEXT[] DEFAULT '{}',
ADD COLUMN is_public BOOLEAN DEFAULT false,
ADD COLUMN allow_comments BOOLEAN DEFAULT true,
ADD COLUMN is_archived BOOLEAN DEFAULT false,
ADD COLUMN archived_at TIMESTAMPTZ;

-- 2. participants 구조 변경 (JSONB)
-- 기존: participants TEXT[]
-- 변경: participants JSONB (객체 배열)
ALTER TABLE dev_projects
DROP COLUMN participants,
ADD COLUMN participants JSONB DEFAULT '[]'::jsonb;

-- 3. stages 구조 변경 (JSONB 내부 필드 추가)
-- 기존 stages 컬럼은 JSONB이므로 애플리케이션 레벨에서 처리
-- stages[].started_at, stages[].estimated_days, stages[].actual_days,
-- stages[].assigned_to, stages[].is_blocked, stages[].blocker_reason 추가

-- 4. 인덱스 추가 (검색 성능 향상)
CREATE INDEX idx_dev_projects_priority ON dev_projects(priority);
CREATE INDEX idx_dev_projects_importance ON dev_projects(importance);
CREATE INDEX idx_dev_projects_deadline ON dev_projects(deadline);
CREATE INDEX idx_dev_projects_is_archived ON dev_projects(is_archived);
CREATE INDEX idx_dev_projects_tags ON dev_projects USING GIN(tags);

-- 5. 기존 데이터 마이그레이션 (예시)
-- 기존 participants (TEXT[])를 JSONB로 변환
-- UPDATE dev_projects
-- SET participants = (
--   SELECT jsonb_agg(
--     jsonb_build_object(
--       'userId', old_participant,
--       'displayName', old_participant,
--       'role', 'contributor',
--       'joinedAt', created_at
--     )
--   )
--   FROM unnest(old_participants_column) AS old_participant
-- )
-- WHERE participants IS NULL;

-- 6. RLS 정책 업데이트 (필요 시)
-- 공개 프로젝트 읽기 허용
CREATE POLICY "Public projects are viewable by everyone"
ON dev_projects FOR SELECT
USING (is_public = true OR auth.uid() = user_id);

-- 아카이브된 프로젝트 숨김
CREATE POLICY "Archived projects hidden by default"
ON dev_projects FOR SELECT
USING (is_archived = false OR auth.uid() = user_id);
```

---

## E. 구현 로드맵

### Phase 1: 긴급 개선 (Week 1)

**목표**: 사용자가 즉시 가치를 느낄 수 있는 개선

- [ ] **Task 1.1**: `ProjectDashboard.tsx` 컴포넌트 생성
  - 요약 카드 (진행중/완료/보류/어려움)
  - 전체 평균 진행률 바
  - DeveloperPage.tsx에 통합

- [ ] **Task 1.2**: 프로젝트 정렬 기능 추가
  - 정렬 옵션: recent / progress / status
  - 현재 진행 중인 단계 표시

- [ ] **Task 1.3**: 시각적 피드백 개선
  - 진행률 바 색상 그라데이션
  - 상태 아이콘 개선

**예상 시간**: 8-12시간

---

### Phase 2: 중요 개선 (Week 2-4)

**목표**: 전략적 사고와 데이터 기반 의사결정 지원

- [ ] **Task 2.1**: DB 마이그레이션
  - `priority`, `importance`, `deadline` 컬럼 추가
  - 기존 데이터 기본값 설정

- [ ] **Task 2.2**: 우선순위 관리 UI
  - ProjectFormModal에 우선순위/중요도 필드 추가
  - Eisenhower Matrix 뷰 프로토타입

- [ ] **Task 2.3**: 시간 추적 기초
  - `startedAt`, `estimatedDays` 필드 추가
  - 단계별 소요 시간 자동 계산
  - ProjectCard에 메트릭 섹션 추가

- [ ] **Task 2.4**: 메트릭 계산 유틸리티
  - `calculateProjectMetrics()` 함수 구현
  - Lead Time, Cycle Time, Velocity 계산

**예상 시간**: 20-30시간

---

### Phase 3: 장기 비전 (Month 2-3)

**목표**: 협업 및 고급 프로젝트 관리 기능

- [ ] **Task 3.1**: 칸반 보드 뷰
  - `KanbanBoardView.tsx` 컴포넌트
  - 드래그 앤 드롭 지원 (react-beautiful-dnd)
  - WIP 제한 설정

- [ ] **Task 3.2**: 협업 기능
  - `participants` JSONB 변환
  - 역할 기반 권한 (owner/contributor/reviewer)
  - 단계별 담당자 배정

- [ ] **Task 3.3**: 고급 메트릭 대시보드
  - 프로젝트 완료 트렌드 차트
  - 병목 분석 리포트
  - Velocity 추이 그래프

**예상 시간**: 40-60시간

---

## F. 성공 지표 (Success Metrics)

### 정량적 지표

| 지표 | 현재 | 목표 (Phase 1) | 목표 (Phase 2) |
|------|------|----------------|----------------|
| **프로젝트 완료율** | 알 수 없음 | +20% | +40% |
| **평균 프로젝트 소요 시간** | 측정 불가 | 측정 시작 | 10% 단축 |
| **사용자 진입 → 핵심 정보 파악 시간** | ~30초 | <5초 | <3초 |
| **병목 단계 인지 시간** | 수동 확인 | 자동 알림 | 예측 알림 |

### 정성적 지표

- **Phase 1**: "어떤 프로젝트부터 할지 바로 알 수 있다"
- **Phase 2**: "프로젝트가 언제 끝날지 예측 가능하다"
- **Phase 3**: "팀원과 함께 프로젝트를 관리할 수 있다"

---

## G. 참고 자료

### 프로젝트 관리 철학
- **Getting Things Done (GTD)**: David Allen
- **Personal Kanban**: Jim Benson
- **Eisenhower Matrix**: Dwight D. Eisenhower

### 도구 레퍼런스
- **Linear**: https://linear.app (경량 이슈 트래커)
- **GitHub Projects**: https://github.com/features/issues (개발자 친화적)
- **Notion**: https://notion.so (유연한 데이터베이스)

### 메트릭 관련
- **Lead Time vs Cycle Time**: https://kanbanize.com/lean-management/lean-manufacturing/what-is-lead-time
- **Velocity**: https://www.scrum.org/resources/blog/what-velocity

---

## 마무리

이 개선 계획은 **점진적 발전(Progressive Enhancement)** 원칙을 따릅니다:

1. **Phase 1**: 기존 시스템 유지하며 즉각적 가치 제공
2. **Phase 2**: 데이터 구조 확장으로 새로운 기능 지원
3. **Phase 3**: 고급 기능으로 장기 비전 실현

각 단계는 **독립적으로 배포 가능**하며, 사용자 피드백에 따라 우선순위 조정 가능합니다.

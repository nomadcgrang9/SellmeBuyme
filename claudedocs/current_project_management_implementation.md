# 현재 프로젝트 관리 기능 구현 현황

> 작성일: 2025-11-14
> Playwright 캡처 및 코드 분석 기반 현황 파악

## 📸 현재 UI 스크린샷

캡처된 스크린샷 위치: `c:\PRODUCT\SellmeBuyme\.playwright-mcp\`
- `project-management-overview.png` - 전체 개요
- `project-management-cards.png` - 프로젝트 카드 리스트
- `project-card-expanded.png` - 확장된 카드 (구현 단계 표시)
- `project-card-comments.png` - 댓글 섹션
- `project-management-top.png` - 상단 영역

## 1. 프론트엔드 구조

### 1.1 페이지 구성 (DeveloperPage.tsx)

```
[셀바 개발자노트 헤더]
  ↓
[GitHub 배포 추적]
  ↓
[아이디어 살펴보기] (CollapsibleSection)
  ↓
[공고게시판 등록하기] (CollapsibleSection)
  ↓
[프로젝트 관리하기] (CollapsibleSection) ← 현재 분석 대상
  ├─ 필터 버튼: 전체/🟢진행중/🟡보류/✅완료/🔴어려움
  ├─ ProjectCard 컴포넌트들 (3개씩 페이지네이션)
  └─ 페이지네이션 버튼
  ↓
[팀 공유폴더]
  ↓
[모바일 오류기록]
  ↓
[+ 버튼] (FloatingActionButton)
```

**파일 위치**: `src/pages/DeveloperPage.tsx` (라인 277-333)

### 1.2 ProjectCard 컴포넌트 구조

```tsx
ProjectCard (src/components/developer/ProjectCard.tsx)
├─ 카드 헤더
│  ├─ 프로젝트명: "🚀 {name}"
│  ├─ 상태 배지: "🟢 진행중" (PROJECT_STATUS_CONFIG)
│  ├─ 참여원: "참여원: {participants.join(', ')}"
│  ├─ 시작일: "시작: {startDate}"
│  └─ 수정/삭제 버튼
├─ 진행률 표시
│  ├─ 텍스트: "진행률: {percent}% ({completed}/{total} 단계 완료)"
│  └─ 프로그레스 바 (bg-[#a8c5e0])
├─ 목표 (goal)
│  └─ 링크 자동 변환 (linkifyText)
├─ 상세보기/축소 버튼
└─ 확장 영역 (isExpanded=true 시)
   ├─ 📝 구현 단계
   │  └─ 체크박스 + 설명 리스트
   └─ 댓글 섹션 (CommentSection)
```

**현재 표시되는 정보:**
- ✅ 프로젝트명
- ✅ 상태 (진행중/보류/완료/어려움)
- ✅ 참여원 (문자열 배열)
- ✅ 시작일
- ✅ 진행률 (완료된 단계 / 전체 단계)
- ✅ 목표
- ✅ 구현 단계 체크리스트
- ✅ 댓글 기능

**표시되지 않는 정보:**
- ❌ 우선순위
- ❌ 마감일
- ❌ 예상 소요 시간
- ❌ 프로젝트 간 의존성
- ❌ 전체 프로젝트 통계/대시보드

### 1.3 ProjectFormModal 컴포넌트

```tsx
ProjectFormModal (src/components/developer/ProjectFormModal.tsx)
├─ 프로젝트명 입력 (필수)
├─ 구현 목표 입력 (textarea, 필수)
├─ 참여원 입력
│  ├─ 동적 추가/삭제
│  └─ 각 참여원: 문자열 입력
├─ 구현 단계 입력
│  ├─ 동적 추가/삭제
│  └─ 각 단계: 설명 입력
├─ 진행 상태 선택
│  └─ active/paused/completed/difficult
└─ 저장 버튼
```

**입력 가능한 필드:**
- name (프로젝트명)
- goal (구현 목표)
- participants (문자열 배열)
- stages (단계 배열: description만)
- status (상태)
- sourceIdeaId (아이디어에서 프로젝트로 변환 시)

## 2. 백엔드 구조

### 2.1 데이터베이스 스키마 (dev_projects 테이블)

```sql
dev_projects {
  id: uuid (PK)
  user_id: uuid | null  -- 익명 사용자 허용
  name: text
  goal: text
  participants: text[]  -- 단순 문자열 배열
  start_date: timestamptz
  stages: jsonb  -- ProjectStage[]
  status: project_status  -- enum: 'active'|'paused'|'completed'|'difficult'
  source_idea_id: uuid | null  -- dev_ideas FK
  created_at: timestamptz
  updated_at: timestamptz
}
```

**ProjectStage 구조 (JSONB):**
```typescript
{
  id: string
  order: number
  description: string
  is_completed: boolean
  completed_at: string | null
}
```

### 2.2 Supabase Query 함수 (developer.ts)

```typescript
// src/lib/supabase/developer.ts (라인 574-766)

createProject(ProjectFormData): DevProject
  - user_id: 인증된 사용자 ID 또는 NULL
  - stages: crypto.randomUUID()로 ID 생성
  - start_date: 현재 시각

getProjects(limit, offset): DevProject[]
  - order by created_at DESC
  - 페이지네이션 지원

getProjectById(id): DevProject
  - 단일 프로젝트 조회

updateProject(id, Partial<ProjectFormData>): DevProject
  - stages 수정 시 기존 완료 상태 초기화 (새 ID 생성)

completeProjectStage(projectId, stageId): DevProject
  - isCompleted: true
  - completedAt: 현재 시각

deleteProject(id): void
```

### 2.3 React Hook (useProjects.ts)

```typescript
// src/lib/hooks/useProjects.ts

useProjects() {
  // 상태
  allProjects: DevProject[]  // 최근 30개
  filter: ProjectStatus | 'all'
  page: number

  // 필터링
  filteredProjects = filter === 'all'
    ? allProjects
    : allProjects.filter(p => p.status === filter)

  // 페이지네이션
  ITEMS_PER_PAGE = 3
  paginatedProjects = filteredProjects.slice(0, page * 3)
  hasMore = endIndex < filteredProjects.length

  // CRUD
  createNewProject(data)
  updateProjectItem(id, data)
  deleteProjectItem(id)
  completeStage(projectId, stageId)
}
```

**정렬 방식:**
- 데이터베이스 레벨: created_at DESC (고정)
- 프론트엔드 레벨: 정렬 기능 없음

## 3. 현재 기능 요약

### ✅ 구현된 기능
1. **프로젝트 CRUD**
   - 생성: 이름, 목표, 참여원, 단계, 상태 입력
   - 조회: 최근 30개 프로젝트 로드
   - 수정: 모든 필드 수정 가능
   - 삭제: 개별 프로젝트 삭제

2. **상태 관리**
   - 4가지 상태: 진행중/보류/완료/어려움
   - 상태별 필터링

3. **진행 추적**
   - 단계별 체크박스
   - 진행률 계산 (완료/전체)
   - 완료 시각 기록

4. **협업 기능**
   - 댓글/대댓글 시스템
   - 익명 작성자 지원 (IP 해시)

5. **페이지네이션**
   - 3개씩 표시
   - "더 보기" 버튼

6. **아이디어 연동**
   - sourceIdeaId로 아이디어→프로젝트 변환

### ❌ 구현되지 않은 기능

1. **대시보드/통계**
   - 전체 프로젝트 현황 보기 없음
   - 진행 중인 프로젝트 개수 표시 없음
   - 완료율 통계 없음

2. **우선순위 관리**
   - priority 필드 없음
   - 중요도 표시 없음

3. **시간 관리**
   - 마감일(deadline) 없음
   - 예상 소요 시간 없음
   - 실제 소요 시간 추적 없음

4. **정렬 기능**
   - 생성일 외 정렬 옵션 없음
   - 우선순위별, 진행률별 정렬 불가

5. **참여원 관리**
   - 단순 문자열 배열
   - 역할 정보 없음
   - 담당 단계 할당 없음

6. **프로젝트 관계**
   - 프로젝트 간 의존성 없음
   - 상위/하위 프로젝트 구조 없음

7. **메트릭스**
   - Lead Time 없음
   - Cycle Time 없음
   - Velocity 없음

## 4. 제안된 개선안과의 연결점

### Phase 1 개선안 vs 현재 구현

| 제안 기능 | 현재 구현 | 연결 방법 |
|----------|----------|----------|
| **전체 프로젝트 현황 카드** | ❌ 없음 | 새 컴포넌트 필요: `ProjectDashboard.tsx` |
| **진행 중 프로젝트 수** | ❌ 없음 | `projects.filter(p => p.status === 'active').length` 계산 |
| **완료율** | ❌ 없음 | 전체 단계 대비 완료 단계 비율 계산 |
| **상태별 정렬** | ✅ 필터링 존재 | 기존 filter 확장 |
| **프로젝트 카드** | ✅ 존재 | `ProjectCard.tsx` 재사용 |

### Phase 2 개선안 vs 현재 구현

| 제안 기능 | 현재 구현 | 필요한 변경 |
|----------|----------|------------|
| **우선순위 필드** | ❌ 없음 | DB 스키마 변경: `priority: 'high'\|'medium'\|'low'` 추가 |
| **마감일** | ❌ 없음 | ~~DB 스키마 변경 필요~~ **제거 요청됨** |
| **Eisenhower Matrix** | ❌ 없음 | ~~urgency/importance 기반 분류~~ **제거 요청됨** |
| **예상 소요 시간** | ❌ 없음 | `estimated_hours: number` 추가 고려 |

### Phase 3 개선안 vs 현재 구현

| 제안 기능 | 현재 구현 | 필요한 변경 |
|----------|----------|------------|
| **Kanban 보드** | ❌ 없음 | 새 뷰 컴포넌트 필요 |
| **참여원 역할** | ❌ 문자열만 | `participants: { name, role }[]` 구조 변경 |
| **차트/그래프** | ❌ 없음 | 차트 라이브러리 추가 (recharts 등) |

## 5. 사용자 피드백 반영

### 제거 요청된 기능
- ❌ **마감 임박** 알림
- ❌ **주의 필요** 경고

→ 이 기능들은 원래 구현에도 없었고, 제안에서만 있었음. 제안에서 제거 필요.

### 현재 구현에서 유지할 점
- ✅ 프로젝트 카드 기반 리스트 뷰
- ✅ 상태 필터링
- ✅ 진행률 표시
- ✅ 단계별 체크박스
- ✅ 댓글 기능

## 6. 다음 단계 (코드 수정 전 확인 사항)

### 6.1 최소 개선 범위 (Phase 1 수정안)
1. **전체 프로젝트 현황 요약 카드 추가**
   - 위치: "프로젝트 관리하기" CollapsibleSection 상단
   - 표시 정보:
     - 전체 프로젝트 수
     - 진행 중인 프로젝트 수
     - 전체 완료율
   - 구현: 새 컴포넌트 `ProjectSummaryCard.tsx`

2. **정렬 옵션 추가**
   - 생성일 (기본)
   - 진행률
   - 상태별

3. **프로젝트 카드 UI 유지**
   - 기존 ProjectCard.tsx 그대로 사용

### 6.2 제외할 기능
- ❌ 마감일 관련 모든 기능
- ❌ "주의 필요" 경고
- ❌ "마감 임박" 알림
- ❌ Eisenhower Matrix (urgency 개념 제외)

### 6.3 보류할 기능 (사용자 추가 확인 필요)
- ⏸️ 우선순위 관리 (high/medium/low)
- ⏸️ 참여원 역할 시스템
- ⏸️ Kanban 보드 뷰
- ⏸️ 차트/그래프

## 7. 코드 수정 전 체크리스트

- [x] Playwright로 현재 UI 캡처 완료
- [x] 프론트엔드 구조 파악 (DeveloperPage, ProjectCard, ProjectFormModal)
- [x] 백엔드 구조 파악 (developer.ts, useProjects.ts)
- [x] 데이터베이스 스키마 확인 (dev_projects, ProjectStage)
- [x] 제안된 개선안과 현재 구현 매핑
- [x] 제거 요청 기능 확인 (마감일, 주의 필요)
- [ ] 사용자로부터 최소 개선 범위 최종 확인
- [ ] 코드 수정 시작

---

**다음 액션**: 사용자에게 현황 보고 후, 최소 개선 범위 확정 대기

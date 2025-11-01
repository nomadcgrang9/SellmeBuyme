# 개발자노트 프로젝트 관리 기능 - 백엔드 구현 가이드

## 📋 개요

이 문서는 개발자노트의 프로젝트 관리 기능을 Supabase에 구현하는 방법을 설명합니다.

## 🗂️ 파일 구조

```
supabase/
├── dev_projects_schema.sql          # 전체 스키마 (테이블 + RLS + 트리거)
├── migrations/
│   └── 20251102_create_dev_projects.sql  # 마이그레이션 파일
├── test_dev_projects.sql            # 테스트 쿼리
└── README_DEV_PROJECTS.md           # 이 파일
```

## 🚀 구현 단계

### 1단계: Supabase 대시보드 접속

1. [Supabase 대시보드](https://app.supabase.com) 접속
2. 프로젝트 선택
3. 좌측 메뉴에서 "SQL Editor" 클릭

### 2단계: 테이블 생성

#### 옵션 A: 전체 스키마 한 번에 실행 (권장)

1. `dev_projects_schema.sql` 파일의 전체 내용 복사
2. Supabase SQL 에디터에 붙여넣기
3. "Run" 버튼 클릭

#### 옵션 B: 마이그레이션 파일 사용

1. `migrations/20251102_create_dev_projects.sql` 파일 사용
2. Supabase 마이그레이션 시스템에 추가

### 3단계: 테이블 구조 확인

```sql
-- 테이블 구조 확인
SELECT * FROM information_schema.columns
WHERE table_name = 'dev_projects'
ORDER BY ordinal_position;
```

## 📊 테이블 스키마

### dev_projects 테이블

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | uuid | 프로젝트 고유 ID (자동 생성) |
| user_id | uuid | 프로젝트 소유자 ID |
| name | text | 프로젝트명 |
| goal | text | 구현 목표 |
| participants | text[] | 참여원 이름 배열 |
| start_date | timestamptz | 시작 날짜 |
| stages | jsonb | 구현 단계 (JSON 배열) |
| status | text | 진행 상태 (active/paused/completed/difficult) |
| source_idea_id | uuid | 원본 아이디어 ID (선택사항) |
| created_at | timestamptz | 생성 날짜 |
| updated_at | timestamptz | 수정 날짜 |

### stages 구조 (JSONB)

```json
[
  {
    "id": "stage-1",
    "order": 1,
    "description": "단계 설명",
    "is_completed": false,
    "completed_at": null
  }
]
```

## 🧪 테스트 방법

### 1. 테스트 데이터 삽입

```sql
-- test_dev_projects.sql의 "4. 테스트 데이터 삽입" 섹션 실행
INSERT INTO public.dev_projects (
  user_id,
  name,
  goal,
  participants,
  stages,
  status
) VALUES (
  (SELECT id FROM public.users LIMIT 1),
  '테스트 프로젝트',
  '프로젝트 테스트',
  ARRAY['김철수', '이영희'],
  '[...]'::jsonb,
  'active'
);
```

### 2. 데이터 조회

```sql
-- 모든 프로젝트 조회
SELECT * FROM public.dev_projects ORDER BY created_at DESC;

-- 특정 상태의 프로젝트만 조회
SELECT * FROM public.dev_projects WHERE status = 'active';
```

### 3. 데이터 업데이트

```sql
-- 프로젝트 상태 변경
UPDATE public.dev_projects
SET status = 'completed'
WHERE id = 'project-id';
```

### 4. 데이터 삭제

```sql
-- 프로젝트 삭제
DELETE FROM public.dev_projects
WHERE id = 'project-id';
```

## 🔐 RLS (Row Level Security) 정책

### 생성된 정책

1. **SELECT**: 모든 사용자가 모든 프로젝트 조회 가능
2. **INSERT**: 인증된 사용자만 자신의 프로젝트 생성 가능
3. **UPDATE**: 프로젝트 소유자만 수정 가능
4. **DELETE**: 프로젝트 소유자만 삭제 가능

### RLS 정책 확인

```sql
SELECT * FROM pg_policies WHERE tablename = 'dev_projects';
```

## 📈 인덱스

생성된 인덱스:

- `idx_dev_projects_user_id`: user_id로 빠른 조회
- `idx_dev_projects_status`: status로 필터링 최적화
- `idx_dev_projects_created_at`: 최신순 정렬 최적화

## 🔄 자동 업데이트 트리거

`updated_at` 컬럼은 레코드 수정 시 자동으로 현재 시간으로 업데이트됩니다.

```sql
-- 트리거 함수
CREATE OR REPLACE FUNCTION public.update_dev_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 🐛 문제 해결

### 문제: "dev_ideas 테이블을 찾을 수 없음" 에러

**해결책**: `dev_ideas` 테이블이 먼저 생성되어야 합니다.
- `dev_ideas` 테이블 생성 후 `dev_projects` 테이블 생성

### 문제: RLS 정책 충돌

**해결책**: 기존 정책 삭제 후 재생성
```sql
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.dev_projects;
-- 다시 생성...
```

### 문제: 트리거 중복 에러

**해결책**: 기존 트리거 삭제 후 재생성
```sql
DROP TRIGGER IF EXISTS update_dev_projects_updated_at ON public.dev_projects;
-- 다시 생성...
```

## 📝 프론트엔드 연동

### API 함수 위치

- `src/lib/supabase/developer.ts`

### 주요 함수

```typescript
// 프로젝트 생성
export async function createProject(project: ProjectFormData): Promise<DevProject>

// 프로젝트 목록 조회
export async function getProjects(limit: number, offset: number): Promise<DevProject[]>

// 프로젝트 상세 조회
export async function getProjectById(id: string): Promise<DevProject>

// 프로젝트 수정
export async function updateProject(id: string, data: Partial<ProjectFormData>): Promise<DevProject>

// 프로젝트 삭제
export async function deleteProject(id: string): Promise<void>

// 단계 완료 처리
export async function completeProjectStage(projectId: string, stageId: string): Promise<DevProject>
```

## ✅ 검증 체크리스트

- [ ] 테이블 생성 완료
- [ ] 인덱스 생성 완료
- [ ] RLS 정책 생성 완료
- [ ] 트리거 생성 완료
- [ ] 테스트 데이터 삽입 성공
- [ ] 데이터 조회 성공
- [ ] 데이터 업데이트 성공
- [ ] 데이터 삭제 성공
- [ ] 프론트엔드 연동 테스트 완료

## 📞 지원

문제가 발생하면:

1. 에러 메시지 확인
2. Supabase 대시보드의 "Logs" 탭에서 상세 로그 확인
3. RLS 정책 및 트리거 설정 재확인

---

**마지막 업데이트**: 2025-11-02

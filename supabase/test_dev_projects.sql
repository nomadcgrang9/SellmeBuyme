-- ============================================================================
-- 개발자노트 프로젝트 테이블 테스트 쿼리
-- ============================================================================
-- 이 파일의 쿼리들을 Supabase SQL 에디터에서 순서대로 실행하여 테스트합니다.

-- ============================================================================
-- 1. 테이블 구조 확인
-- ============================================================================
-- 테이블이 정상적으로 생성되었는지 확인
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'dev_projects'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. 인덱스 확인
-- ============================================================================
-- 생성된 인덱스 확인
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename = 'dev_projects'
ORDER BY indexname;

-- ============================================================================
-- 3. RLS 정책 확인
-- ============================================================================
-- RLS 정책이 정상적으로 생성되었는지 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'dev_projects'
ORDER BY policyname;

-- ============================================================================
-- 4. 테스트 데이터 삽입
-- ============================================================================
-- 참고: 실제 user_id는 Supabase 인증 사용자의 UUID로 대체해야 합니다.
-- 아래 쿼리는 예시입니다. 실제 user_id를 사용하여 수정하세요.

-- 테스트 프로젝트 1: 진행중
INSERT INTO public.dev_projects (
  user_id,
  name,
  goal,
  participants,
  stages,
  status
) VALUES (
  (SELECT id FROM public.users LIMIT 1),
  '셀바 모바일 앱 개선',
  '사용자 경험 개선 및 성능 최적화',
  ARRAY['김철수', '이영희', '박민준'],
  '[
    {
      "id": "stage-1",
      "order": 1,
      "description": "UI/UX 디자인 검토",
      "is_completed": true,
      "completed_at": "2025-11-01T10:00:00Z"
    },
    {
      "id": "stage-2",
      "order": 2,
      "description": "프론트엔드 개발",
      "is_completed": false,
      "completed_at": null
    },
    {
      "id": "stage-3",
      "order": 3,
      "description": "테스트 및 배포",
      "is_completed": false,
      "completed_at": null
    }
  ]'::jsonb,
  'active'
)
RETURNING id, name, status, created_at;

-- 테스트 프로젝트 2: 보류
INSERT INTO public.dev_projects (
  user_id,
  name,
  goal,
  participants,
  stages,
  status
) VALUES (
  (SELECT id FROM public.users LIMIT 1),
  '데이터 분석 대시보드',
  '사용자 행동 분석 및 통계 시각화',
  ARRAY['정수현'],
  '[
    {
      "id": "stage-1",
      "order": 1,
      "description": "데이터 수집 및 정제",
      "is_completed": true,
      "completed_at": "2025-10-28T14:30:00Z"
    },
    {
      "id": "stage-2",
      "order": 2,
      "description": "분석 알고리즘 개발",
      "is_completed": false,
      "completed_at": null
    }
  ]'::jsonb,
  'paused'
)
RETURNING id, name, status, created_at;

-- ============================================================================
-- 5. 삽입된 데이터 조회
-- ============================================================================
-- 모든 프로젝트 조회
SELECT 
  id,
  name,
  goal,
  participants,
  status,
  created_at,
  updated_at
FROM public.dev_projects
ORDER BY created_at DESC;

-- ============================================================================
-- 6. 상태별 프로젝트 조회
-- ============================================================================
-- 진행중인 프로젝트만 조회
SELECT 
  id,
  name,
  participants,
  status
FROM public.dev_projects
WHERE status = 'active'
ORDER BY created_at DESC;

-- ============================================================================
-- 7. 프로젝트 업데이트 테스트
-- ============================================================================
-- 첫 번째 프로젝트의 상태를 'completed'로 변경
UPDATE public.dev_projects
SET 
  status = 'completed',
  stages = jsonb_set(
    stages,
    '{2, is_completed}',
    'true'::jsonb
  ),
  stages = jsonb_set(
    stages,
    '{2, completed_at}',
    to_jsonb(now())
  )
WHERE name = '셀바 모바일 앱 개선'
RETURNING id, name, status, updated_at;

-- ============================================================================
-- 8. 프로젝트 삭제 테스트
-- ============================================================================
-- 주석 처리됨 - 필요시 활성화
-- DELETE FROM public.dev_projects
-- WHERE name = '데이터 분석 대시보드'
-- RETURNING id, name;

-- ============================================================================
-- 9. 최종 데이터 확인
-- ============================================================================
-- 모든 프로젝트의 최종 상태 확인
SELECT 
  id,
  name,
  goal,
  array_length(participants, 1) as participant_count,
  participants,
  status,
  jsonb_array_length(stages) as stage_count,
  created_at,
  updated_at
FROM public.dev_projects
ORDER BY created_at DESC;

-- ============================================================================
-- 10. 테이블 정리 (선택사항)
-- ============================================================================
-- 테스트 데이터 삭제
-- DELETE FROM public.dev_projects;

-- 테이블 삭제
-- DROP TABLE IF EXISTS public.dev_projects CASCADE;

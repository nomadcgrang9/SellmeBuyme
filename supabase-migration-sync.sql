🔍 로컬 마이그레이션 파일 스캔...

================================================================================

✅ 발견된 로컬 마이그레이션 파일: 25개

📋 버전 목록:
  [01] 20250102 - 20250102_create_dev_comments.sql
  [02] 20250106 - 20250106_create_error_logs.sql
  [03] 20250113 - 20250113_chat_system.sql
  [04] 20250115 - 20250115_create_bookmarks_table.sql
  [05] 20250117 - 20250117_initial_schema.sql
  [06] 20250118 - 20250118_add_job_fields.sql
  [07] 20250119 - 20250119_add_search_vectors.sql
  [08] 20250120 - 20250120_add_recommendations_cache.sql
  [09] 20250121 - 20250121_add_crawl_batch_size.sql
  [10] 20250122 - 20250122_add_promo_card_badge_color.sql
  [11] 20250123 - 20250123_create_storage_bucket.sql
  [12] 20250124 - 20250124_add_school_level_fields.sql
  [13] 20250125 - 20250125_simplify_user_profiles.sql
  [14] 20250126 - 20250126_add_gradient_color_fields.sql
  [15] 20250127 - 20250127_temp_testing_policies.sql
  [16] 20250128000000 - 20250128000000_add_fts_for_jobs.sql
  [17] 20250204 - 20250204_add_is_local_government_column.sql
  [18] 20250205 - 20250205_add_delete_policy_dev_board_submissions.sql
  [19] 20250210 - 20250210_add_talent_form_payload.sql
  [20] 20250211 - 20250211_allow_anonymous_experience_insert.sql
  [21] 20251031 - 20251031_experiences_schema.sql
  [22] 20251102 - 20251102_add_teacher_employment_type.sql
  [23] 20251105 - 20251105_landing_talent_registration.sql
  [24] 20251114 - 20251114_fix_chat_participants_rls.sql
  [25] 20251115 - 20251115_fix_chat_participants_rls_final.sql

================================================================================

📝 Supabase Dashboard SQL Editor에서 실행할 SQL:

================================================================================

-- 로컬 마이그레이션 파일과 원격 DB 동기화
-- 실행 전: SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
-- 실행 후: 다시 SELECT로 확인

-- Step 1: 기존 마이그레이션 상태 확인
SELECT *
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Step 2: 로컬에 있는 모든 마이그레이션을 원격 DB에 "적용됨" 상태로 등록
-- (이미 존재하는 버전은 무시됨)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250102', 'create_dev_comments')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250106', 'create_error_logs')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250113', 'chat_system')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250115', 'create_bookmarks_table')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250117', 'initial_schema')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250118', 'add_job_fields')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250119', 'add_search_vectors')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250120', 'add_recommendations_cache')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250121', 'add_crawl_batch_size')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250122', 'add_promo_card_badge_color')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250123', 'create_storage_bucket')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250124', 'add_school_level_fields')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250125', 'simplify_user_profiles')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250126', 'add_gradient_color_fields')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250127', 'temp_testing_policies')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250128000000', 'add_fts_for_jobs')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250204', 'add_is_local_government_column')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250205', 'add_delete_policy_dev_board_submissions')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250210', 'add_talent_form_payload')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20250211', 'allow_anonymous_experience_insert')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251031', 'experiences_schema')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251102', 'add_teacher_employment_type')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251105', 'landing_talent_registration')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251114', 'fix_chat_participants_rls')
ON CONFLICT (version) DO NOTHING;

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251115', 'fix_chat_participants_rls_final')
ON CONFLICT (version) DO NOTHING;

-- Step 3: 동기화 후 확인
SELECT *
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Step 4: 로컬에 없는 마이그레이션 찾기 (이것들은 삭제 고려 대상)
SELECT
  sm.version,
  sm.name
FROM supabase_migrations.schema_migrations sm
WHERE sm.version NOT IN ('20250102', '20250106', '20250113', '20250115', '20250117', '20250118', '20250119', '20250120', '20250121', '20250122', '20250123', '20250124', '20250125', '20250126', '20250127', '20250128000000', '20250204', '20250205', '20250210', '20250211', '20251031', '20251102', '20251105', '20251114', '20251115')
ORDER BY sm.version ASC;

================================================================================

✅ SQL 생성 완료!

실행 순서:
1. Supabase Dashboard → SQL Editor 열기
2. 위 SQL 복사 & 붙여넣기
3. "Run" 버튼 클릭
4. Step 3와 Step 4 결과 확인
5. GitHub에 빈 커밋 푸시해서 Supabase Preview 빌드 트리거

================================================================================

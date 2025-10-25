-- ========================================
-- 마이그레이션 히스토리 동기화
-- ========================================
-- 기존에 실행된 마이그레이션들을 schema_migrations에 등록합니다.

INSERT INTO supabase_migrations.schema_migrations (version) VALUES
  ('20250117_initial_schema'),
  ('20250118_add_job_fields'),
  ('20250119_add_search_vectors'),
  ('20250120_add_recommendations_cache'),
  ('20250120_search_logging_and_trgm'),
  ('20250121_add_crawl_batch_size'),
  ('20250121_create_crawl_management_tables'),
  ('20250121_create_promo_card_settings'),
  ('20250121_update_promo_card_settings_schema'),
  ('20250122_add_promo_card_badge_color'),
  ('20250123_create_storage_bucket'),
  ('20250123_extend_user_profiles_schema'),
  ('20250124_add_school_level_fields'),
  ('20250125_simplify_user_profiles')
ON CONFLICT (version) DO NOTHING;

-- 확인 쿼리
SELECT version, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version;

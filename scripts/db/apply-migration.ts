/**
 * Apply Stripe Banner Migration Script (TypeScript)
 *
 * This script applies the stripe banner migration and registers it in migration history
 * Steps: Register history -> Check history -> Apply new migration -> Verify tables
 *
 * Usage: npx tsx scripts/db/apply-migration.ts
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Environment variables for database connection
const DB_HOST = process.env.SUPABASE_DB_HOST || 'aws-0-ap-northeast-2.pooler.supabase.com';
const DB_PORT = parseInt(process.env.SUPABASE_DB_PORT || '6543');
const DB_NAME = process.env.SUPABASE_DB_NAME || 'postgres';
const DB_USER = process.env.SUPABASE_DB_USER || 'postgres.qpwnsvsiduvvqdijyxio';
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD || 'zkfmvpeldp2@';

async function applyMigration(): Promise<void> {
  // PostgreSQL 연결 설정 (Service Role로 접근)
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Step 1: 기존 마이그레이션 히스토리 등록
    console.log('📝 Step 1: Registering existing migrations...');
    const historySQL = `
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
    `;

    await client.query(historySQL);
    console.log('✅ Migration history registered!\n');

    // Step 2: 히스토리 확인
    console.log('📋 Step 2: Checking migration history...');
    const historyCheck = await client.query(`
      SELECT version, inserted_at
      FROM supabase_migrations.schema_migrations
      ORDER BY version
    `);
    console.log(`   Found ${historyCheck.rows.length} migrations in history:`);
    historyCheck.rows.forEach((row: any) => {
      console.log(`   ✓ ${row.version}`);
    });
    console.log('');

    // Step 3: 새 마이그레이션 적용
    console.log('🚀 Step 3: Applying new migration (20250126_create_stripe_banner_tables)...');

    // Get project root (2 levels up from scripts/db/)
    const projectRoot = join(process.cwd());
    const migrationFile = join(projectRoot, 'supabase', 'migrations', '20250126_create_stripe_banner_tables.sql');
    const sql = readFileSync(migrationFile, 'utf8');

    await client.query(sql);
    console.log('✅ New migration applied!\n');

    // Step 4: 마이그레이션 히스토리에 등록
    console.log('📝 Step 4: Registering new migration in history...');
    await client.query(`
      INSERT INTO supabase_migrations.schema_migrations (version)
      VALUES ('20250126_create_stripe_banner_tables')
      ON CONFLICT (version) DO NOTHING
    `);
    console.log('✅ New migration registered!\n');

    // Step 5: 생성된 테이블 확인
    console.log('🔍 Step 5: Verifying created tables...\n');
    const tables = [
      'stripe_banner_config',
      'stripe_banners',
      'stripe_statistics',
      'popular_keywords'
    ];

    for (const table of tables) {
      const result = await client.query(`
        SELECT COUNT(*) as count FROM public.${table}
      `);
      console.log(`   ✓ ${table}: ${result.rows[0].count} rows`);
    }

    // Step 6: 각 테이블의 데이터 조회
    console.log('\n📊 Step 6: Displaying table contents:\n');

    // stripe_banner_config
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 stripe_banner_config');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const config = await client.query('SELECT * FROM public.stripe_banner_config');
    console.table(config.rows);

    // stripe_banners
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎨 stripe_banners');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const banners = await client.query('SELECT id, type, title, description, link, bg_color, text_color, display_order, is_active FROM public.stripe_banners ORDER BY display_order');
    console.table(banners.rows);

    // stripe_statistics
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 stripe_statistics');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const stats = await client.query('SELECT * FROM public.stripe_statistics');
    console.table(stats.rows);

    // popular_keywords
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔥 popular_keywords');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const keywords = await client.query('SELECT id, keyword, display_order, is_active, is_manual, search_count FROM public.popular_keywords ORDER BY display_order');
    console.table(keywords.rows);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ Phase 1 완료! 모든 테이블이 성공적으로 생성되었습니다.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error(`   Error Code: ${error.code}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Connection closed.');
  }
}

applyMigration().catch(console.error);

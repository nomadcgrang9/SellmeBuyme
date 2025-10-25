/**
 * Run Migration Script (TypeScript)
 *
 * This script executes a migration file and verifies the tables
 *
 * Usage: npx tsx scripts/db/run-migration.ts
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Environment variables for database connection
const CONNECTION_STRING = process.env.SUPABASE_CONNECTION_STRING ||
  'postgresql://postgres.qpwnsvsiduvvqdijyxio:zkfmvpeldp2%40@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function runMigration(): Promise<void> {
  // PostgreSQL 연결 설정
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to Supabase...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // 마이그레이션 파일 읽기
    const projectRoot = join(process.cwd());
    const migrationFile = join(projectRoot, 'supabase', 'migrations', '20250126_create_stripe_banner_tables.sql');
    console.log(`\n📄 Reading migration file: ${migrationFile}`);

    const sql = readFileSync(migrationFile, 'utf8');
    console.log(`📝 Migration SQL length: ${sql.length} characters`);

    // 마이그레이션 실행
    console.log('\n🚀 Executing migration...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');

    // 생성된 테이블 확인
    console.log('\n🔍 Verifying tables...\n');

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
      console.log(`  ✓ ${table}: ${result.rows[0].count} rows`);
    }

    // 각 테이블의 데이터 조회
    console.log('\n📊 Table contents:\n');

    // 1. stripe_banner_config
    console.log('=== stripe_banner_config ===');
    const config = await client.query('SELECT * FROM public.stripe_banner_config');
    console.log(JSON.stringify(config.rows, null, 2));

    // 2. stripe_banners
    console.log('\n=== stripe_banners ===');
    const banners = await client.query('SELECT * FROM public.stripe_banners ORDER BY display_order');
    console.log(JSON.stringify(banners.rows, null, 2));

    // 3. stripe_statistics
    console.log('\n=== stripe_statistics ===');
    const stats = await client.query('SELECT * FROM public.stripe_statistics');
    console.log(JSON.stringify(stats.rows, null, 2));

    // 4. popular_keywords
    console.log('\n=== popular_keywords ===');
    const keywords = await client.query('SELECT * FROM public.popular_keywords ORDER BY display_order');
    console.log(JSON.stringify(keywords.rows, null, 2));

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed.');
  }
}

runMigration().catch(console.error);

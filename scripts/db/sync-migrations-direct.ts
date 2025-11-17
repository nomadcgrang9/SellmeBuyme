import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function syncMigrations() {
  console.log('🔄 마이그레이션 동기화 시작...\n');
  console.log('='.repeat(80));

  const migrationsDir = path.resolve(process.cwd(), 'supabase', 'migrations');
  const localFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const migrations = localFiles.map(file => {
    const match = file.match(/^(\d+)/);
    const version = match ? match[1] : null;
    const description = file.replace(/^\d+_/, '').replace('.sql', '');
    return { version, name: description };
  }).filter(m => m.version !== null);

  console.log(`✅ 로컬 마이그레이션: ${migrations.length}개\n`);

  // Build single SQL statement
  const sqlStatements = migrations.map(m =>
    `INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('${m.version}', '${m.name}') ON CONFLICT (version) DO NOTHING;`
  ).join('\n');

  console.log('SQL 실행 중...\n');

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql: sqlStatements })
  });

  if (!response.ok) {
    console.error('❌ exec_sql 실패:', await response.text());
    console.log('\n⚠️  대신 Supabase Dashboard SQL Editor를 사용하세요:');
    console.log('\n' + '='.repeat(80));
    console.log(sqlStatements);
    console.log('='.repeat(80));
    return;
  }

  const result = await response.json();
  console.log('✅ 동기화 완료!');
  console.log('\n결과:', result);
  console.log('\n' + '='.repeat(80));
}

syncMigrations().catch(console.error);

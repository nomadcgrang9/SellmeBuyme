/**
 * TypeScript patch: ensure crawl_boards has approved_at, approved_by, created_by
 * Uses Postgres pooler connection from .claude/mcp-servers.json (postgres server).
 */

import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function main() {
  const cfgPath = path.join(process.cwd(), '.claude', 'mcp-servers.json');
  const raw = fs.readFileSync(cfgPath, 'utf8');
  const cfg = JSON.parse(raw);
  const args: string[] | undefined = cfg?.mcpServers?.postgres?.args;
  if (!Array.isArray(args) || args.length < 3) {
    throw new Error('Postgres connection string not found in .claude/mcp-servers.json');
  }
  const connStr = args[2];

  const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `ALTER TABLE public.crawl_boards
         ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id)`
    );
    await client.query(
      `ALTER TABLE public.crawl_boards
         ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id)`
    );
    await client.query('COMMIT');
    console.log('✅ Patched crawl_boards: approved_at, approved_by, created_by');
  } catch (e: any) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Patch failed:', err?.message || err);
  process.exit(1);
});


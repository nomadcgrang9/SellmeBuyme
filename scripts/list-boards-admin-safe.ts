import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Manually parse .env to avoid encoding issues if possible, or just sanitize
const envContent = fs.readFileSync('.env', 'utf-8');
const envLines = envContent.split('\n');

const envVars: Record<string, string> = {};
envLines.forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        let val = parts.slice(1).join('=').trim();
        // Remove comments
        if (val.includes('#')) val = val.split('#')[0].trim();
        // Remove quotes
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
        envVars[key] = val;
    }
});

const url = envVars['VITE_SUPABASE_URL'] || process.env.VITE_SUPABASE_URL;
let serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Sanitize key: keep only base64-like chars (A-Z, a-z, 0-9, ., -, _)
if (serviceKey) {
    serviceKey = serviceKey.replace(/[^A-Za-z0-9._-]/g, '');
}

if (!url || !serviceKey) {
    console.error('Missing URL or Service Key');
    process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function list() {
    const { data, error } = await supabase
        .from('crawl_boards')
        .select('id, name, region_display_name, region_code')
        .ilike('name', '%부산%'); // Filter for Busan

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('=== Busan Boards ===');
    data?.forEach(board => {
        console.log(`[${board.name}] ID: ${board.id}`);
    });
}

list();

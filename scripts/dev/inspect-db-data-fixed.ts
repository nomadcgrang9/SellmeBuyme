
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// .env 파일에서 환경 변수 로드
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL or Anon Key is missing in .env file');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectData() {
  console.log('Fetching sample data from job_postings table...');

  const { data, error } = await supabase
    .from('job_postings')
    .select('id, title, location, organization, tags')
    .limit(10);

  if (error) {
    console.error('Error fetching data:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No data found.');
    return;
  }

  console.log('--- Sample Job Postings Data ---');
  console.table(data);
  console.log('---------------------------------');
}

inspectData().catch(console.error);

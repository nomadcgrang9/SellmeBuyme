import { createClient } from '@supabase/supabase-js';
import * as process from 'process';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function checkUnknownLocationJobs() {
  try {
    const { data, error } = await supabase
      .from('job_postings')
      .select('*')
      .eq('location', '지역 미상')
      .limit(3);

    if (error) {
      console.error('Error:', error);
      process.exit(1);
    }

    console.log('Unknown location jobs:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUnknownLocationJobs();

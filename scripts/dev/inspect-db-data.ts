
import { supabase } from '../../src/lib/supabase/client';

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

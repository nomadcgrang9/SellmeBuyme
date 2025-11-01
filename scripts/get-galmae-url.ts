import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data } = await supabase
  .from('job_postings')
  .select('organization, attachment_url')
  .eq('organization', '갈매유치원')
  .single();

console.log('갈매유치원 attachment_url:');
console.log(data?.attachment_url);

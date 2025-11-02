import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkProfile() {
  const userId = '85823de2-b69b-4829-8e1b-c3764c7d633c';

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('프로필 조회 실패:', error);
    return;
  }

  console.log('📋 사용자 프로필:');
  console.log('  display_name:', profile.display_name);
  console.log('  roles:', profile.roles);
  console.log('  interest_regions:', profile.interest_regions);
  console.log('  teacher_level:', profile.teacher_level);
  console.log('  capable_subjects:', profile.capable_subjects);
  console.log('  preferred_job_types:', profile.preferred_job_types);
  console.log('  experience_years:', profile.experience_years);
}

checkProfile();

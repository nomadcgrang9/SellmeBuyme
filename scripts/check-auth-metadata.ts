import { createClient } from '@supabase/supabase-js';
import * as process from 'process';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkAuthMetadata() {
  try {
    console.log('📋 Checking Supabase auth users with admin metadata...\n');

    // Query all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Failed to list users:', usersError);
      process.exit(1);
    }

    if (!users || users.users.length === 0) {
      console.log('❌ No users found in Supabase auth');
      process.exit(1);
    }

    console.log(`Found ${users.users.length} user(s):\n`);

    for (const user of users.users) {
      const appMetadata = user.app_metadata || {};
      const roles = appMetadata.roles || [];
      const isAdmin = appMetadata.is_admin === true;

      console.log(`Email: ${user.email}`);
      console.log(`ID: ${user.id}`);
      console.log(`app_metadata:`, appMetadata);
      console.log(`Has admin role: ${roles.includes('admin')}`);
      console.log(`is_admin flag: ${isAdmin}`);
      console.log(`Is Admin User: ${roles.includes('admin') || isAdmin}`);
      console.log('---\n');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAuthMetadata();

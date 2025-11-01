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

async function setAdminRole(email: string) {
  try {
    console.log(`🔄 Setting admin role for ${email}...\n`);

    // Get user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Failed to list users:', listError);
      process.exit(1);
    }

    const user = users?.users.find((u) => u.email === email);
    if (!user) {
      console.error(`❌ User ${email} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id}`);
    console.log(`Current app_metadata:`, user.app_metadata);

    // Update user app_metadata
    const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: {
          ...user.app_metadata,
          is_admin: true,
        },
      }
    );

    if (updateError) {
      console.error('❌ Failed to update user:', updateError);
      process.exit(1);
    }

    console.log('\n✅ Admin role set successfully!');
    console.log('Updated app_metadata:', updatedUser?.app_metadata);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/set-admin-role.ts <email>');
  process.exit(1);
}

setAdminRole(email);

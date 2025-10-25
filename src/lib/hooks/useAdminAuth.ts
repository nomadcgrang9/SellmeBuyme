import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { fetchUserProfile } from '@/lib/supabase/profiles';

export function useAdminAuth() {
  const { user, status } = useAuthStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkAdminRole() {
      if (status === 'loading') {
        return; // Wait for auth to initialize
      }

      if (!user) {
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data: profile, error } = await fetchUserProfile(user.id);

        if (error) {
          console.error('Failed to fetch user profile:', error);
          setIsAdmin(false);
        } else {
          // Check if user has admin role
          const hasAdminRole = profile?.roles?.includes('admin') || false;
          setIsAdmin(hasAdminRole);
        }
      } catch (err) {
        console.error('Error checking admin role:', err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAdminRole();
  }, [user, status]);

  return { isAdmin, isLoading, user };
}

/**
 * Helper function to check if current user is admin
 * Returns a promise that resolves to true/false
 */
export async function checkIsAdmin(): Promise<boolean> {
  const { user } = useAuthStore.getState();

  if (!user) {
    return false;
  }

  try {
    const { data: profile, error } = await fetchUserProfile(user.id);

    if (error) {
      console.error('Failed to fetch user profile:', error);
      return false;
    }

    return profile?.roles?.includes('admin') || false;
  } catch (err) {
    console.error('Error checking admin role:', err);
    return false;
  }
}
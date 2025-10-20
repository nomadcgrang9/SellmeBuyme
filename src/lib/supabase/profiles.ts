import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './client';

export type UserProfileRow = {
  user_id: string;
  display_name: string;
  roles: string[];
  primary_region: string | null;
  interest_regions: string[];
  experience_years: number | null;
  receive_notifications: boolean;
  intro: string | null;
  agree_terms: boolean;
  agree_privacy: boolean;
  agree_marketing: boolean;
  created_at: string;
  updated_at: string;
};

export type ProfileUpsertInput = {
  displayName: string;
  roles: string[];
  primaryRegion: string | null;
  interestRegions: string[];
  experienceYears: number | null;
  receiveNotifications: boolean;
  intro: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
};

export async function fetchUserProfile(
  userId: string
): Promise<{ data: UserProfileRow | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<UserProfileRow>();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function upsertUserProfile(
  userId: string,
  payload: ProfileUpsertInput
): Promise<{ data: UserProfileRow | null; error: PostgrestError | null }> {
  const { displayName, roles, primaryRegion, interestRegions, experienceYears, receiveNotifications, intro, agreeTerms, agreePrivacy, agreeMarketing } = payload;

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        display_name: displayName,
        roles,
        primary_region: primaryRegion,
        interest_regions: interestRegions,
        experience_years: experienceYears,
        receive_notifications: receiveNotifications,
        intro: intro || null,
        agree_terms: agreeTerms,
        agree_privacy: agreePrivacy,
        agree_marketing: agreeMarketing
      },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle<UserProfileRow>();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

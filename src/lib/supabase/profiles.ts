import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './client';

export type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  roles: string[] | null;
  primary_region: string | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  receive_notifications: boolean | null;
  intro: string | null;
  agree_terms: boolean | null;
  agree_privacy: boolean | null;
  agree_marketing: boolean | null;
  preferred_job_types: string[] | null;
  preferred_subjects: string[] | null;
  teacher_level: string | null;
  special_education_type: string | null;
  instructor_fields: string[] | null;
  instructor_custom_field: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileUpsertInput = {
  displayName: string;
  phone?: string | null;
  roles: string[];
  primaryRegion?: string | null;
  interestRegions: string[];
  experienceYears?: number | null;
  receiveNotifications: boolean;
  intro?: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
  preferredJobTypes?: string[];
  preferredSubjects?: string[];
  teacherLevel?: string | null;
  specialEducationType?: string | null;
  instructorFields?: string[] | null;
  instructorCustomField?: string | null;
  profileImageUrl?: string | null;
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
  const { displayName, phone, roles, primaryRegion, interestRegions, experienceYears, receiveNotifications, intro, agreeTerms, agreePrivacy, agreeMarketing, teacherLevel, specialEducationType, instructorFields, instructorCustomField, profileImageUrl } = payload;

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        display_name: displayName,
        phone: phone || null,
        roles,
        primary_region: primaryRegion,
        interest_regions: interestRegions,
        experience_years: experienceYears,
        receive_notifications: receiveNotifications,
        intro: intro || null,
        agree_terms: agreeTerms,
        agree_privacy: agreePrivacy,
        agree_marketing: agreeMarketing,
        preferred_job_types: payload.preferredJobTypes || null,
        preferred_subjects: payload.preferredSubjects || null,
        teacher_level: teacherLevel || null,
        special_education_type: specialEducationType || null,
        instructor_fields: instructorFields || null,
        instructor_custom_field: instructorCustomField || null,
        profile_image_url: profileImageUrl || null
      },
      { onConflict: 'user_id' }
    )
    .select()
    .maybeSingle<UserProfileRow>();

  if (error) {
    return { data: null, error };
  }

  return { data: data || null, error: null };
}

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
  capable_subjects: string[] | null;
  teacher_level: string | null;
  teacher_employment_type: string | null; // '기간제교사' | '정규교원' | null
  preferred_job_types: string[] | null;
  preferred_subjects: string[] | null;
  special_education_type: string | null;
  instructor_fields: string[] | null;
  instructor_custom_field: string | null;
  profile_image_url: string | null;
  profile_completion: number | null;
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
  capableSubjects?: string[];
  teacherLevel?: string | null;
  teacherEmploymentType?: string | null; // '기간제교사' | '정규교원' | null
  specialEducationType?: string | null;
  instructorFields?: string[] | null;
  instructorCustomField?: string | null;
  preferredJobTypes?: string[] | null;
  preferredSubjects?: string[] | null;
  primaryRegionOverride?: string | null;
  profileImageUrl?: string | null;
};

function calculateProfileCompletion(payload: ProfileUpsertInput): number {
  let score = 0;
  let total = 0;

  const inc = (filled: boolean) => {
    total += 1;
    if (filled) score += 1;
  };

  inc(!!payload.displayName && payload.displayName.trim().length > 0);
  inc(Array.isArray(payload.roles) && payload.roles.length > 0);
  inc(
    !!payload.teacherLevel ||
      !!payload.specialEducationType ||
      (Array.isArray(payload.instructorFields) && payload.instructorFields.length > 0)
  );
  inc(
    !!payload.primaryRegion ||
      (Array.isArray(payload.interestRegions) && payload.interestRegions.length > 0)
  );
  inc(!!payload.intro && payload.intro.trim().length >= 20);
  inc(Array.isArray(payload.preferredJobTypes) && payload.preferredJobTypes.length > 0);
  inc(Array.isArray(payload.preferredSubjects) && payload.preferredSubjects.length > 0);
  inc(!!payload.profileImageUrl && payload.profileImageUrl.trim().length > 0);

  if (total === 0) return 0;
  return Math.round((score / total) * 100);
}

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
  const { displayName, phone, roles, interestRegions, experienceYears, receiveNotifications, intro, agreeTerms, agreePrivacy, agreeMarketing, capableSubjects, teacherLevel, teacherEmploymentType, specialEducationType, instructorFields, instructorCustomField, preferredJobTypes, preferredSubjects, primaryRegion, profileImageUrl } = payload;

  const profileCompletion = calculateProfileCompletion(payload);

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        display_name: displayName,
        phone: phone || null,
        roles,
        primary_region: primaryRegion || null,
        interest_regions: interestRegions,
        experience_years: experienceYears,
        receive_notifications: receiveNotifications,
        intro: intro || null,
        agree_terms: agreeTerms,
        agree_privacy: agreePrivacy,
        agree_marketing: agreeMarketing,
        capable_subjects: capableSubjects || null,
        teacher_level: teacherLevel || null,
        teacher_employment_type: teacherEmploymentType || null,
        special_education_type: specialEducationType || null,
        instructor_fields: instructorFields || null,
        instructor_custom_field: instructorCustomField || null,
        preferred_job_types: preferredJobTypes || null,
        preferred_subjects: preferredSubjects || null,
        profile_image_url: profileImageUrl || null,
        profile_completion: profileCompletion
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

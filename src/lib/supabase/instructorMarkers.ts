// 교원연수 강사 마커 Supabase 쿼리 함수
// 작성일: 2026-01-29

import { supabase } from './client';
import type {
  InstructorMarker,
  InstructorMarkerInput,
  InstructorMarkerUpdate,
  InstructorMarkerFilters,
  InstructorSpecialty,
} from '@/types/instructorMarkers';

// ============================================================================
// 조회 (SELECT)
// ============================================================================

/**
 * 교원연수 강사 마커 목록 조회
 */
export async function fetchInstructorMarkers(
  filters?: InstructorMarkerFilters
): Promise<InstructorMarker[]> {
  let query = supabase
    .from('instructor_markers')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  // 전문분야 필터 (contains - 모든 항목 포함)
  if (filters?.specialties && filters.specialties.length > 0) {
    query = query.contains('specialties', filters.specialties);
  }

  // 지역 필터 (overlaps - 하나라도 포함)
  if (filters?.regions && filters.regions.length > 0) {
    query = query.overlaps('available_regions', filters.regions);
  }

  // 연수 대상 필터 (overlaps - 하나라도 포함)
  if (filters?.targetAudience && filters.targetAudience.length > 0) {
    query = query.overlaps('target_audience', filters.targetAudience);
  }

  const { data, error } = await query;

  if (error) {
    console.error('fetchInstructorMarkers error:', error);
    throw error;
  }

  // 텍스트 검색 필터 (클라이언트 사이드)
  let result = data || [];
  if (filters?.searchKeyword) {
    const keyword = filters.searchKeyword.toLowerCase();
    result = result.filter(marker =>
      marker.display_name?.toLowerCase().includes(keyword) ||
      marker.specialties?.some((s: string) => s.toLowerCase().includes(keyword)) ||
      marker.custom_specialty?.toLowerCase().includes(keyword) ||
      marker.activity_history?.toLowerCase().includes(keyword)
    );
  }

  return result;
}

/**
 * 단일 전문분야로 필터링
 * 필터바에서 칩 클릭 시 사용
 */
export async function fetchInstructorMarkersBySpecialty(
  specialty: InstructorSpecialty
): Promise<InstructorMarker[]> {
  const { data, error } = await supabase
    .from('instructor_markers')
    .select('*')
    .eq('is_active', true)
    .contains('specialties', [specialty])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('fetchInstructorMarkersBySpecialty error:', error);
    throw error;
  }

  return data || [];
}

/**
 * 단일 교원연수 강사 마커 조회
 */
export async function fetchInstructorMarkerById(id: string): Promise<InstructorMarker | null> {
  const { data, error } = await supabase
    .from('instructor_markers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('fetchInstructorMarkerById error:', error);
    return null;
  }

  return data;
}

/**
 * 내 교원연수 강사 마커 조회 (로그인 사용자)
 */
export async function fetchMyInstructorMarker(userId: string): Promise<InstructorMarker | null> {
  const { data, error } = await supabase
    .from('instructor_markers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 레코드 없음 - 정상 케이스
      return null;
    }
    console.error('fetchMyInstructorMarker error:', error);
    return null;
  }

  return data;
}

// ============================================================================
// 생성 (INSERT)
// ============================================================================

/**
 * 교원연수 강사 마커 생성 (이미 존재하면 업데이트)
 */
export async function createInstructorMarker(
  input: InstructorMarkerInput
): Promise<InstructorMarker> {
  console.log('[createInstructorMarker] Input:', input);

  // 먼저 기존 마커가 있는지 확인
  const { data: existing, error: findError } = await supabase
    .from('instructor_markers')
    .select('id')
    .eq('user_id', input.user_id)
    .single();

  console.log('[createInstructorMarker] Existing:', existing, 'FindError:', findError);

  let data, error;

  if (existing?.id) {
    // 기존 마커가 있으면 업데이트 (user_id는 제외)
    const { user_id, ...updateData } = input;
    console.log('[createInstructorMarker] Updating id:', existing.id);

    const result = await supabase
      .from('instructor_markers')
      .update({
        ...updateData,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    data = result.data;
    error = result.error;
  } else {
    // 없으면 새로 생성
    console.log('[createInstructorMarker] Creating new marker');

    const result = await supabase
      .from('instructor_markers')
      .insert({
        ...input,
        is_active: true,
      })
      .select()
      .single();

    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('createInstructorMarker error:', error);
    throw error;
  }

  console.log('[createInstructorMarker] Success:', data);
  return data;
}

// ============================================================================
// 수정 (UPDATE)
// ============================================================================

/**
 * 교원연수 강사 마커 수정
 */
export async function updateInstructorMarker(
  id: string,
  input: InstructorMarkerUpdate
): Promise<InstructorMarker> {
  const { data, error } = await supabase
    .from('instructor_markers')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateInstructorMarker error:', error);
    throw error;
  }

  return data;
}

// ============================================================================
// 삭제 (DELETE - soft delete)
// ============================================================================

/**
 * 교원연수 강사 마커 삭제 (soft delete)
 */
export async function deleteInstructorMarker(id: string, userId?: string): Promise<void> {
  let query = supabase
    .from('instructor_markers')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  // userId가 제공되면 추가 검증
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('deleteInstructorMarker error:', error);
    throw error;
  }

  console.log('[deleteInstructorMarker] Soft deleted id:', id);
}

// ============================================================================
// 프로필 이미지 업로드
// ============================================================================

/**
 * 교원연수 강사 프로필 이미지 업로드
 */
export async function uploadInstructorProfileImage(
  file: File,
  userId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `instructor/${userId}/profile_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('profiles')
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    console.error('uploadInstructorProfileImage error:', uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage
    .from('profiles')
    .getPublicUrl(fileName);

  return data.publicUrl;
}

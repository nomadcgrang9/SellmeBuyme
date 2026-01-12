// 마커 관련 Supabase 쿼리 함수
// 작성일: 2026-01-12

import { supabase } from './client';
import type {
    TeacherMarker,
    TeacherMarkerInput,
    ProgramMarker,
    ProgramMarkerInput,
    MarkerComment,
    MarkerCommentInput,
    MarkerFilters
} from '@/types/markers';

// ============================================================================
// 구직 교사 마커 (Teacher Markers)
// ============================================================================

/**
 * 구직 교사 마커 목록 조회
 */
export async function fetchTeacherMarkers(filters?: MarkerFilters): Promise<TeacherMarker[]> {
    let query = supabase
        .from('teacher_markers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    // 과목 필터
    if (filters?.subjects && filters.subjects.length > 0) {
        query = query.overlaps('subjects', filters.subjects);
    }

    // 학교급 필터
    if (filters?.schoolLevels && filters.schoolLevels.length > 0) {
        query = query.overlaps('school_levels', filters.schoolLevels);
    }

    // 지도 영역 필터 (bounds)
    if (filters?.bounds) {
        query = query
            .gte('latitude', filters.bounds.south)
            .lte('latitude', filters.bounds.north)
            .gte('longitude', filters.bounds.west)
            .lte('longitude', filters.bounds.east);
    }

    const { data, error } = await query;

    if (error) {
        console.error('fetchTeacherMarkers error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 단일 구직 교사 마커 조회
 */
export async function fetchTeacherMarkerById(id: string): Promise<TeacherMarker | null> {
    const { data, error } = await supabase
        .from('teacher_markers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('fetchTeacherMarkerById error:', error);
        return null;
    }

    return data;
}

/**
 * 내 구직 교사 마커 목록 조회
 */
export async function fetchMyTeacherMarkers(userId: string): Promise<TeacherMarker[]> {
    const { data, error } = await supabase
        .from('teacher_markers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchMyTeacherMarkers error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 구직 교사 마커 생성
 */
export async function createTeacherMarker(input: TeacherMarkerInput): Promise<TeacherMarker> {
    const { data, error } = await supabase
        .from('teacher_markers')
        .insert(input)
        .select()
        .single();

    if (error) {
        console.error('createTeacherMarker error:', error);
        throw error;
    }

    return data;
}

/**
 * 구직 교사 마커 수정
 */
export async function updateTeacherMarker(
    id: string,
    input: Partial<TeacherMarkerInput>
): Promise<TeacherMarker> {
    const { data, error } = await supabase
        .from('teacher_markers')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('updateTeacherMarker error:', error);
        throw error;
    }

    return data;
}

/**
 * 구직 교사 마커 삭제 (soft delete)
 */
export async function deleteTeacherMarker(id: string): Promise<void> {
    const { error } = await supabase
        .from('teacher_markers')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        console.error('deleteTeacherMarker error:', error);
        throw error;
    }
}

// ============================================================================
// 프로그램 마커 (Program Markers)
// ============================================================================

/**
 * 프로그램 마커 목록 조회
 */
export async function fetchProgramMarkers(filters?: MarkerFilters): Promise<ProgramMarker[]> {
    let query = supabase
        .from('program_markers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    // 카테고리 필터
    if (filters?.categories && filters.categories.length > 0) {
        query = query.overlaps('categories', filters.categories);
    }

    // 지도 영역 필터 (bounds)
    if (filters?.bounds) {
        query = query
            .gte('latitude', filters.bounds.south)
            .lte('latitude', filters.bounds.north)
            .gte('longitude', filters.bounds.west)
            .lte('longitude', filters.bounds.east);
    }

    const { data, error } = await query;

    if (error) {
        console.error('fetchProgramMarkers error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 단일 프로그램 마커 조회
 */
export async function fetchProgramMarkerById(id: string): Promise<ProgramMarker | null> {
    const { data, error } = await supabase
        .from('program_markers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('fetchProgramMarkerById error:', error);
        return null;
    }

    return data;
}

/**
 * 내 프로그램 마커 목록 조회
 */
export async function fetchMyProgramMarkers(userId: string): Promise<ProgramMarker[]> {
    const { data, error } = await supabase
        .from('program_markers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchMyProgramMarkers error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 프로그램 마커 생성
 */
export async function createProgramMarker(input: ProgramMarkerInput): Promise<ProgramMarker> {
    const { data, error } = await supabase
        .from('program_markers')
        .insert(input)
        .select()
        .single();

    if (error) {
        console.error('createProgramMarker error:', error);
        throw error;
    }

    return data;
}

/**
 * 프로그램 마커 수정
 */
export async function updateProgramMarker(
    id: string,
    input: Partial<ProgramMarkerInput>
): Promise<ProgramMarker> {
    const { data, error } = await supabase
        .from('program_markers')
        .update(input)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('updateProgramMarker error:', error);
        throw error;
    }

    return data;
}

/**
 * 프로그램 마커 삭제 (soft delete)
 */
export async function deleteProgramMarker(id: string): Promise<void> {
    const { error } = await supabase
        .from('program_markers')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        console.error('deleteProgramMarker error:', error);
        throw error;
    }
}

// ============================================================================
// 마커 코멘트 (Marker Comments)
// ============================================================================

/**
 * 마커 코멘트 목록 조회
 */
export async function fetchMarkerComments(
    markerType: 'teacher' | 'program',
    markerId: string
): Promise<MarkerComment[]> {
    const { data, error } = await supabase
        .from('marker_comments')
        .select('*')
        .eq('marker_type', markerType)
        .eq('marker_id', markerId)
        .eq('is_visible', true)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchMarkerComments error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 마커 코멘트 생성
 */
export async function createMarkerComment(input: MarkerCommentInput): Promise<MarkerComment> {
    const { data, error } = await supabase
        .from('marker_comments')
        .insert({
            ...input,
            author_name: input.author_name || '익명'
        })
        .select()
        .single();

    if (error) {
        console.error('createMarkerComment error:', error);
        throw error;
    }

    return data;
}

/**
 * 마커 코멘트 삭제 (soft delete)
 */
export async function deleteMarkerComment(id: string): Promise<void> {
    const { error } = await supabase
        .from('marker_comments')
        .update({ is_visible: false })
        .eq('id', id);

    if (error) {
        console.error('deleteMarkerComment error:', error);
        throw error;
    }
}

// ============================================================================
// 이미지 업로드
// ============================================================================

/**
 * 마커 이미지 업로드
 */
export async function uploadMarkerImage(
    file: File,
    markerType: 'teacher' | 'program',
    markerId: string
): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${markerType}/${markerId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('markers')
        .upload(fileName, file);

    if (uploadError) {
        console.error('uploadMarkerImage error:', uploadError);
        throw uploadError;
    }

    const { data } = supabase.storage
        .from('markers')
        .getPublicUrl(fileName);

    return data.publicUrl;
}

/**
 * 마커 이미지 삭제
 */
export async function deleteMarkerImage(imageUrl: string): Promise<void> {
    // URL에서 파일 경로 추출
    const pathMatch = imageUrl.match(/markers\/(.+)$/);
    if (!pathMatch) return;

    const filePath = pathMatch[1];

    const { error } = await supabase.storage
        .from('markers')
        .remove([filePath]);

    if (error) {
        console.error('deleteMarkerImage error:', error);
        throw error;
    }
}

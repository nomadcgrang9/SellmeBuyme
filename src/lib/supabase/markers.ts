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
    MarkerFilters,
    TeacherMarkerFilters
} from '@/types/markers';

// ============================================================================
// 구직 교사 마커 (Teacher Markers)
// ============================================================================

/**
 * 구직 교사 마커 목록 조회 (기존 호환)
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
 * 구직 교사 마커 목록 조회 (카테고리 기반 필터)
 * 필터바 연동용
 */
export async function fetchTeacherMarkersByCategory(
    filters?: TeacherMarkerFilters
): Promise<TeacherMarker[]> {
    let query = supabase
        .from('teacher_markers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    // 1차 분류 필터 (primary_category)
    if (filters?.primaryCategory) {
        query = query.eq('primary_category', filters.primaryCategory);
    }

    // 2차 분류 필터 (sub_categories)
    if (filters?.subCategories && filters.subCategories.length > 0) {
        query = query.overlaps('sub_categories', filters.subCategories);
    }

    // 희망 학교급 필터 (교과과목용)
    if (filters?.preferredSchoolLevels && filters.preferredSchoolLevels.length > 0) {
        query = query.overlaps('preferred_school_levels', filters.preferredSchoolLevels);
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
        console.error('fetchTeacherMarkersByCategory error:', error);
        throw error;
    }

    // 텍스트 검색 필터 (클라이언트 사이드)
    // Supabase에서 ILIKE OR 조건이 복잡하므로 클라이언트에서 처리
    let result = data || [];
    if (filters?.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase();
        result = result.filter(marker =>
            marker.sub_categories?.some((s: string) => s.toLowerCase().includes(keyword)) ||
            marker.other_subject?.toLowerCase().includes(keyword)
        );
    }

    return result;
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
 * 구직 교사 마커 생성 (이미 존재하면 업데이트)
 */
export async function createTeacherMarker(input: TeacherMarkerInput): Promise<TeacherMarker> {
    console.log('[createTeacherMarker] Input:', input);

    // 먼저 기존 마커가 있는지 확인
    const { data: existing, error: findError } = await supabase
        .from('teacher_markers')
        .select('id')
        .eq('user_id', input.user_id)
        .single();

    console.log('[createTeacherMarker] Existing marker:', existing, 'Find error:', findError);

    let data, error;

    if (existing?.id) {
        // 기존 마커가 있으면 업데이트 (user_id는 제외)
        const { user_id, ...updateData } = input;
        console.log('[createTeacherMarker] Updating existing marker id:', existing.id, 'with data:', updateData);

        const result = await supabase
            .from('teacher_markers')
            .update({
                ...updateData,
                is_active: true,  // 활성화 상태로 변경
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id)
            .select()
            .single();
        data = result.data;
        error = result.error;
        console.log('[createTeacherMarker] Update result:', data, 'Error:', error);
    } else {
        // 없으면 새로 생성
        console.log('[createTeacherMarker] Creating new marker');
        const result = await supabase
            .from('teacher_markers')
            .insert({
                ...input,
                is_active: true  // 명시적으로 활성화 상태로 생성
            })
            .select()
            .single();
        data = result.data;
        error = result.error;
        console.log('[createTeacherMarker] Insert result:', data, 'Error:', error);
    }

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
 * @param id - 마커 ID
 * @param userId - 현재 로그인 사용자 ID (선택적, RLS가 처리하지만 추가 보안용)
 */
export async function deleteTeacherMarker(id: string, userId?: string): Promise<void> {
    let query = supabase
        .from('teacher_markers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

    // userId가 제공되면 추가 검증
    if (userId) {
        query = query.eq('user_id', userId);
    }

    const { error, count } = await query;

    if (error) {
        console.error('deleteTeacherMarker error:', error);
        throw error;
    }

    console.log('[deleteTeacherMarker] 삭제 완료, id:', id);
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

// ============================================================================
// 마커 좋아요 (Likes)
// ============================================================================

export interface MarkerLike {
    id: string;
    marker_type: 'teacher' | 'instructor';
    marker_id: string;
    user_fingerprint: string;
    created_at: string;
}

/**
 * 마커 좋아요 수 조회
 */
export async function fetchMarkerLikeCount(
    markerType: 'teacher' | 'instructor',
    markerId: string
): Promise<number> {
    const { count, error } = await supabase
        .from('marker_likes')
        .select('*', { count: 'exact', head: true })
        .eq('marker_type', markerType)
        .eq('marker_id', markerId);

    if (error) {
        console.error('fetchMarkerLikeCount error:', error);
        return 0;
    }

    return count || 0;
}

/**
 * 사용자가 좋아요 했는지 확인
 */
export async function checkUserLiked(
    markerType: 'teacher' | 'instructor',
    markerId: string,
    fingerprint: string
): Promise<boolean> {
    const { data, error } = await supabase
        .from('marker_likes')
        .select('id')
        .eq('marker_type', markerType)
        .eq('marker_id', markerId)
        .eq('user_fingerprint', fingerprint)
        .maybeSingle();

    if (error) {
        console.error('checkUserLiked error:', error);
        return false;
    }

    return !!data;
}

/**
 * 마커 좋아요 토글
 */
export async function toggleMarkerLike(
    markerType: 'teacher' | 'instructor',
    markerId: string,
    fingerprint: string
): Promise<{ liked: boolean; count: number }> {
    // 이미 좋아요 했는지 확인
    const { data: existing } = await supabase
        .from('marker_likes')
        .select('id')
        .eq('marker_type', markerType)
        .eq('marker_id', markerId)
        .eq('user_fingerprint', fingerprint)
        .maybeSingle();

    if (existing) {
        // 좋아요 취소
        await supabase
            .from('marker_likes')
            .delete()
            .eq('id', existing.id);

        const count = await fetchMarkerLikeCount(markerType, markerId);
        return { liked: false, count };
    } else {
        // 좋아요 추가
        await supabase
            .from('marker_likes')
            .insert({
                marker_type: markerType,
                marker_id: markerId,
                user_fingerprint: fingerprint
            });

        const count = await fetchMarkerLikeCount(markerType, markerId);
        return { liked: true, count };
    }
}

// ============================================================================
// 교원연수 강사 후기 (Instructor Comments)
// ============================================================================

export interface InstructorComment {
    id: string;
    instructor_id: string;
    author_name: string;
    content: string;
    created_at: string;
}

export interface InstructorCommentInput {
    instructor_id: string;
    author_name?: string;
    content: string;
}

/**
 * 강사 후기 목록 조회
 */
export async function fetchInstructorComments(instructorId: string): Promise<InstructorComment[]> {
    const { data, error } = await supabase
        .from('instructor_comments')
        .select('*')
        .eq('instructor_id', instructorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('fetchInstructorComments error:', error);
        throw error;
    }

    return data || [];
}

/**
 * 강사 후기 작성
 */
export async function createInstructorComment(input: InstructorCommentInput): Promise<InstructorComment> {
    const { data, error } = await supabase
        .from('instructor_comments')
        .insert({
            instructor_id: input.instructor_id,
            author_name: input.author_name || '익명',
            content: input.content
        })
        .select()
        .single();

    if (error) {
        console.error('createInstructorComment error:', error);
        throw error;
    }

    return data;
}

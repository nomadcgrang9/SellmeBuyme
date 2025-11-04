// Developer Page Supabase Query Functions
import { supabase } from './client';
import { buildRegionDisplayName } from './regions';
import { createCrawlBoard } from './queries';
import type {
  GitHubDeploymentRow,
  GitHubDeployment,
  DevIdeaRow,
  DevIdea,
  IdeaCategory,
  DevBoardSubmissionRow,
  DevBoardSubmission,
  BoardSubmissionFormData,
  DevProjectRow,
  DevProject,
  ProjectFormData,
  ProjectStatus,
} from '@/types/developer';
import type { CreateCrawlBoardInput, CrawlBoard } from '@/types';

// Converter functions must be imported without 'type' (runtime values)
import {
  convertDeploymentRowToDeployment,
  convertIdeaRowToIdea,
  convertSubmissionRowToSubmission,
  convertProjectRowToProject,
} from '@/types/developer';

// =============================================================================
// GitHub Deployments
// =============================================================================

/**
 * 최근 배포 내역 조회
 * @param limit - 조회할 배포 수 (기본: 2)
 * @returns 배포 목록
 */
export async function getRecentDeployments(
  limit = 2
): Promise<GitHubDeployment[]> {
  const { data, error } = await supabase
    .from('github_deployments')
    .select('*')
    .order('deployed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch deployments:', error);
    throw new Error(`배포 정보를 불러올 수 없습니다: ${error.message}`);
  }

  // DB row를 클라이언트 타입으로 변환
  return data.map((row: GitHubDeploymentRow) =>
    convertDeploymentRowToDeployment(row)
  );
}

/**
 * 특정 브랜치의 배포 내역 조회
 * @param branch - 브랜치 이름
 * @param limit - 조회할 배포 수
 * @returns 배포 목록
 */
export async function getDeploymentsByBranch(
  branch: string,
  limit = 10
): Promise<GitHubDeployment[]> {
  const { data, error } = await supabase
    .from('github_deployments')
    .select('*')
    .eq('branch', branch)
    .order('deployed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch deployments by branch:', error);
    throw new Error(`브랜치 배포 정보를 불러올 수 없습니다: ${error.message}`);
  }

  return data.map((row: GitHubDeploymentRow) =>
    convertDeploymentRowToDeployment(row)
  );
}

/**
 * 배포 성공률 계산
 * @param days - 최근 며칠간의 데이터 (기본: 30)
 * @returns 성공률 (0-100)
 */
export async function getDeploymentSuccessRate(days = 30): Promise<number> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('github_deployments')
    .select('status')
    .gte('deployed_at', startDate.toISOString());

  if (error || !data || data.length === 0) {
    return 0;
  }

  const successCount = data.filter((d) => d.status === 'success').length;
  return Math.round((successCount / data.length) * 100);
}

// =============================================================================
// Dev Ideas (아이디어)
// =============================================================================

/**
 * 아이디어 생성
 * @param idea - 아이디어 데이터
 * @returns 생성된 아이디어
 */
export async function createIdea(idea: {
  title: string;
  content: string;
  category: IdeaCategory;
  images: string[];
  authorName?: string;
}): Promise<DevIdea> {
  const { data, error } = await supabase
    .from('dev_ideas')
    .insert({
      title: idea.title,
      content: idea.content,
      category: idea.category,
      images: idea.images,
      author_name: idea.authorName || '익명',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create idea:', error);
    throw new Error(`아이디어 등록에 실패했습니다: ${error.message}`);
  }

  return convertIdeaRowToIdea(data as DevIdeaRow);
}

/**
 * 아이디어 목록 조회
 * @param limit - 조회할 아이디어 수
 * @param offset - 시작 위치
 * @returns 아이디어 목록
 */
export async function getIdeas(
  limit = 20,
  offset = 0
): Promise<DevIdea[]> {
  const { data, error } = await supabase
    .from('dev_ideas')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to fetch ideas:', error);
    throw new Error(`아이디어를 불러올 수 없습니다: ${error.message}`);
  }

  return data.map((row: DevIdeaRow) => convertIdeaRowToIdea(row));
}

/**
 * 아이디어 상세 조회
 * @param id - 아이디어 ID
 * @returns 아이디어
 */
export async function getIdeaById(id: string): Promise<DevIdea> {
  const { data, error } = await supabase
    .from('dev_ideas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch idea:', error);
    throw new Error(`아이디어를 불러올 수 없습니다: ${error.message}`);
  }

  return convertIdeaRowToIdea(data as DevIdeaRow);
}

/**
 * 아이디어 수정
 * @param id - 아이디어 ID
 * @param updates - 수정할 데이터
 * @returns 수정된 아이디어
 */
export async function updateIdea(
  id: string,
  updates: {
    title?: string;
    content?: string;
    category?: IdeaCategory;
    images?: string[];
  }
): Promise<DevIdea> {
  const { data, error } = await supabase
    .from('dev_ideas')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update idea:', error);
    throw new Error(`아이디어 수정에 실패했습니다: ${error.message}`);
  }

  return convertIdeaRowToIdea(data as DevIdeaRow);
}

/**
 * 아이디어 삭제
 * @param id - 아이디어 ID
 */
export async function deleteIdea(id: string): Promise<void> {
  const { error } = await supabase.from('dev_ideas').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete idea:', error);
    throw new Error(`아이디어 삭제에 실패했습니다: ${error.message}`);
  }
}

/**
 * 이미지를 Supabase Storage에 업로드
 * @param file - 업로드할 파일
 * @param path - 저장 경로
 * @returns 업로드된 파일의 public URL
 */
export async function uploadIdeaImage(
  file: File,
  ideaId: string
): Promise<string> {
  // 파일 크기 검증 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('파일 크기는 5MB 이하여야 합니다');
  }

  // 파일 이름 생성 (타임스탬프 + 랜덤)
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop();
  const fileName = `${timestamp}-${randomStr}.${ext}`;
  const filePath = `ideas/${ideaId}/${fileName}`;

  // Storage에 업로드
  const { data, error } = await supabase.storage
    .from('developer')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Failed to upload image:', error);
    throw new Error(`이미지 업로드에 실패했습니다: ${error.message}`);
  }

  // Public URL 가져오기
  const {
    data: { publicUrl },
  } = supabase.storage.from('developer').getPublicUrl(data.path);

  return publicUrl;
}

// =============================================================================
// Dev Board Submissions (게시판 제출)
// =============================================================================

/**
 * 게시판 제출 생성
 * @param submission - 게시판 제출 데이터
 * @returns 생성된 제출
 */
export async function createBoardSubmission(
  submission: BoardSubmissionFormData
): Promise<DevBoardSubmission> {
  const { data, error } = await supabase
    .from('dev_board_submissions')
    .insert({
      board_name: submission.boardName,
      board_url: submission.boardUrl,
      region: submission.region || null,  // deprecated, for backward compatibility
      region_code: submission.regionCode,
      subregion_code: submission.subregionCode,
      school_level: submission.schoolLevel,
      is_local_government: submission.isLocalGovernment,
      description: submission.description || null,
      submitter_name: '익명',
      status: 'pending',  // 초기 상태는 대기 중
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create board submission:', error);
    throw new Error(`게시판 제출에 실패했습니다: ${error.message}`);
  }

  return convertSubmissionRowToSubmission(data as DevBoardSubmissionRow);
}

/**
 * 게시판 제출 목록 조회
 * @param limit - 조회할 제출 수
 * @param offset - 시작 위치
 * @returns 제출 목록
 */
export async function getBoardSubmissions(
  limit = 20,
  offset = 0,
  filterPending = false
): Promise<DevBoardSubmission[]> {
  const { data, error} = await supabase
    .from('dev_board_submissions')
    .select(`
      *,
      crawl_boards!dev_board_submissions_crawl_board_id_fkey(
        approved_at,
        approved_by
      )
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to fetch board submissions:', error);
    throw new Error(`게시판 제출을 불러올 수 없습니다: ${error.message}`);
  }

  // crawl_boards의 approved_at으로 완전히 교체 (fallback 없음)
  const submissions = data.map((row: any) => {
    const submission: DevBoardSubmissionRow = {
      ...row,
      // crawl_boards의 approved_at만 사용 (NULL이면 NULL 유지)
      approved_at: row.crawl_boards?.approved_at !== undefined
        ? row.crawl_boards.approved_at
        : row.approved_at,
      approved_by: row.crawl_boards?.approved_by !== undefined
        ? row.crawl_boards.approved_by
        : row.approved_by,
    };
    return convertSubmissionRowToSubmission(submission);
  });

  // filterPending=true면 승인되지 않은 것만 반환
  if (filterPending) {
    return submissions.filter(sub => !sub.approvedAt);
  }

  return submissions;
}

/**
 * 게시판 제출 상세 조회
 * @param id - 제출 ID
 * @returns 제출
 */
export async function getBoardSubmissionById(
  id: string
): Promise<DevBoardSubmission> {
  const { data, error } = await supabase
    .from('dev_board_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch board submission:', error);
    throw new Error(`게시판 제출을 불러올 수 없습니다: ${error.message}`);
  }

  return convertSubmissionRowToSubmission(data as DevBoardSubmissionRow);
}

/**
 * URL 중복 체크
 * @param url - 체크할 URL
 * @returns 중복 여부
 *
 * 주의: 승인된(approved) 제출만 중복으로 간주합니다.
 * pending 상태 또는 삭제된 제출은 재등록이 가능합니다.
 */
export async function checkBoardUrlDuplicate(url: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('dev_board_submissions')
    .select('id')
    .eq('board_url', url)
    .eq('status', 'approved')  // 승인된 제출만 중복으로 간주
    .limit(1);

  if (error) {
    console.error('Failed to check URL duplicate:', error);
    return false;
  }

  return data && data.length > 0;
}

/**
 * 게시판 제출 삭제
 * @param id - 제출 ID
 */
export async function deleteBoardSubmission(id: string): Promise<void> {
  const { error } = await supabase
    .from('dev_board_submissions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete board submission:', error);
    throw new Error(`게시판 제출 삭제에 실패했습니다: ${error.message}`);
  }
}

/**
 * 게시판 제출 승인
 * @param submissionId - 제출 ID
 * @param reviewComment - 검토 코멘트 (선택)
 * @param adminUserId - 승인한 관리자 ID
 * @returns 업데이트된 제출
 */
export async function approveBoardSubmission(
  submissionId: string,
  reviewComment: string | undefined,
  adminUserId: string
): Promise<DevBoardSubmission> {
  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from('dev_board_submissions')
    .update({
      status: 'approved',
      admin_review_comment: reviewComment || null,
      reviewed_by: adminUserId,
      reviewed_at: timestamp,
      approved_by: adminUserId,
      approved_at: timestamp,
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) {
    console.error('Failed to approve board submission:', error);
    throw new Error(`게시판 제출 승인에 실패했습니다: ${error.message}`);
  }

  return convertSubmissionRowToSubmission(data as DevBoardSubmissionRow);
}

/**
 * 게시판 제출 거부
 * @param submissionId - 제출 ID
 * @param reviewComment - 거부 사유 (필수)
 * @param adminUserId - 거부한 관리자 ID
 * @returns 업데이트된 제출
 */
export async function rejectBoardSubmission(
  submissionId: string,
  reviewComment: string,
  adminUserId: string
): Promise<DevBoardSubmission> {
  if (!reviewComment.trim()) {
    throw new Error('거부 사유를 입력해주세요');
  }

  const timestamp = new Date().toISOString();

  const { data, error } = await supabase
    .from('dev_board_submissions')
    .update({
      status: 'rejected',
      admin_review_comment: reviewComment,
      reviewed_by: adminUserId,
      reviewed_at: timestamp,
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) {
    console.error('Failed to reject board submission:', error);
    throw new Error(`게시판 제출 거부에 실패했습니다: ${error.message}`);
  }

  return convertSubmissionRowToSubmission(data as DevBoardSubmissionRow);
}

/**
 * 게시판 제출 승인 및 크롤 게시판 생성
 * @param submission - 승인할 제출
 * @param reviewComment - 검토 코멘트 (선택)
 * @param adminUserId - 승인한 관리자 ID
 * @returns 생성된 크롤 게시판
 */
export async function approveBoardSubmissionAndCreateCrawlBoard(
  submission: DevBoardSubmission,
  reviewComment: string | undefined,
  adminUserId: string
): Promise<{ submission: DevBoardSubmission; crawlBoard: CrawlBoard }> {
  // 1. 제출 승인
  const approvedSubmission = await approveBoardSubmission(
    submission.id,
    reviewComment,
    adminUserId
  );

  // 2. 지역 표시명 생성
  const regionDisplayName = await buildRegionDisplayName(
    submission.regionCode,
    submission.subregionCode
  );

  // 3. 크롤 게시판 생성 (지역 정보 포함)
  const crawlBoardInput: CreateCrawlBoardInput = {
    name: submission.boardName,
    boardUrl: submission.boardUrl,
    category: 'job', // 기본값: 채용 공고
    description: submission.description || `${regionDisplayName} - 개발자 제출`,
    isActive: false, // 크롤러 소스 작성 전까지 비활성화
    status: 'active', // crawl_status enum: 'active', 'broken', 'blocked'
    crawlBatchSize: 10,
    // 지역 정보 복사
    regionCode: submission.regionCode,
    subregionCode: submission.subregionCode,
    regionDisplayName: regionDisplayName,
    schoolLevel: (submission.schoolLevel as 'elementary' | 'middle' | 'high' | 'mixed') || 'mixed',
  };

  const crawlBoard = await createCrawlBoard(crawlBoardInput);

  // 4. 제출과 크롤 게시판 연결
  const { error: linkError } = await supabase
    .from('dev_board_submissions')
    .update({ crawl_board_id: crawlBoard.id })
    .eq('id', submission.id);

  if (linkError) {
    console.error('Failed to link submission to crawl board:', linkError);
    // 연결 실패해도 크롤 게시판은 이미 생성되었으므로 계속 진행
  }

  // 5. 생성된 크롤 게시판에 지역 정보 업데이트
  const { error: updateError } = await supabase
    .from('crawl_boards')
    .update({
      region_code: submission.regionCode,
      subregion_code: submission.subregionCode,
      region_display_name: regionDisplayName,
      school_level: submission.schoolLevel,
      approved_at: new Date().toISOString(),
      approved_by: adminUserId,
    })
    .eq('id', crawlBoard.id);

  if (updateError) {
    console.error('Failed to update crawl board with region info:', updateError);
  }

  return { submission: approvedSubmission, crawlBoard };
}

// =============================================================================
// Dev Projects (프로젝트)
// =============================================================================

/**
 * 프로젝트 생성
 * @param project - 프로젝트 데이터
 * @returns 생성된 프로젝트
 */
export async function createProject(project: ProjectFormData): Promise<DevProject> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // 인증 오류가 있어도 계속 진행 (익명 사용자 허용)
  if (authError) {
    console.warn('No authenticated user, proceeding as anonymous:', authError);
  }

  // 인증된 사용자가 있으면 user_id 사용, 없으면 NULL (익명)
  const userId = user?.id || null;

  const { data, error } = await supabase
    .from('dev_projects')
    .insert({
      user_id: userId,
      name: project.name,
      goal: project.goal,
      participants: project.participants,
      start_date: new Date().toISOString(),
      stages: project.stages.map((stage, index) => ({
        id: crypto.randomUUID(),
        order: index + 1,
        description: stage.description,
        is_completed: false,
        completed_at: null,
      })),
      status: project.status,
      source_idea_id: project.sourceIdeaId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create project:', error);
    throw new Error(`프로젝트 생성에 실패했습니다: ${error.message}`);
  }

  return convertProjectRowToProject(data as DevProjectRow);
}

/**
 * 프로젝트 목록 조회
 * @param limit - 조회할 프로젝트 수
 * @param offset - 시작 위치
 * @returns 프로젝트 목록
 */
export async function getProjects(
  limit = 20,
  offset = 0
): Promise<DevProject[]> {
  const { data, error } = await supabase
    .from('dev_projects')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to fetch projects:', error);
    throw new Error(`프로젝트를 불러올 수 없습니다: ${error.message}`);
  }

  return data.map((row: DevProjectRow) => convertProjectRowToProject(row));
}

/**
 * 프로젝트 상세 조회
 * @param id - 프로젝트 ID
 * @returns 프로젝트
 */
export async function getProjectById(id: string): Promise<DevProject> {
  const { data, error } = await supabase
    .from('dev_projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch project:', error);
    throw new Error(`프로젝트를 불러올 수 없습니다: ${error.message}`);
  }

  return convertProjectRowToProject(data as DevProjectRow);
}

/**
 * 프로젝트 수정
 * @param id - 프로젝트 ID
 * @param updates - 수정할 데이터
 * @returns 수정된 프로젝트
 */
export async function updateProject(
  id: string,
  updates: Partial<ProjectFormData>
): Promise<DevProject> {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name) updateData.name = updates.name;
  if (updates.goal) updateData.goal = updates.goal;
  if (updates.participants) updateData.participants = updates.participants;
  if (updates.status) updateData.status = updates.status;
  if (updates.stages) {
    updateData.stages = updates.stages.map((stage, index) => ({
      id: crypto.randomUUID(),
      order: index + 1,
      description: stage.description,
      is_completed: false,
      completed_at: null,
    }));
  }

  const { data, error } = await supabase
    .from('dev_projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Failed to update project:', error);
    throw new Error(`프로젝트 수정에 실패했습니다: ${error.message}`);
  }

  return convertProjectRowToProject(data as DevProjectRow);
}

/**
 * 프로젝트 단계 완료 처리
 * @param projectId - 프로젝트 ID
 * @param stageId - 단계 ID
 * @returns 업데이트된 프로젝트
 */
export async function completeProjectStage(
  projectId: string,
  stageId: string
): Promise<DevProject> {
  const project = await getProjectById(projectId);
  
  const updatedStages = project.stages.map(stage =>
    stage.id === stageId
      ? { ...stage, isCompleted: true, completedAt: new Date().toISOString() }
      : stage
  );

  const { data, error } = await supabase
    .from('dev_projects')
    .update({
      stages: updatedStages.map(s => ({
        id: s.id,
        order: s.order,
        description: s.description,
        is_completed: s.isCompleted,
        completed_at: s.completedAt,
      })),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Failed to complete project stage:', error);
    throw new Error(`프로젝트 단계 완료 처리에 실패했습니다: ${error.message}`);
  }

  return convertProjectRowToProject(data as DevProjectRow);
}

/**
 * 프로젝트 삭제
 * @param id - 프로젝트 ID
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('dev_projects').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete project:', error);
    throw new Error(`프로젝트 삭제에 실패했습니다: ${error.message}`);
  }
}

// =============================================================================
// Comments System
// =============================================================================

/**
 * 클라이언트 IP 해시 계산 (간단한 구현)
 * @returns IP 해시 문자열
 */
function getClientIpHash(): string {
  // 프론트엔드에서는 정확한 IP를 얻을 수 없으므로 브라우저 정보 기반 해시 사용
  const browserInfo = `${navigator.userAgent}-${navigator.language}`;
  let hash = 0;
  for (let i = 0; i < browserInfo.length; i++) {
    const char = browserInfo.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * 댓글 조회
 * @param targetType - 대상 타입 (idea, submission, project)
 * @param targetId - 대상 ID
 * @returns 댓글 목록
 */
export async function getComments(
  targetType: 'idea' | 'submission' | 'project',
  targetId: string
) {
  const { data, error } = await supabase
    .from('dev_comments')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch comments:', error);
    throw new Error(`댓글을 불러올 수 없습니다: ${error.message}`);
  }

  return data || [];
}

/**
 * 댓글 작성
 * @param targetType - 대상 타입
 * @param targetId - 대상 ID
 * @param content - 댓글 내용
 * @param authorName - 작성자 이름
 * @param parentId - 부모 댓글 ID (대댓글인 경우)
 * @returns 생성된 댓글
 */
export async function createComment(
  targetType: 'idea' | 'submission' | 'project',
  targetId: string,
  content: string,
  authorName: string,
  parentId?: string
) {
  const ipHash = getClientIpHash();

  // 작성자 정보 업데이트 또는 생성
  const { data: existingAuthor } = await supabase
    .from('dev_comment_authors')
    .select('*')
    .eq('ip_hash', ipHash)
    .single();

  if (existingAuthor) {
    // 기존 작성자 업데이트
    await supabase
      .from('dev_comment_authors')
      .update({
        author_name: authorName,
        last_used_at: new Date().toISOString(),
        comment_count: (existingAuthor.comment_count || 0) + 1,
      })
      .eq('ip_hash', ipHash);
  } else {
    // 새 작성자 생성
    await supabase.from('dev_comment_authors').insert({
      ip_hash: ipHash,
      author_name: authorName,
      comment_count: 1,
    });
  }

  // 댓글 생성
  const { data, error } = await supabase
    .from('dev_comments')
    .insert({
      target_type: targetType,
      target_id: targetId,
      content,
      author_name: authorName,
      author_ip_hash: ipHash,
      parent_id: parentId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create comment:', error);
    throw new Error(`댓글 작성에 실패했습니다: ${error.message}`);
  }

  return data;
}

/**
 * 댓글 수정
 * @param commentId - 댓글 ID
 * @param content - 새 내용
 * @returns 수정된 댓글
 */
export async function updateComment(commentId: string, content: string) {
  const { data, error } = await supabase
    .from('dev_comments')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update comment:', error);
    throw new Error(`댓글 수정에 실패했습니다: ${error.message}`);
  }

  return data;
}

/**
 * 댓글 삭제
 * @param commentId - 댓글 ID
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await supabase
    .from('dev_comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    console.error('Failed to delete comment:', error);
    throw new Error(`댓글 삭제에 실패했습니다: ${error.message}`);
  }
}

/**
 * 작성자 정보 조회 (IP 해시 기반)
 * @returns 작성자 정보
 */
export async function getAuthorInfo() {
  const ipHash = getClientIpHash();

  const { data, error } = await supabase
    .from('dev_comment_authors')
    .select('author_name')
    .eq('ip_hash', ipHash)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116: no rows returned
    console.error('Failed to fetch author info:', error);
  }

  return data?.author_name || '';
}

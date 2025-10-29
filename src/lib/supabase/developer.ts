// Developer Page Supabase Query Functions
import { supabase } from './client';
import type {
  GitHubDeploymentRow,
  GitHubDeployment,
  DevIdeaRow,
  DevIdea,
  IdeaCategory,
  BoardSubmissionRow,
  BoardSubmission,
  BoardSubmissionCreate,
} from '@/types/developer';

// Converter functions must be imported without 'type' (runtime values)
import {
  convertDeploymentRowToDeployment,
  convertIdeaRowToIdea,
  convertSubmissionRowToSubmission,
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
  submission: BoardSubmissionCreate
): Promise<BoardSubmission> {
  const { data, error } = await supabase
    .from('dev_board_submissions')
    .insert({
      board_name: submission.boardName,
      board_url: submission.boardUrl,
      region: submission.region || null,
      description: submission.description || null,
      submitter_name: submission.submitterName || '익명',
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create board submission:', error);
    throw new Error(`게시판 제출에 실패했습니다: ${error.message}`);
  }

  return convertSubmissionRowToSubmission(data as BoardSubmissionRow);
}

/**
 * 게시판 제출 목록 조회
 * @param limit - 조회할 제출 수
 * @param offset - 시작 위치
 * @returns 제출 목록
 */
export async function getBoardSubmissions(
  limit = 20,
  offset = 0
): Promise<BoardSubmission[]> {
  const { data, error } = await supabase
    .from('dev_board_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to fetch board submissions:', error);
    throw new Error(`게시판 제출을 불러올 수 없습니다: ${error.message}`);
  }

  return data.map((row: BoardSubmissionRow) =>
    convertSubmissionRowToSubmission(row)
  );
}

/**
 * 게시판 제출 상세 조회
 * @param id - 제출 ID
 * @returns 제출
 */
export async function getBoardSubmissionById(
  id: string
): Promise<BoardSubmission> {
  const { data, error } = await supabase
    .from('dev_board_submissions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Failed to fetch board submission:', error);
    throw new Error(`게시판 제출을 불러올 수 없습니다: ${error.message}`);
  }

  return convertSubmissionRowToSubmission(data as BoardSubmissionRow);
}

/**
 * URL 중복 체크
 * @param url - 체크할 URL
 * @returns 중복 여부
 */
export async function checkBoardUrlDuplicate(url: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('dev_board_submissions')
    .select('id')
    .eq('board_url', url)
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

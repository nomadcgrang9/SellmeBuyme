// Developer Page Type Definitions

// =============================================================================
// Enums & Union Types
// =============================================================================

export type IdeaCategory = 'feature' | 'bug' | 'design' | 'other';
export type SubmissionStatus = 'pending' | 'approved';
export type DeploymentStatus = 'pending' | 'success' | 'failure';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'difficult';

// =============================================================================
// Database Row Types (matching snake_case from DB)
// =============================================================================

export interface DevIdeaRow {
  id: string;
  user_id: string | null;
  author_name: string;
  title: string;
  content: string;
  category: IdeaCategory;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface DevProjectRow {
  id: string;
  user_id: string | null;
  name: string;
  goal: string;
  participants: string[];
  start_date: string;
  stages: Array<{ id: string; order: number; description: string; is_completed: boolean; completed_at: string | null }>;
  status: ProjectStatus;
  source_idea_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevBoardSubmissionRow {
  id: string;
  submitter_id: string | null;
  submitter_name: string;
  board_name: string;
  board_url: string;
  region: string | null;  // deprecated, use region_code/subregion_code
  description: string | null;
  screenshot_url: string | null;
  status: SubmissionStatus;
  admin_review_comment: string | null;  // renamed from admin_notes
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;

  // Regional management fields (new)
  region_code: string | null;
  subregion_code: string | null;
  school_level: string | null;
  crawl_board_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface GitHubDeploymentRow {
  id: string;
  commit_sha: string;
  commit_message: string | null;
  branch: string;
  author: string | null;
  status: DeploymentStatus;
  workflow_run_id: string | null;
  deployed_at: string;
  created_at: string;
}

// =============================================================================
// Client-side Types (camelCase for easier use in React)
// =============================================================================

export interface DevIdea {
  id: string;
  userId: string | null;
  authorName: string;
  title: string;
  content: string;
  category: IdeaCategory;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStage {
  id: string;
  order: number;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface DevProject {
  id: string;
  userId: string | null;
  name: string;
  goal: string;
  participants: string[];
  startDate: string;
  stages: ProjectStage[];
  status: ProjectStatus;
  sourceIdeaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevBoardSubmission {
  id: string;
  submitterId: string | null;
  submitterName: string;
  boardName: string;
  boardUrl: string;
  region: string | null;  // deprecated, use regionCode/subregionCode
  description: string | null;
  screenshotUrl: string | null;
  status: SubmissionStatus;
  adminReviewComment: string | null;  // renamed from adminNotes
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Regional management fields (new)
  regionCode: string | null;
  subregionCode: string | null;
  schoolLevel: string | null;
  crawlBoardId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface GitHubDeployment {
  id: string;
  commitSha: string;
  commitMessage: string | null;
  branch: string;
  author: string | null;
  status: DeploymentStatus;
  workflowRunId: string | null;
  deployedAt: string;
  createdAt: string;
}

// =============================================================================
// Form Input Types
// =============================================================================

export interface IdeaFormData {
  authorName: string;
  content: string;
  category: IdeaCategory;
  images: File[];
}

export interface ProjectFormData {
  name: string;
  goal: string;
  participants: string[];
  stages: Array<{ description: string }>;
  status: ProjectStatus;
  sourceIdeaId?: string;
}

export interface BoardSubmissionFormData {
  boardName: string;
  boardUrl: string;
  region?: string;  // deprecated, for backward compatibility
  regionCode: string;  // required: province code (e.g., 'KR-41')
  subregionCode: string | null;  // optional: city code (e.g., '4113025')
  schoolLevel: 'elementary' | 'middle' | 'high' | 'mixed';  // required
  description?: string;
  screenshot?: File | null;
}

// =============================================================================
// Utility Types
// =============================================================================

export interface CategoryOption {
  value: IdeaCategory;
  label: string;
  icon: string;  // Lucide icon name
}

export interface StatusBadgeConfig {
  status: SubmissionStatus | DeploymentStatus;
  label: string;
  colorClass: string;
}

// =============================================================================
// Converter Functions (DB row → Client type)
// =============================================================================

export function convertIdeaRowToIdea(row: DevIdeaRow): DevIdea {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    title: row.title,
    content: row.content,
    category: row.category,
    images: row.images,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function convertProjectRowToProject(row: DevProjectRow): DevProject {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    goal: row.goal,
    participants: row.participants,
    startDate: row.start_date,
    stages: row.stages.map(s => ({
      id: s.id,
      order: s.order,
      description: s.description,
      isCompleted: s.is_completed,
      completedAt: s.completed_at,
    })),
    status: row.status,
    sourceIdeaId: row.source_idea_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function convertSubmissionRowToSubmission(
  row: DevBoardSubmissionRow
): DevBoardSubmission {
  return {
    id: row.id,
    submitterId: row.submitter_id,
    submitterName: row.submitter_name,
    boardName: row.board_name,
    boardUrl: row.board_url,
    region: row.region,
    description: row.description,
    screenshotUrl: row.screenshot_url,
    status: row.status,
    adminReviewComment: row.admin_review_comment,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    // Regional management fields
    regionCode: row.region_code,
    subregionCode: row.subregion_code,
    schoolLevel: row.school_level,
    crawlBoardId: row.crawl_board_id,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

export function convertDeploymentRowToDeployment(
  row: GitHubDeploymentRow
): GitHubDeployment {
  return {
    id: row.id,
    commitSha: row.commit_sha,
    commitMessage: row.commit_message,
    branch: row.branch,
    author: row.author,
    status: row.status,
    workflowRunId: row.workflow_run_id,
    deployedAt: row.deployed_at,
    createdAt: row.created_at,
  };
}

// =============================================================================
// Constants
// =============================================================================

export const IDEA_CATEGORIES: CategoryOption[] = [
  { value: 'feature', label: '새 기능', icon: 'Lightbulb' },
  { value: 'bug', label: '버그', icon: 'Bug' },
  { value: 'design', label: '디자인', icon: 'Palette' },
  { value: 'other', label: '기타', icon: 'MoreHorizontal' },
];

export const SUBMISSION_STATUS_CONFIG: Record<SubmissionStatus, StatusBadgeConfig> = {
  pending: { status: 'pending', label: '⏳ 대기중', colorClass: 'bg-yellow-100 text-yellow-800' },
  approved: { status: 'approved', label: '✅ 승인됨', colorClass: 'bg-green-100 text-green-800' },
};

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, { label: string; icon: string; colorClass: string }> = {
  active: { label: '🟢 진행중', icon: 'Play', colorClass: 'bg-blue-100 text-blue-800' },
  paused: { label: '🟡 보류', icon: 'Pause', colorClass: 'bg-yellow-100 text-yellow-800' },
  completed: { label: '✅ 완료', icon: 'CheckCircle', colorClass: 'bg-green-100 text-green-800' },
  difficult: { label: '🔴 어려움', icon: 'AlertCircle', colorClass: 'bg-red-100 text-red-800' },
};

export const DEPLOYMENT_STATUS_CONFIG: Record<DeploymentStatus, StatusBadgeConfig> = {
  pending: { status: 'pending', label: '진행중', colorClass: 'bg-blue-100 text-blue-800' },
  success: { status: 'success', label: '성공', colorClass: 'bg-green-100 text-green-800' },
  failure: { status: 'failure', label: '실패', colorClass: 'bg-red-100 text-red-800' },
};

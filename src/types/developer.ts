// Developer Page Type Definitions

// =============================================================================
// Enums & Union Types
// =============================================================================

export type IdeaCategory = 'feature' | 'bug' | 'design' | 'other';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';
export type DeploymentStatus = 'pending' | 'success' | 'failure';

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

export interface DevBoardSubmissionRow {
  id: string;
  submitter_id: string | null;
  submitter_name: string;
  board_name: string;
  board_url: string;
  region: string | null;
  description: string | null;
  screenshot_url: string | null;
  status: SubmissionStatus;
  admin_notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
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

export interface DevBoardSubmission {
  id: string;
  submitterId: string | null;
  submitterName: string;
  boardName: string;
  boardUrl: string;
  region: string | null;
  description: string | null;
  screenshotUrl: string | null;
  status: SubmissionStatus;
  adminNotes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
  title: string;
  content: string;
  category: IdeaCategory;
  images: File[];
}

export interface BoardSubmissionFormData {
  boardName: string;
  boardUrl: string;
  region: string;
  description: string;
  screenshot: File | null;
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
    adminNotes: row.admin_notes,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
  pending: { status: 'pending', label: '대기', colorClass: 'bg-yellow-100 text-yellow-800' },
  approved: { status: 'approved', label: '승인', colorClass: 'bg-green-100 text-green-800' },
  rejected: { status: 'rejected', label: '거부', colorClass: 'bg-red-100 text-red-800' },
};

export const DEPLOYMENT_STATUS_CONFIG: Record<DeploymentStatus, StatusBadgeConfig> = {
  pending: { status: 'pending', label: '진행중', colorClass: 'bg-blue-100 text-blue-800' },
  success: { status: 'success', label: '성공', colorClass: 'bg-green-100 text-green-800' },
  failure: { status: 'failure', label: '실패', colorClass: 'bg-red-100 text-red-800' },
};

// Developer Page Type Definitions

// =============================================================================
// Enums & Union Types
// =============================================================================

export type IdeaCategory = 'feature' | 'bug' | 'design' | 'other';
export type SubmissionStatus = 'pending' | 'approved';
export type DeploymentStatus = 'pending' | 'success' | 'failure';
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'difficult';
export type NoticeCategory = 'notice' | 'update' | 'event' | 'important';

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
  todos: Array<{ id: string; content: string; is_completed: boolean; completed_at: string | null }>;
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
  is_local_government: boolean | null;
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

export interface DevNoticeRow {
  id: string;
  user_id: string | null;
  author_name: string;
  title: string;
  content: string;
  category: NoticeCategory;
  is_pinned: boolean;
  attachments: string[] | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Client-side Types (camelCase for easier use in React)
// =============================================================================

export interface IdeaTodo {
  id: string;
  content: string;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface DevIdea {
  id: string;
  userId: string | null;
  authorName: string;
  title: string;
  content: string;
  category: IdeaCategory;
  images: string[];
  todos: IdeaTodo[];
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

// =============================================================================
// Comment Types (Frontend)
// =============================================================================

export type CommentTargetType = 'idea' | 'submission' | 'project' | 'notice';

export interface DevComment {
  id: string;
  parentId: string | null;
  targetType: CommentTargetType;
  targetId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  replies?: DevComment[];
}

export interface CommentDraft {
  content: string;
  parentId?: string;
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
  isLocalGovernment: boolean | null;
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

export interface DevNotice {
  id: string;
  userId: string | null;
  authorName: string;
  title: string;
  content: string;
  category: NoticeCategory;
  isPinned: boolean;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
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
  isLocalGovernment: boolean;  // required: true=기초자치단체, false=광역자치단체
  description?: string;
  screenshot?: File | null;
}

export interface NoticeFormData {
  authorName: string;
  title: string;
  content: string;
  category: NoticeCategory;
  isPinned: boolean;
  attachments: File[];
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
    todos: (row.todos || []).map((t) => ({
      id: t.id,
      content: t.content,
      isCompleted: t.is_completed,
      completedAt: t.completed_at,
    })),
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
    isLocalGovernment: row.is_local_government,
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

export function convertNoticeRowToNotice(row: DevNoticeRow): DevNotice {
  return {
    id: row.id,
    userId: row.user_id,
    authorName: row.author_name,
    title: row.title,
    content: row.content,
    category: row.category,
    isPinned: row.is_pinned,
    attachments: row.attachments || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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

// =============================================================================
// 크롤링 상태 점검 타입
// =============================================================================

export type CrawlerHealthStatus = 'healthy' | 'warning' | 'critical' | 'inactive' | 'error';

export interface CrawlerHealthResult {
  regionCode: string;
  regionName: string;
  assignee: string;
  boardUrl: string;

  // 원본 게시판 정보 (AI 분석)
  originalCount: number;
  originalTitles: string[];

  // DB 정보
  dbCount: number;
  latestCrawlDate: string | null;
  daysSinceCrawl: number | null;

  // 비교 결과
  matchCount: number;
  missingCount: number;
  collectionRate: number;
  missingTitles: string[];

  // 상태
  status: CrawlerHealthStatus;
  statusReason: string;

  // AI 분석
  aiComment: string;

  checkedAt: string;
}

export interface CrawlerHealthSummary {
  critical: number;
  warning: number;
  healthy: number;
  inactive: number;
  error: number;
  total: number;
}

// 지역별 게시판 URL 매핑 (sources.json 기반 - 동기화됨)
export const REGION_BOARDS: Record<string, {
  code: string;
  name: string;
  boardUrl: string;
  active: boolean;
  assignee: string;
}> = {
  seoul: {
    code: 'seoul',
    name: '서울',
    boardUrl: 'https://work.sen.go.kr/recruit/job/pageListJob.do',
    active: false,
    assignee: '김성균'
  },
  busan: {
    code: 'busan',
    name: '부산',
    boardUrl: 'https://www.pen.go.kr/selectBbsNttList.do?bbsNo=397&key=1553',
    active: false,
    assignee: '최선결'
  },
  daegu: {
    code: 'daegu',
    name: '대구',
    boardUrl: 'https://www.dge.go.kr/main/na/ntt/selectNttList.do?mi=5186&bbsId=1047',
    active: true,
    assignee: '최선결'
  },
  incheon: {
    code: 'incheon',
    name: '인천',
    boardUrl: 'https://www.ice.go.kr/boardCnts/list.do?boardID=1639&m=040802&s=ice',
    active: false,
    assignee: '김성균'
  },
  gwangju: {
    code: 'gwangju',
    name: '광주',
    boardUrl: 'https://www.gen.go.kr/xboard/list.xboard?menuId=0001000000&searchOptYn=Y',
    active: false,
    assignee: '이진혁'
  },
  daejeon: {
    code: 'daejeon',
    name: '대전',
    boardUrl: 'https://www.dje.go.kr/boardCnts/list.do?boardID=54&m=030202&s=dje',
    active: false,
    assignee: '최선결'
  },
  ulsan: {
    code: 'ulsan',
    name: '울산',
    boardUrl: 'https://www.use.go.kr/subPage.do?page=sub06_06_01&m=0606&s=use',
    active: false,
    assignee: '최선결'
  },
  sejong: {
    code: 'sejong',
    name: '세종',
    boardUrl: 'https://www.sje.go.kr/sje/na/ntt/selectNttList.do?mi=52132&bbsId=108',
    active: true,
    assignee: '김성균'
  },
  gyeonggi: {
    code: 'gyeonggi',
    name: '경기',
    boardUrl: 'https://www.goe.go.kr/recruit/ad/func/pb/hnfpPbancList.do?mi=10502',
    active: true,
    assignee: '김성균'
  },
  gangwon: {
    code: 'gangwon',
    name: '강원',
    boardUrl: 'https://www.gwe.go.kr/main/bbs/list.do?key=bTIzMDcyMTA1ODU2MzM=',
    active: true,
    assignee: '김성균'
  },
  chungbuk: {
    code: 'chungbuk',
    name: '충북',
    boardUrl: 'https://www.cbe.go.kr/cbe/na/ntt/selectNttList.do?mi=11716&bbsId=1798',
    active: true,
    assignee: '이진혁'
  },
  chungnam: {
    code: 'chungnam',
    name: '충남',
    boardUrl: 'https://www.cne.go.kr/boardCnts/list.do?boardID=642&m=020201&s=cne',
    active: true,
    assignee: '이진혁'
  },
  jeonbuk: {
    code: 'jeonbuk',
    name: '전북',
    boardUrl: 'https://www.jbe.go.kr/board/list.jbe?boardId=BBS_0000130&menuCd=DOM_000000103004006000',
    active: true,
    assignee: '이진혁'
  },
  jeonnam: {
    code: 'jeonnam',
    name: '전남',
    boardUrl: 'https://www.jne.go.kr/main/na/ntt/selectNttList.do?mi=265&bbsId=117',
    active: true,
    assignee: '이진혁'
  },
  gyeongbuk: {
    code: 'gyeongbuk',
    name: '경북',
    boardUrl: 'https://www.gbe.kr/main/na/ntt/selectNttList.do?mi=3626&bbsId=1887',
    active: true,
    assignee: '최선결'
  },
  gyeongnam: {
    code: 'gyeongnam',
    name: '경남',
    boardUrl: 'https://www.gne.go.kr/works/user/recruitment/BD_recruitmentList.do',
    active: true,
    assignee: '최선결'
  },
  jeju: {
    code: 'jeju',
    name: '제주',
    boardUrl: 'https://www.jje.go.kr/board/list.jje?boardId=BBS_0000507&menuCd=DOM_000000103003009000',
    active: true,
    assignee: '이진혁'
  }
};

export const CRAWLER_HEALTH_STATUS_CONFIG: Record<CrawlerHealthStatus, {
  label: string;
  emoji: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  healthy: {
    label: '정상',
    emoji: '🟢',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    textColor: 'text-green-600'
  },
  warning: {
    label: '주의',
    emoji: '🟡',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    textColor: 'text-yellow-600'
  },
  critical: {
    label: '긴급',
    emoji: '🔴',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-600'
  },
  inactive: {
    label: '비활성',
    emoji: '⚪',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-400'
  },
  error: {
    label: '오류',
    emoji: '⚠️',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    textColor: 'text-orange-600'
  }
};

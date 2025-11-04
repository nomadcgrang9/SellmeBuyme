/**
 * Phase 5 AI Generator 타입 정의
 */

export interface BoardAnalysisResult {
  success: boolean;
  url: string;
  mostSimilarPattern?: 'A' | 'B' | 'C';
  confidence?: number;
  listPage?: {
    containerSelector: string;
    rowSelector: string;
    titleSelector: string;
    dateSelector: string;
    linkExtraction: {
      method: 'data-id' | 'href' | 'onclick';
      attribute?: string;
      regex?: string;
    };
    paginationType: 'query' | 'POST' | 'button';
  };
  detailPage?: {
    contentSelector: string;
    attachmentSelector: string;
    titleSelector: string;
  };
  reasoning?: string;
  rawResponse?: string;
  error?: string;
}

export interface CapturedBoardData {
  boardUrl: string;
  listPageHtml: string;
  listPageScreenshot: string | null;
  detailPageHtml: string;
  detailPageScreenshot: string | null;
}

export interface CrawlerGenerationOptions {
  boardUrl: string;
  boardName: string;
  analysis: BoardAnalysisResult;
  region?: string; // 지역명 (예: "성남", "경기도")
  isLocalGovernment?: boolean; // 기초자치단체 여부 (true=기초, false=광역)
}

export interface CrawlerCodeResult {
  success: boolean;
  code?: string;
  filename?: string;
  error?: string;
  warnings?: string[];
}

export interface TestExecutionResult {
  success: boolean;
  jobsCollected: number;
  errors: CrawlerError[];
  screenshots: string[];
  executionTime: number;
  logs: string[];
}

export interface CrawlerError {
  step: string;
  error: string;
  timestamp?: Date;
}

export interface GenerationAttempt {
  attemptNumber: number;
  analysis: BoardAnalysisResult | null;
  crawlerCode: string | null;
  testResult: TestExecutionResult | null;
  error: string | null;
}

export interface CrawlerGenerationState {
  boardUrl: string;
  boardName: string;
  region?: string;
  isLocalGovernment?: boolean;
  attempt: number;
  maxAttempts: number;

  analysis: BoardAnalysisResult | null;
  crawlerCode: string | null;
  testResult: TestExecutionResult | null;

  errorHistory: string[];
  finalStatus: 'success' | 'failed' | 'in_progress';
  finalCrawlerPath: string | null;
  attempts: GenerationAttempt[];
}

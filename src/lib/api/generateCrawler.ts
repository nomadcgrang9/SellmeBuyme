/**
 * AI 크롤러 생성 API
 * Phase 5 파이프라인 호출
 */

import { supabase } from '@/lib/supabase/client';

export interface GenerateCrawlerRequest {
  submissionId: string;
  boardName: string;
  boardUrl: string;
  adminUserId: string;
}

export interface GenerateCrawlerResponse {
  success: boolean;
  crawlerId?: string;
  crawlerCode?: string;
  crawlBoardId?: string;
  message: string;
  error?: string;
}

/**
 * AI 크롤러 생성 요청
 * 로컬 백엔드 API 호출
 */
export async function generateCrawlerViaAPI(
  request: GenerateCrawlerRequest
): Promise<GenerateCrawlerResponse> {
  try {

    // 로컬 백엔드 API 호출
    const response = await fetch('/api/generate-crawler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API 오류: ${response.status}`
      );
    }

    const result: GenerateCrawlerResponse = await response.json();

    return result;
  } catch (error) {
    console.error('[generateCrawlerViaAPI] 오류:', error);
    return {
      success: false,
      message: '크롤러 생성 중 오류 발생',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 크롤 게시판 생성 (로컬 처리)
 * Supabase 직접 호출
 */
export async function createCrawlBoardLocally(
  boardName: string,
  boardUrl: string,
  adminUserId: string,
  crawlerCode: string
): Promise<{ id: string }> {

  const { data: existingBoard, error: fetchError } = await supabase
    .from('crawl_boards')
    .select('id, is_active, crawler_source_code')
    .eq('board_url', boardUrl)
    .maybeSingle();

  if (fetchError) {
    console.error('[createCrawlBoardLocally] crawl_boards 조회 실패:', fetchError);
    throw new Error(`crawl_boards 조회 실패: ${fetchError.message}`);
  }

  if (existingBoard?.id) {

    // 기존 게시판이 비활성화되어 있거나 크롤러 코드가 없으면 업데이트
    const { error: updateError } = await supabase
      .from('crawl_boards')
      .update({
        name: boardName,
        description: `AI 자동 생성 크롤러 - ${boardName}`,
        is_active: true,
        status: 'active',
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
        crawler_source_code: crawlerCode,
      })
      .eq('id', existingBoard.id);

    if (updateError) {
      console.error('[createCrawlBoardLocally] 기존 crawl_board 업데이트 실패:', updateError);
    } else {
    }

    return { id: existingBoard.id };
  }


  const insertPayload: Record<string, unknown> = {
    name: boardName,
    board_url: boardUrl,
    category: 'job',
    description: `AI 자동 생성 크롤러 - ${boardName}`,
    is_active: true,
    status: 'active',
    crawl_batch_size: 10,
    crawler_source_code: crawlerCode,
    approved_by: adminUserId,
    approved_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('crawl_boards')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    console.error('[createCrawlBoardLocally] crawl_boards 등록 실패:', error);
    throw new Error(`crawl_boards 등록 실패: ${error.message}`);
  }

  return data;
}

/**
 * 개발자 제출 승인 (로컬 처리)
 * Supabase 직접 호출
 */
export async function approveBoardSubmissionLocally(
  submissionId: string,
  crawlBoardId: string,
  adminUserId: string
): Promise<void> {

  const { error } = await supabase
    .from('dev_board_submissions')
    .update({
      status: 'approved',
      crawl_board_id: crawlBoardId,
      approved_by: adminUserId,
      approved_at: new Date().toISOString(),
    })
    .eq('id', submissionId);

  if (error) {
    console.error('[approveBoardSubmissionLocally] 제출 승인 업데이트 실패:', error);
  } else {
  }
}

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function analyze() {
  console.log('=== 1. crawl_boards 테이블 조회 ===\n');
  
  const { data: boards, error: boardsError } = await supabase
    .from('crawl_boards')
    .select('id, name, status, approved_at, last_crawled_at, last_success_at, is_active, region_display_name, board_url')
    .order('created_at', { ascending: false });
    
  if (boardsError) {
    console.error('Error:', boardsError);
  } else {
    console.log('총 게시판 수:', boards?.length);
    boards?.forEach((b, i) => {
      const idx = i + 1;
      console.log(`\n[${idx}] ${b.name}`);
      console.log('  ID:', b.id);
      console.log('  URL:', b.board_url);
      console.log('  지역:', b.region_display_name || '(없음)');
      console.log('  상태:', b.status);
      console.log('  활성화:', b.is_active);
      console.log('  승인:', b.approved_at || '대기');
      console.log('  최근 크롤:', b.last_crawled_at || '없음');
      console.log('  최근 성공:', b.last_success_at || '없음');
    });
  }
  
  console.log('\n\n=== 2. dev_board_submissions 연결 확인 ===\n');
  
  const { data: submissions, error: submError } = await supabase
    .from('dev_board_submissions')
    .select('id, board_name, board_url, status, crawl_board_id, approved_at')
    .order('created_at', { ascending: false });
    
  if (submError) {
    console.error('Error:', submError);
  } else {
    console.log('총 제출 수:', submissions?.length);
    submissions?.forEach((s, i) => {
      const idx = i + 1;
      console.log(`\n[${idx}] ${s.board_name}`);
      console.log('  제출 ID:', s.id);
      console.log('  URL:', s.board_url);
      console.log('  상태:', s.status);
      console.log('  크롤 게시판 연결:', s.crawl_board_id || '(연결 안됨)');
      console.log('  승인:', s.approved_at || '미승인');
    });
  }
  
  console.log('\n\n=== 3. crawl_logs 최근 기록 ===\n');
  
  const { data: logs, error: logsError } = await supabase
    .from('crawl_logs')
    .select('id, board_id, status, started_at, completed_at, items_found, items_new, error_log')
    .order('started_at', { ascending: false })
    .limit(20);
    
  if (logsError) {
    console.error('Error:', logsError);
  } else {
    console.log('최근 크롤 로그:', logs?.length, '개');
    for (const log of logs || []) {
      const board = boards?.find(b => b.id === log.board_id);
      console.log(`\n[로그] ${log.started_at}`);
      console.log('  게시판:', board?.name || log.board_id);
      console.log('  상태:', log.status);
      console.log('  발견:', log.items_found, '/ 신규:', log.items_new);
      if (log.error_log) {
        console.log('  에러:', log.error_log.substring(0, 100));
      }
    }
  }
  
  console.log('\n\n=== 4. job_postings 출처별 통계 ===\n');
  
  for (const board of boards || []) {
    const { count, error } = await supabase
      .from('job_postings')
      .select('*', { count: 'exact', head: true })
      .eq('crawl_board_id', board.id);
      
    if (!error) {
      console.log(`${board.name}: ${count}개 공고`);
    }
  }
}

analyze().catch(console.error);

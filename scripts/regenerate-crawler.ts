import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qpwnsvsiduvvqdijyxio.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM'
);

const BOARD_ID = 'f72665d5-eaa1-4f2f-af98-97e27bd441cf';

async function regenerateCrawler() {
  // 1. Get board info
  console.log('[1] Getting board info...');
  const { data: board, error: boardError } = await supabase
    .from('crawl_boards')
    .select('*')
    .eq('id', BOARD_ID)
    .single();

  if (boardError || !board) {
    console.error('Failed to get board:', boardError);
    return;
  }

  console.log(`Board: ${board.name}`);

  // 2. Find submission ID
  console.log('[2] Finding submission...');
  const { data: submission, error: submissionError } = await supabase
    .from('dev_board_submissions')
    .select('*')
    .eq('crawl_board_id', BOARD_ID)
    .maybeSingle();

  if (submissionError) {
    console.error('Failed to get submission:', submissionError);
    return;
  }

  const submissionId = submission?.id || 'temp-submission-' + Date.now();
  const adminUserId = submission?.submitted_by || '00000000-0000-0000-0000-000000000000';

  console.log(`Submission ID: ${submissionId}`);

  // 3. Call generate-crawler Edge Function
  console.log('[3] Calling generate-crawler...');
  const { data, error } = await supabase.functions.invoke('generate-crawler', {
    body: {
      submissionId,
      boardName: board.name,
      boardUrl: board.board_url,
      adminUserId
    }
  });

  if (error) {
    console.error('Failed to generate crawler:', error);
    return;
  }

  console.log('[4] Response:', data);
  console.log('✅ Crawler regenerated successfully!');
  console.log('Code length:', data.crawlerCode?.length || 0);
}

regenerateCrawler().catch(err => console.error('Error:', err));

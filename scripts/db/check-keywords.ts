import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3MDU3NzAsImV4cCI6MjA3NjI4MTc3MH0.anomdGhxNrL3aHJ4x-PM6wXWcADNKuKZnuQ2mv8cWuQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKeywords(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔍 popular_keywords 테이블 확인');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { data: keywords, error } = await supabase
    .from('popular_keywords')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('❌ 에러:', error);
    return;
  }

  console.log(`총 ${keywords?.length || 0}개의 키워드\n`);

  keywords?.forEach((kw: any, idx: number) => {
    console.log(`${idx + 1}. ID: ${kw.id}`);
    console.log(`   키워드: ${kw.keyword}`);
    console.log(`   타입: ${typeof kw.keyword}`);
    console.log(`   수동: ${kw.is_manual}`);
    console.log(`   활성화: ${kw.is_active}`);
    console.log(`   순서: ${kw.display_order}`);
    console.log(`   원본 데이터:`, kw);
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

checkKeywords().catch(console.error);

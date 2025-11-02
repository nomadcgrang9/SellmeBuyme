import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// SERVICE_ROLE 키 사용 (RLS 우회)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function regenerateCache() {
  const userId = '85823de2-b69b-4829-8e1b-c3764c7d633c';

  console.log('🗑️  기존 캐시 삭제 중...\n');

  const { error: deleteError } = await supabase
    .from('recommendations_cache')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('캐시 삭제 실패:', deleteError);
    return;
  }

  console.log('✅ 캐시 삭제 완료\n');
  console.log('📞 Edge Function 호출 중...\n');
  console.log('(브라우저를 새로고침하면 자동으로 Edge Function이 호출되어 새 캐시가 생성됩니다)');
}

regenerateCache();

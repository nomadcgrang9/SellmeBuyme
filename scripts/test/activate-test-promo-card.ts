/**
 * 테스트용 프로모카드 활성화 및 그라데이션 설정
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function activateTestCard() {
  console.log('🚀 테스트 프로모카드 활성화 중...\n');

  // 첫 번째 카드 활성화 및 설정
  const { data, error } = await supabase
    .from('promo_cards')
    .update({
      is_active: true,
      background_color_mode: 'gradient',
      background_gradient_start: '#667eea', // 보라색
      background_gradient_end: '#764ba2',   // 진한 보라색
      font_color: '#ffffff',
      font_size: 20,
      image_scale: 1,
      auto_play: true,
      duration: 5000
    })
    .eq('headline', '공고 등록하면,             \n해결!')
    .select();

  if (error) {
    console.error('❌ 업데이트 실패:', error);
    return;
  }

  console.log('✅ 프로모카드 활성화 완료!\n');
  console.log('설정된 값:');
  console.log('  - 활성화: true');
  console.log('  - 배경 모드: gradient');
  console.log('  - 그라데이션: #667eea → #764ba2 (보라색)');
  console.log('  - 폰트 색: #ffffff (흰색)');
  console.log('  - 자동재생: 5초\n');

  console.log('📱 이제 모바일에서 보라색 그라데이션 배경이 보일 것입니다!');
}

activateTestCard().catch(console.error);

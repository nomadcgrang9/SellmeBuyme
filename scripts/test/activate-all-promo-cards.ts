/**
 * 모든 프로모카드 활성화 및 그라데이션 설정
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 시안 그라데이션으로 통일 (중고나라 스타일)
const gradients = [
  { start: '#4facfe', end: '#00f2fe', name: '시안' },        // 카드 1
  { start: '#4facfe', end: '#00f2fe', name: '시안' },        // 카드 2
  { start: '#4facfe', end: '#00f2fe', name: '시안' },        // 카드 3
  { start: '#4facfe', end: '#00f2fe', name: '시안' },        // 카드 4
  { start: '#4facfe', end: '#00f2fe', name: '시안' }         // 카드 5
];

async function activateAllCards() {
  console.log('🚀 모든 프로모카드 활성화 중...\n');

  // 모든 카드 조회
  const { data: cards } = await supabase
    .from('promo_cards')
    .select('*')
    .order('order_index', { ascending: true });

  if (!cards || cards.length === 0) {
    console.log('❌ 프로모카드가 없습니다.');
    return;
  }

  // 각 카드 활성화 및 그라데이션 설정
  for (let i = 0; i < Math.min(cards.length, gradients.length); i++) {
    const card = cards[i];
    const gradient = gradients[i];

    const { error } = await supabase
      .from('promo_cards')
      .update({
        is_active: true,
        background_color_mode: 'gradient',
        background_gradient_start: gradient.start,
        background_gradient_end: gradient.end,
        font_color: '#ffffff',
        font_size: 20,
        image_scale: 1,
        auto_play: true,
        duration: 5000
      })
      .eq('id', card.id);

    if (error) {
      console.error(`❌ 카드 ${i + 1} 업데이트 실패:`, error);
    } else {
      console.log(`✅ 카드 ${i + 1} 활성화: ${card.headline.substring(0, 20)}...`);
      console.log(`   그라데이션: ${gradient.name} (${gradient.start} → ${gradient.end})\n`);
    }
  }

  console.log('🎉 모든 카드 활성화 완료!');
  console.log(`📊 총 ${Math.min(cards.length, gradients.length)}개 카드 설정됨\n`);
}

activateAllCards().catch(console.error);

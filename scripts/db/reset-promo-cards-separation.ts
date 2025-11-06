/**
 * 프로모카드 모바일/데스크톱 분리 스크립트
 * - 모바일용: 시안 그라데이션 유지
 * - 데스크톱용: 다양한 색상 그라데이션 설정
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

// 데스크톱용 다양한 그라데이션 (원래 디자인)
const desktopGradients = [
  { start: '#667eea', end: '#764ba2', name: '보라-핑크' },      // 카드 1
  { start: '#4facfe', end: '#00f2fe', name: '파랑-하늘' },       // 카드 2
  { start: '#43e97b', end: '#38f9d7', name: '초록-민트' },      // 카드 3
  { start: '#fa709a', end: '#fee140', name: '핑크-노랑' },      // 카드 4
  { start: '#30cfd0', end: '#330867', name: '청록-남색' }       // 카드 5
];

async function resetPromoCards() {
  console.log('🔄 프로모카드 분리 설정 시작...\n');

  // 모든 카드 조회
  const { data: cards, error: fetchError } = await supabase
    .from('promo_cards')
    .select('*')
    .order('order_index', { ascending: true });

  if (fetchError) {
    console.error('❌ 카드 조회 실패:', fetchError);
    return;
  }

  if (!cards || cards.length === 0) {
    console.log('❌ 프로모카드가 없습니다.');
    return;
  }

  console.log(`📊 총 ${cards.length}개 카드 발견\n`);

  // 각 카드에 데스크톱용 그라데이션 설정
  for (let i = 0; i < Math.min(cards.length, desktopGradients.length); i++) {
    const card = cards[i];
    const gradient = desktopGradients[i];

    const { error } = await supabase
      .from('promo_cards')
      .update({
        is_active: true,
        background_color_mode: 'gradient',
        // 모바일용: 시안 그라데이션 (#4facfe, #00f2fe) 유지
        // 데스크톱용: PromoCardStack 컴포넌트에서 오버라이드
        background_gradient_start: '#4facfe',  // 모바일용
        background_gradient_end: '#00f2fe',    // 모바일용
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
      console.log(`✅ 카드 ${i + 1}: ${card.headline.substring(0, 30)}...`);
      console.log(`   - 모바일: 시안 그라데이션 (#4facfe → #00f2fe)`);
      console.log(`   - 데스크톱: ${gradient.name} (${gradient.start} → ${gradient.end}) [컴포넌트 오버라이드]\n`);
    }
  }

  console.log('🎉 설정 완료!');
  console.log('\n📝 요약:');
  console.log('  - 모바일 (IntegratedHeaderPromo): 시안 그라데이션 사용');
  console.log('  - 데스크톱 (PromoCardStack): 보라-핑크 그라데이션으로 오버라이드');
  console.log('  - 두 화면이 같은 DB 데이터를 공유하되, 각자 다른 스타일 적용\n');
}

resetPromoCards().catch(console.error);

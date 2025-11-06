/**
 * 프로모카드 DB 상태 확인 스크립트
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// .env 파일 로드
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPromoCards() {
  console.log('🔍 프로모카드 상태 확인 중...\n');

  // 모든 프로모카드 조회
  const { data: cards, error } = await supabase
    .from('promo_cards')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('❌ 조회 실패:', error);
    return;
  }

  console.log(`📊 총 프로모카드 개수: ${cards?.length || 0}\n`);

  if (!cards || cards.length === 0) {
    console.log('⚠️  등록된 프로모카드가 없습니다.\n');
    console.log('💡 해결방법:');
    console.log('   1. 관리자 페이지에서 프로모카드 등록');
    console.log('   2. isActive = true로 설정');
    console.log('   3. backgroundGradientStart, backgroundGradientEnd 설정\n');
    return;
  }

  // 활성화된 카드
  const activeCards = cards.filter(c => c.isActive);
  console.log(`✅ 활성화된 카드: ${activeCards.length}개\n`);

  // 각 카드 정보 출력
  cards.forEach((card, index) => {
    console.log(`--- 카드 ${index + 1} ---`);
    console.log(`ID: ${card.id}`);
    console.log(`헤드라인: ${card.headline}`);
    console.log(`활성화: ${card.isActive ? '✅' : '❌'}`);
    console.log(`배경 모드: ${card.backgroundColorMode}`);
    if (card.backgroundColorMode === 'gradient') {
      console.log(`그라데이션 시작: ${card.backgroundGradientStart}`);
      console.log(`그라데이션 끝: ${card.backgroundGradientEnd}`);
    } else {
      console.log(`배경색: ${card.backgroundColor}`);
    }
    console.log(`폰트 색: ${card.fontColor}`);
    console.log(`이미지 URL: ${card.imageUrl || '없음'}`);
    console.log(`자동재생: ${card.autoPlay ? '✅' : '❌'}`);
    console.log('');
  });

  if (activeCards.length === 0) {
    console.log('⚠️  활성화된 프로모카드가 없습니다.');
    console.log('💡 최소 1개의 카드를 활성화해야 모바일 헤더에 표시됩니다.\n');
  }
}

checkPromoCards().catch(console.error);

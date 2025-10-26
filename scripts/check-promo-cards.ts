import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경 변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPromoCards() {
  console.log('🔍 프로모 카드 상태 확인 중...\n');

  // 1. 활성 컬렉션 조회
  const { data: collections, error: collError } = await supabase
    .from('promo_card_collections')
    .select('*')
    .eq('is_active', true);

  if (collError) {
    console.error('❌ 컬렉션 조회 실패:', collError);
    return;
  }

  console.log('📦 활성 컬렉션:', collections?.length || 0);
  if (collections && collections.length > 0) {
    console.log('   컬렉션 ID:', collections[0].id);
    console.log('   이름:', collections[0].name);
    console.log('');

    // 2. 해당 컬렉션의 카드 조회
    const { data: cards, error: cardError } = await supabase
      .from('promo_cards')
      .select('*')
      .eq('collection_id', collections[0].id)
      .order('order_index', { ascending: true });

    if (cardError) {
      console.error('❌ 카드 조회 실패:', cardError);
      return;
    }

    console.log('🎴 프로모 카드 개수:', cards?.length || 0);
    console.log('');

    if (cards && cards.length > 0) {
      cards.forEach((card, idx) => {
        console.log(`[${idx + 1}] ${card.headline}`);
        console.log(`   - ID: ${card.id}`);
        console.log(`   - 활성화: ${card.is_active ? '✅' : '❌'}`);
        console.log(`   - 순서: ${card.order_index}`);
        console.log(`   - 삽입 위치: ${card.insert_position}`);
        console.log('');
      });

      // 활성 카드만 카운트
      const activeCards = cards.filter(c => c.is_active);
      console.log('✅ 활성 카드:', activeCards.length);
      console.log('');

      // 진단
      if (activeCards.length === 0) {
        console.log('⚠️  문제: 모든 카드가 비활성화 상태입니다!');
        console.log('   해결: 관리자 페이지에서 카드를 활성화해주세요.');
      } else if (activeCards.length === 1) {
        console.log('⚠️  문제: 활성 카드가 1개뿐입니다!');
        console.log('   현상: 스택 효과가 보이지 않습니다.');
        console.log('   해결: 최소 2-3개 카드가 필요합니다.');
      } else {
        console.log('✅ 정상: 카드가 충분합니다!');
        console.log(`   ${activeCards.length}개 카드로 스택 효과가 보여야 합니다.`);
      }
    } else {
      console.log('⚠️  문제: 카드가 하나도 없습니다!');
      console.log('   해결: 관리자 페이지에서 프로모 카드를 생성해주세요.');
    }
  } else {
    console.log('⚠️  문제: 활성 컬렉션이 없습니다!');
    console.log('   해결: 관리자 페이지에서 프로모 카드 컬렉션을 생성해주세요.');
  }
}

checkPromoCards()
  .then(() => {
    console.log('\n✅ 진단 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });

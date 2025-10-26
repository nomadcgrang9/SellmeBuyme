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

async function createDummyCards() {
  console.log('🎴 더미 프로모 카드 생성 중...\n');

  // 1. 활성 컬렉션 조회
  const { data: collections, error: collError } = await supabase
    .from('promo_card_collections')
    .select('*')
    .eq('is_active', true)
    .limit(1);

  if (collError || !collections || collections.length === 0) {
    console.error('❌ 활성 컬렉션을 찾을 수 없습니다.');
    return;
  }

  const collectionId = collections[0].id;
  console.log('✅ 컬렉션 ID:', collectionId);
  console.log('');

  // 2. 더미 카드 데이터
  const dummyCards = [
    {
      collection_id: collectionId,
      order_index: 2,
      insert_position: 3,
      is_active: true,
      headline: 'AI 매칭으로\n딱 맞는 선생님 찾기',
      image_url: '/picture/section%20right%20ad2.png',
      background_color: '#E3F2FD',
      background_color_mode: 'single',
      background_gradient_start: null,
      background_gradient_end: null,
      font_color: '#1976D2',
      font_size: 24,
      badge_color: '#2196F3',
      badge_color_mode: 'single',
      badge_gradient_start: null,
      badge_gradient_end: null,
      image_scale: 1.0,
      last_draft_at: null,
      last_applied_at: new Date().toISOString(),
      updated_by: null
    },
    {
      collection_id: collectionId,
      order_index: 3,
      insert_position: 3,
      is_active: true,
      headline: '무료 체험\n지금 시작하세요',
      image_url: '/picture/section%20right%20ad2.png',
      background_color: '#FFF3E0',
      background_color_mode: 'single',
      background_gradient_start: null,
      background_gradient_end: null,
      font_color: '#E65100',
      font_size: 24,
      badge_color: '#FF9800',
      badge_color_mode: 'single',
      badge_gradient_start: null,
      badge_gradient_end: null,
      image_scale: 1.0,
      last_draft_at: null,
      last_applied_at: new Date().toISOString(),
      updated_by: null
    }
  ];

  // 3. 카드 삽입
  console.log('📝 더미 카드 삽입 중...');

  for (let i = 0; i < dummyCards.length; i++) {
    const card = dummyCards[i];
    const { data, error } = await supabase
      .from('promo_cards')
      .insert(card)
      .select();

    if (error) {
      console.error(`❌ 카드 ${i + 1} 생성 실패:`, error);
    } else {
      console.log(`✅ 카드 ${i + 1} 생성 완료: "${card.headline.replace('\n', ' ')}"`);
    }
  }

  console.log('');

  // 4. 생성 확인
  const { data: allCards, error: checkError } = await supabase
    .from('promo_cards')
    .select('*')
    .eq('collection_id', collectionId)
    .order('order_index', { ascending: true });

  if (checkError) {
    console.error('❌ 확인 실패:', checkError);
    return;
  }

  console.log('🎉 최종 카드 목록:');
  console.log('━'.repeat(50));
  allCards?.forEach((card, idx) => {
    console.log(`[${idx + 1}] ${card.headline.replace('\n', ' ')}`);
    console.log(`    순서: ${card.order_index} | 활성: ${card.is_active ? '✅' : '❌'}`);
  });
  console.log('━'.repeat(50));
  console.log('');

  const activeCount = allCards?.filter(c => c.is_active).length || 0;
  console.log(`✅ 총 ${allCards?.length || 0}개 카드 (활성: ${activeCount}개)`);

  if (activeCount >= 3) {
    console.log('🎊 완벽합니다! 이제 스택 효과가 제대로 보일 거예요!');
  } else if (activeCount >= 2) {
    console.log('👍 좋습니다! 2개 이상이면 스택 효과가 보입니다.');
  } else {
    console.log('⚠️  아직 카드가 부족합니다. 더 추가해주세요.');
  }
}

createDummyCards()
  .then(() => {
    console.log('\n✅ 더미 카드 생성 완료!');
    console.log('💡 npm run dev 로 확인해보세요!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });

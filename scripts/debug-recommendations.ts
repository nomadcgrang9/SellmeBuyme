import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://qpwnsvsiduvvqdijyxio.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwd25zdnNpZHV2dnFkaWp5eGlvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDcwNTc3MCwiZXhwIjoyMDc2MjgxNzcwfQ.HUWniCdTVYcMO3nXrV4hVNh6f6jCPEVPGA-5_2BRYOM';

const supabase = createClient(supabaseUrl, supabaseKey);

const USER_ID = '85823de2-b69b-4829-8e1b-c3764c7d633c';

async function debugRecommendations() {
  console.log('🔍 추천 카드 상세 조회 중...\n');

  // 캐시에서 추천 카드 ID 가져오기
  const { data: cache, error: cacheError } = await supabase
    .from('recommendations_cache')
    .select('cards')
    .eq('user_id', USER_ID)
    .single();

  if (cacheError || !cache) {
    console.error('❌ 캐시 조회 실패:', cacheError);
    return;
  }

  const cards = cache.cards as any[];
  console.log(`✅ 추천 카드 ${cards.length}개 발견\n`);
  console.log('='.repeat(100));

  // 각 카드의 상세 정보 출력
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    console.log(`\n[카드 ${i + 1}/${cards.length}]`);
    console.log(`ID: ${card.id}`);
    console.log(`타입: ${card.type}`);

    if (card.type === 'job') {
      console.log(`📋 제목: ${card.title || '미설정'}`);
      console.log(`🏫 조직: ${card.organization || '미설정'}`);
      console.log(`🎓 학교급(school_level): ${card.school_level || '미설정'}`);
      console.log(`📚 과목(subject): ${card.subject || '미설정'}`);
      console.log(`📍 위치: ${card.location || '미설정'}`);
      console.log(`💰 급여: ${card.compensation || '미설정'}`);
      console.log(`⏰ 마감: ${card.deadline || '미설정'}`);
      console.log(`🚨 긴급: ${card.isUrgent ? '예' : '아니오'}`);
      console.log(`🏷️ 태그: ${JSON.stringify(card.tags || [])}`);
    } else if (card.type === 'talent') {
      console.log(`👤 이름: ${card.name || '미설정'}`);
      console.log(`💼 전문성: ${card.specialty || '미설정'}`);
      console.log(`📍 위치: ${card.location || '미설정'}`);
      console.log(`🏷️ 태그: ${JSON.stringify(card.tags || [])}`);
    }

    console.log('-'.repeat(100));
  }

  // 통계 출력
  const jobCards = cards.filter(c => c.type === 'job');
  const talentCards = cards.filter(c => c.type === 'talent');

  console.log('\n📊 추천 카드 통계:');
  console.log(`  - 총 카드: ${cards.length}개`);
  console.log(`  - 공고 카드: ${jobCards.length}개`);
  console.log(`  - 인력 카드: ${talentCards.length}개`);

  if (jobCards.length > 0) {
    const schoolLevels = jobCards.map((c: any) => c.school_level || '미설정');
    const levelCounts = schoolLevels.reduce((acc: any, level: string) => {
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    console.log('\n🎓 학교급 분포:');
    Object.entries(levelCounts).forEach(([level, count]) => {
      console.log(`  - ${level}: ${count}개`);
    });
  }

  // 프로필 정보 요약
  console.log('\n👤 사용자 프로필:');
  console.log('  - 교사 레벨: 초등');
  console.log('  - 담당 과목: ["초등 담임"]');
  console.log('  - 관심 지역: ["성남", "남양주", "구리", "의정부"]');

  console.log('\n❗ 문제 분석:');
  const nonElementary = jobCards.filter((c: any) => c.school_level && c.school_level !== '초등');
  if (nonElementary.length > 0) {
    console.log(`  ⚠️ 초등교사인데 비초등 공고가 ${nonElementary.length}개 추천됨!`);
    console.log(`  ⚠️ 학교급: ${nonElementary.map((c: any) => c.school_level).join(', ')}`);
  } else {
    console.log('  ✅ 모든 공고가 초등 공고입니다.');
  }
}

debugRecommendations().catch(console.error);

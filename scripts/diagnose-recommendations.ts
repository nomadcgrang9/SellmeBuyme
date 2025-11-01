import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseRecommendations() {
  console.log('\n📊 추천카드 현황 진단 시작...\n');

  try {
    // 1. recommendations_cache 테이블 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  RECOMMENDATIONS_CACHE 테이블 분석');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const { data: caches, error: cacheError } = await supabase
      .from('recommendations_cache')
      .select('user_id, cards, ai_comment, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    if (cacheError) {
      console.error('❌ 캐시 조회 실패:', cacheError);
    } else {
      console.log(`✅ 총 ${caches?.length || 0}개의 캐시 발견\n`);

      caches?.forEach((cache, idx) => {
        const cards = cache.cards as any[];
        const updatedAt = new Date(cache.updated_at);
        const now = new Date();
        const hoursOld = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60));
        const isExpired = hoursOld >= 24;

        console.log(`캐시 #${idx + 1}:`);
        console.log(`  User ID: ${cache.user_id}`);
        console.log(`  수정일: ${updatedAt.toLocaleString('ko-KR')} (${hoursOld}시간 전)`);
        console.log(`  상태: ${isExpired ? '❌ 만료 (24시간 초과)' : '✅ 유효'}`);
        console.log(`  카드 개수: ${cards?.length || 0}개`);

        if (cards && cards.length > 0) {
          console.log(`  카드 타입 분포:`);
          const jobCards = cards.filter(c => c.type === 'job');
          const talentCards = cards.filter(c => c.type === 'talent');
          console.log(`    - 공고: ${jobCards.length}개`);
          console.log(`    - 인력: ${talentCards.length}개`);

          // 마감 지난 공고 체크
          const now = new Date();
          const expiredJobs = jobCards.filter(job => {
            if (job.deadline) {
              try {
                const deadline = new Date(job.deadline);
                return deadline.getTime() < now.getTime();
              } catch {
                return false;
              }
            }
            return false;
          });

          if (expiredJobs.length > 0) {
            console.log(`    ⚠️  마감 지난 공고: ${expiredJobs.length}개`);
            expiredJobs.forEach(job => {
              console.log(`      - ${job.organization || job.title} (마감: ${job.deadline})`);
            });
          }
        }
        console.log('');
      });
    }

    // 2. job_postings 테이블 - 마감 임박 및 신규 공고 확인
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  JOB_POSTINGS 신규/마감 공고 분석');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 신규 공고 (최근 24시간)
    const { data: fresh24h, error: fresh24hError } = await supabase
      .from('job_postings')
      .select('id, organization, title, deadline, created_at')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!fresh24hError) {
      console.log(`📅 24시간 내 신규 공고: ${fresh24h?.length || 0}개`);
      fresh24h?.slice(0, 5).forEach((job, idx) => {
        console.log(`  ${idx + 1}. ${job.organization} - ${job.title}`);
        console.log(`     생성: ${new Date(job.created_at).toLocaleString('ko-KR')}`);
      });
      console.log('');
    }

    // 신규 공고 (최근 3일)
    const { data: fresh3days, error: fresh3daysError } = await supabase
      .from('job_postings')
      .select('id, organization, title, deadline, created_at')
      .gte('created_at', threeDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!fresh3daysError) {
      console.log(`📅 3일 내 신규 공고: ${fresh3days?.length || 0}개`);
    }

    // 신규 공고 (최근 7일)
    const { data: fresh7days, error: fresh7daysError } = await supabase
      .from('job_postings')
      .select('id, organization, title, deadline, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!fresh7daysError) {
      console.log(`📅 7일 내 신규 공고: ${fresh7days?.length || 0}개\n`);
    }

    // 마감 임박 공고 (3일 내)
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const { data: deadlineSoon, error: deadlineSoonError } = await supabase
      .from('job_postings')
      .select('id, organization, title, deadline, created_at')
      .gte('deadline', now.toISOString())
      .lte('deadline', threeDaysLater.toISOString())
      .order('deadline', { ascending: true });

    if (!deadlineSoonError) {
      console.log(`⏰ 3일 내 마감 공고: ${deadlineSoon?.length || 0}개`);
      deadlineSoon?.slice(0, 5).forEach((job, idx) => {
        const deadline = new Date(job.deadline);
        const hoursLeft = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
        console.log(`  ${idx + 1}. ${job.organization} - ${job.title}`);
        console.log(`     마감: ${deadline.toLocaleString('ko-KR')} (${hoursLeft}시간 남음)`);
      });
      console.log('');
    }

    // 마감 지난 공고
    const { data: expired, error: expiredError } = await supabase
      .from('job_postings')
      .select('id, organization, title, deadline, created_at')
      .lt('deadline', now.toISOString())
      .order('deadline', { ascending: false })
      .limit(10);

    if (!expiredError) {
      console.log(`❌ 마감 지난 공고: ${expired?.length || 0}개 (최근 10개만 표시)`);
      expired?.forEach((job, idx) => {
        const deadline = new Date(job.deadline);
        const daysAgo = Math.floor((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`  ${idx + 1}. ${job.organization} - ${job.title}`);
        console.log(`     마감: ${deadline.toLocaleString('ko-KR')} (${daysAgo}일 전)`);
      });
      console.log('');
    }

    // 3. 최종 진단
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  최종 진단 및 원인 분석');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔍 사용자 예측 검증:');
    console.log('   "추천카드들이 최초 가입 시 3~4장이었는데 날짜가 지나면서');
    console.log('   공고 기한이 넘어간 카드들이 보이지 않게 되어 카드가 줄어든 것"');
    console.log('');

    // 캐시 내 만료된 공고 비율 계산
    if (caches && caches.length > 0) {
      const firstCache = caches[0];
      const cards = firstCache.cards as any[];
      const jobCards = cards?.filter(c => c.type === 'job') || [];
      const expiredInCache = jobCards.filter(job => {
        if (job.deadline) {
          try {
            const deadline = new Date(job.deadline);
            return deadline.getTime() < now.getTime();
          } catch {
            return false;
          }
        }
        return false;
      });

      console.log('📊 현재 캐시 상태:');
      console.log(`   - 전체 카드: ${cards?.length || 0}개`);
      console.log(`   - 공고 카드: ${jobCards.length}개`);
      console.log(`   - 마감 지난 공고: ${expiredInCache.length}개 (${Math.round((expiredInCache.length / jobCards.length) * 100)}%)`);
      console.log(`   - 유효한 공고: ${jobCards.length - expiredInCache.length}개\n`);

      if (expiredInCache.length > 0) {
        console.log('✅ 사용자 예측이 정확합니다!');
        console.log('   캐시에 마감 지난 공고가 포함되어 있어 카드가 줄어들었을 가능성이 높습니다.\n');
      }
    }

    console.log('🚨 핵심 문제점:');
    console.log('');
    console.log('1. ❌ 캐시 만료 로직 문제:');
    console.log('   - 현재: 24시간 단위로 전체 캐시 갱신');
    console.log('   - 문제: 24시간 이내라도 마감 지난 공고가 계속 노출됨');
    console.log('   - 결과: 시간이 지날수록 유효한 카드 개수가 줄어듦\n');

    console.log('2. ❌ 신규 공고 반영 지연:');
    console.log('   - 현재: 캐시가 유효하면 새 공고를 가져오지 않음');
    console.log(`   - 실제: 최근 24시간에 ${fresh24h?.length || 0}개 신규 공고 있음`);
    console.log('   - 결과: 신선한 공고를 놓치고 있음\n');

    console.log('3. ❌ 프론트엔드 필터링 없음:');
    console.log('   - Edge Function이 마감 지난 공고를 -100점 처리하지만');
    console.log('   - 캐시된 데이터에는 이미 포함되어 있음');
    console.log('   - 프론트엔드에서 마감일 체크하지 않아 그대로 노출\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

diagnoseRecommendations().then(() => {
  console.log('✅ 진단 완료!\n');
  process.exit(0);
}).catch(err => {
  console.error('❌ 스크립트 실행 실패:', err);
  process.exit(1);
});

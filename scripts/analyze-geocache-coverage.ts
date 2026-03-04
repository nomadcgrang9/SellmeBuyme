/**
 * geocache 커버율 분석 스크립트 (수정판)
 * 현재 job_postings의 organization과 geocache 매칭률 계산
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCoverage() {
  console.log('=== Geocache 커버율 분석 (수정판) ===\n');

  // 1. 전체 공고 수
  const { count: totalJobs } = await supabase
    .from('job_postings')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 전체 공고 수: ${totalJobs}개\n`);

  // 2. 고유한 organization 목록 가져오기
  const { data: orgs } = await supabase
    .from('job_postings')
    .select('organization')
    .not('organization', 'is', null);

  const uniqueOrgs = [...new Set(orgs?.map(o => o.organization) || [])];
  console.log(`📊 고유 organization 수: ${uniqueOrgs.length}개\n`);

  // 3. geocache 전체 count
  const { count: geocacheCount } = await supabase
    .from('geocache')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 geocache 전체 엔트리 수: ${geocacheCount}개\n`);

  // 4. 각 organization에 대해 geocache 매칭 확인 (정확한 방식)
  const matched: string[] = [];
  const unmatched: string[] = [];

  console.log('🔍 organization별 매칭 확인 중...');

  // 배치로 처리 (50개씩)
  const BATCH_SIZE = 50;
  for (let i = 0; i < uniqueOrgs.length; i += BATCH_SIZE) {
    const batch = uniqueOrgs.slice(i, i + BATCH_SIZE);

    const { data } = await supabase
      .from('geocache')
      .select('organization')
      .in('organization', batch);

    const foundSet = new Set(data?.map(d => d.organization) || []);

    for (const org of batch) {
      if (foundSet.has(org)) {
        matched.push(org);
      } else {
        unmatched.push(org);
      }
    }

    process.stdout.write(`\r  진행: ${Math.min(i + BATCH_SIZE, uniqueOrgs.length)}/${uniqueOrgs.length}`);
  }

  console.log(`\n\n✅ 매칭된 organization: ${matched.length}개`);
  console.log(`❌ 매칭 안 된 organization: ${unmatched.length}개`);
  console.log(`📈 현재 커버율: ${((matched.length / uniqueOrgs.length) * 100).toFixed(1)}%\n`);

  // 5. 매칭 안 된 것들 분류
  const categories = {
    kindergarten: [] as string[],    // 유치원
    eduOffice: [] as string[],       // 교육청/교육지원청
    special: [] as string[],         // 특수학교
    library: [] as string[],         // 도서관
    other: [] as string[]            // 기타
  };

  for (const org of unmatched) {
    if (org.includes('유치원')) {
      categories.kindergarten.push(org);
    } else if (org.includes('교육청') || org.includes('교육지원청') || org.includes('교육원')) {
      categories.eduOffice.push(org);
    } else if (org.includes('특수') || org.includes('장애')) {
      categories.special.push(org);
    } else if (org.includes('도서관')) {
      categories.library.push(org);
    } else {
      categories.other.push(org);
    }
  }

  console.log('=== 미매칭 organization 분류 ===');
  console.log(`🏫 유치원: ${categories.kindergarten.length}개`);
  console.log(`🏛️ 교육청/지원청: ${categories.eduOffice.length}개`);
  console.log(`♿ 특수학교: ${categories.special.length}개`);
  console.log(`📚 도서관: ${categories.library.length}개`);
  console.log(`❓ 기타: ${categories.other.length}개\n`);

  // 샘플 출력
  console.log('--- 유치원 샘플 (최대 10개) ---');
  categories.kindergarten.slice(0, 10).forEach(o => console.log(`  - ${o}`));

  console.log('\n--- 교육청/지원청 전체 ---');
  categories.eduOffice.forEach(o => console.log(`  - ${o}`));

  console.log('\n--- 특수학교 전체 ---');
  categories.special.forEach(o => console.log(`  - ${o}`));

  console.log('\n--- 기타 샘플 (최대 20개) ---');
  categories.other.slice(0, 20).forEach(o => console.log(`  - ${o}`));

  // 6. 예상 커버율 계산
  console.log('\n=== 예상 커버율 계산 ===');
  const afterKindergarten = matched.length + categories.kindergarten.length;
  const afterEduOffice = afterKindergarten + categories.eduOffice.length;
  const afterSpecial = afterEduOffice + categories.special.length;
  const afterAll = afterSpecial + categories.library.length;

  console.log(`현재: ${matched.length}/${uniqueOrgs.length} = ${((matched.length / uniqueOrgs.length) * 100).toFixed(1)}%`);
  console.log(`+유치원 CSV: ${afterKindergarten}/${uniqueOrgs.length} = ${((afterKindergarten / uniqueOrgs.length) * 100).toFixed(1)}%`);
  console.log(`+교육청 (수동): ${afterEduOffice}/${uniqueOrgs.length} = ${((afterEduOffice / uniqueOrgs.length) * 100).toFixed(1)}%`);
  console.log(`+특수학교: ${afterSpecial}/${uniqueOrgs.length} = ${((afterSpecial / uniqueOrgs.length) * 100).toFixed(1)}%`);

  console.log(`\n🎯 남는 "기타" ${categories.other.length}개 세부 분석:`);

  // 기타 카테고리 세부 분석
  let schoolLike = 0;
  let center = 0;
  let others = 0;
  const schoolSamples: string[] = [];
  const otherSamples: string[] = [];

  for (const org of categories.other) {
    if (org.includes('초등학교') || org.includes('중학교') || org.includes('고등학교') ||
        org.endsWith('초') || org.endsWith('중') || org.endsWith('고')) {
      schoolLike++;
      if (schoolSamples.length < 10) schoolSamples.push(org);
    } else if (org.includes('센터') || org.includes('학원')) {
      center++;
    } else {
      others++;
      if (otherSamples.length < 10) otherSamples.push(org);
    }
  }

  console.log(`  - 학교명인데 매칭 안 됨 (공백/띄어쓰기 차이?): ${schoolLike}개`);
  if (schoolSamples.length > 0) {
    console.log(`    샘플: ${schoolSamples.join(', ')}`);
  }
  console.log(`  - 센터/학원: ${center}개`);
  console.log(`  - 순수 기타: ${others}개`);
  if (otherSamples.length > 0) {
    console.log(`    샘플: ${otherSamples.join(', ')}`);
  }

  // 최종 결론
  const kakaoNeeded = categories.other.length;
  console.log(`\n=== 최종 결론 ===`);
  console.log(`📊 현재 geocache로 커버 가능: ${matched.length}개 (${((matched.length / uniqueOrgs.length) * 100).toFixed(1)}%)`);
  console.log(`📊 유치원 CSV 추가 시: +${categories.kindergarten.length}개 → ${((afterKindergarten / uniqueOrgs.length) * 100).toFixed(1)}%`);
  console.log(`📊 교육청/특수학교 추가 시: +${categories.eduOffice.length + categories.special.length}개 → ${((afterSpecial / uniqueOrgs.length) * 100).toFixed(1)}%`);
  console.log(`📊 Kakao API 필요: ${kakaoNeeded}개 (${((kakaoNeeded / uniqueOrgs.length) * 100).toFixed(1)}%)`);
}

analyzeCoverage().catch(console.error);

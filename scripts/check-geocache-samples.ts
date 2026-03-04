import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  // 1. 특수학교 관련 organization 확인
  console.log('=== 1. 특수학교 관련 organization ===');
  const { data: specialOrgs } = await supabase
    .from('job_postings')
    .select('organization')
    .or('organization.ilike.%특수학교%,organization.ilike.%혜은%,organization.ilike.%에바다%,organization.ilike.%성은학교%,organization.ilike.%나래학교%,organization.ilike.%희망학교%,organization.ilike.%경은학교%,organization.ilike.%인덕학교%,organization.ilike.%송민학교%,organization.ilike.%드림학교%');

  const uniqueSpecial = [...new Set(specialOrgs?.map(o => o.organization) || [])];
  console.log(`특수학교 관련 organization: ${uniqueSpecial.length}개`);
  uniqueSpecial.forEach(o => console.log(`  - ${o}`));

  // 2. 특수학교들의 geocache 매칭 확인
  console.log('\n=== 2. 특수학교 geocache 매칭 ===');
  for (const org of uniqueSpecial) {
    const { data } = await supabase
      .from('geocache')
      .select('latitude, longitude, source')
      .eq('organization', org)
      .single();

    if (data) {
      console.log(`  ✅ ${org} → ${data.latitude}, ${data.longitude} (${data.source})`);
    } else {
      console.log(`  ❌ ${org} → 미매칭`);
    }
  }

  // 3. 교육지원청 관련 organization
  console.log('\n=== 3. 교육청/지원청 관련 organization ===');
  const { data: eduOrgs } = await supabase
    .from('job_postings')
    .select('organization')
    .or('organization.ilike.%교육지원청%,organization.ilike.%교육청%');

  const uniqueEdu = [...new Set(eduOrgs?.map(o => o.organization) || [])];
  console.log(`교육청/지원청 organization: ${uniqueEdu.length}개`);

  for (const org of uniqueEdu) {
    const { data } = await supabase
      .from('geocache')
      .select('latitude, longitude, source')
      .eq('organization', org)
      .single();

    if (data) {
      console.log(`  ✅ ${org} → ${String(data.latitude).substring(0,7)}, ${String(data.longitude).substring(0,8)} (${data.source})`);
    } else {
      console.log(`  ❌ ${org} → 미매칭`);
    }
  }

  // 4. 유치원 샘플 (병설 vs 단설)
  console.log('\n=== 4. 유치원 샘플 (source 확인) ===');
  const { data: kinderOrgs } = await supabase
    .from('job_postings')
    .select('organization')
    .ilike('organization', '%유치원%')
    .limit(30);

  const uniqueKinder = [...new Set(kinderOrgs?.map(o => o.organization) || [])].slice(0, 15);
  for (const org of uniqueKinder) {
    const { data } = await supabase
      .from('geocache')
      .select('latitude, longitude, source')
      .eq('organization', org)
      .single();

    const shortOrg = org.length > 25 ? org.substring(0, 22) + '...' : org.padEnd(25);
    if (data) {
      console.log(`  ✅ ${shortOrg} → ${data.source}`);
    } else {
      console.log(`  ❌ ${shortOrg} → 미매칭`);
    }
  }

  // 5. 전체 source별 통계
  console.log('\n=== 5. geocache source별 통계 ===');
  const { data: sources } = await supabase
    .from('geocache')
    .select('source');

  const sourceCounts: Record<string, number> = {};
  sources?.forEach(s => {
    sourceCounts[s.source || 'null'] = (sourceCounts[s.source || 'null'] || 0) + 1;
  });

  Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([source, count]) => {
      console.log(`  ${source}: ${count}개`);
    });
}

check().catch(console.error);

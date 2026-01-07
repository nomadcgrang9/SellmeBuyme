/**
 * 잘못된 지역 정보로 저장된 채용공고 데이터 삭제
 * 대전, 경남, 경북 크롤러 데이터를 삭제하여 재크롤링 준비
 *
 * 사용법:
 * VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npx tsx scripts/db/cleanup-wrong-locations.ts
 */
import { readFileSync } from 'fs';

// .env 파일 직접 파싱
let supabaseUrl = process.env.VITE_SUPABASE_URL;
let supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        supabaseUrl = trimmed.substring('VITE_SUPABASE_URL='.length).replace(/["']/g, '');
      }
      if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        supabaseKey = trimmed.substring('VITE_SUPABASE_ANON_KEY='.length).replace(/["']/g, '');
      }
    }
  } catch (e) {
    // .env 파일 없음
  }
}

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase 환경변수가 설정되지 않았습니다.');
  console.log('\n사용법:');
  console.log('VITE_SUPABASE_URL=your_url VITE_SUPABASE_ANON_KEY=your_key npx tsx scripts/db/cleanup-wrong-locations.ts');
  console.log('\n또는 .env 파일에 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해주세요.');
  process.exit(1);
}

async function main() {
  console.log('🧹 잘못된 지역 데이터 정리 시작\n');
  console.log('='.repeat(60));

  // 삭제할 organization 목록
  const organizationsToClean = [
    '대전광역시교육청',
    '경상남도교육청',
    '경상북도교육청',
    '울산광역시교육청'
  ];

  for (const org of organizationsToClean) {
    console.log(`\n📍 ${org} 데이터 확인 중...`);

    try {
      // 먼저 해당 organization의 데이터 개수 확인
      const countResponse = await fetch(
        `${supabaseUrl}/rest/v1/job_postings?organization=eq.${encodeURIComponent(org)}&select=id`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
          }
        }
      );

      const countHeader = countResponse.headers.get('content-range');
      const count = countHeader ? parseInt(countHeader.split('/')[1]) : 0;

      console.log(`   발견된 공고: ${count}개`);

      if (count === 0) {
        console.log(`   ℹ️  삭제할 데이터 없음`);
        continue;
      }

      // 데이터 삭제
      const deleteResponse = await fetch(
        `${supabaseUrl}/rest/v1/job_postings?organization=eq.${encodeURIComponent(org)}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!deleteResponse.ok) {
        console.error(`   ❌ 삭제 실패: ${deleteResponse.statusText}`);
        continue;
      }

      console.log(`   ✅ ${count}개 공고 삭제 완료`);
    } catch (error: any) {
      console.error(`   ❌ 오류 발생: ${error.message}`);
      continue;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 정리 완료\n');
  console.log('다음 단계:');
  console.log('1. GitHub Actions에서 해당 크롤러 수동 실행');
  console.log('2. 또는 로컬에서 크롤러 실행:');
  console.log('   cd crawler');
  console.log('   node index.js --source=daejeon');
  console.log('   node index.js --source=gyeongnam');
  console.log('   node index.js --source=gyeongbuk');
  console.log('   node index.js --source=ulsan');
}

main().catch(console.error);

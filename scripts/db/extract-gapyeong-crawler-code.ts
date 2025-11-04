import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function extractCrawlerCode() {
  console.log('=== 가평 크롤러 코드 추출 ===\n');

  const { data, error } = await supabase
    .from('crawl_boards')
    .select('id, name, region, is_local_government, crawler_source_code')
    .eq('id', 'de02eada-6569-45df-9f4d-45a4fcc51879')
    .single();

  if (error) {
    console.error('❌ 조회 실패:', error);
    process.exit(1);
  }

  console.log('게시판 정보:');
  console.log(`  ID: ${data.id}`);
  console.log(`  이름: ${data.name}`);
  console.log(`  region 필드: ${data.region || 'NULL'}`);
  console.log(`  기초자치단체: ${data.is_local_government ? '예' : '아니오'}`);
  console.log(`  코드 길이: ${data.crawler_source_code?.length || 0}자\n`);

  if (data.crawler_source_code) {
    // location 관련 코드만 추출
    const lines = data.crawler_source_code.split('\n');
    console.log('=== location 관련 코드 ===\n');

    let inLocationBlock = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('location:') || line.includes('location =') || line.includes("'가평'") || line.includes('"가평"')) {
        console.log(`${i + 1}: ${line}`);
        inLocationBlock = true;
      } else if (inLocationBlock && (line.includes(',') || line.includes('}') || line.includes(';'))) {
        console.log(`${i + 1}: ${line}`);
        inLocationBlock = false;
      }
    }

    // 전체 코드를 파일로 저장
    const outputPath = 'scripts/db/gapyeong-crawler-full.mjs';
    fs.writeFileSync(outputPath, data.crawler_source_code);
    console.log(`\n✅ 전체 크롤러 코드 저장: ${outputPath}`);
  } else {
    console.log('❌ 크롤러 코드가 없습니다.');
  }
}

extractCrawlerCode();

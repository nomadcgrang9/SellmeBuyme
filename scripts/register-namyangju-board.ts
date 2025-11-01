import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n📝 구리남양주 게시판 등록\n');

  // 1. 크롤러 소스 파일 읽기
  const crawlerPath = join(process.cwd(), 'crawler', 'sources', '남양주교육지원청-구인구직.js');
  const crawlerCode = readFileSync(crawlerPath, 'utf-8');

  console.log(`✅ 크롤러 코드 로드: ${crawlerCode.length}자\n`);

  // 2. DB에 등록
  const { data, error } = await supabase
    .from('crawl_boards')
    .insert({
      name: '남양주교육지원청-구인구직',
      board_url: 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656',
      crawler_source_code: crawlerCode,
      crawl_batch_size: 10,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    console.error('❌ 등록 실패:', error.message);

    // 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('crawl_boards')
      .select('*')
      .eq('name', '남양주교육지원청-구인구직')
      .single();

    if (existing) {
      console.log('\n⚠️  이미 등록된 게시판입니다.');
      console.log(`ID: ${existing.id}`);
      console.log(`이름: ${existing.name}`);
      console.log(`크롤러 코드 길이: ${existing.crawler_source_code?.length || 0}자`);

      // 크롤러 코드 업데이트
      console.log('\n📝 크롤러 코드 업데이트 중...');
      const { error: updateError } = await supabase
        .from('crawl_boards')
        .update({ crawler_source_code: crawlerCode })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ 업데이트 실패:', updateError.message);
      } else {
        console.log('✅ 크롤러 코드 업데이트 완료!');
      }
    }

    return;
  }

  console.log('✅ 등록 완료!\n');
  console.log(`ID: ${data.id}`);
  console.log(`이름: ${data.name}`);
  console.log(`URL: ${data.board_url}`);
  console.log(`크롤러 코드: ${data.crawler_source_code?.length}자`);

  console.log('\n📋 다음 단계:');
  console.log(`1. GitHub Actions에서 크롤링 실행`);
  console.log(`2. 또는 로컬에서 테스트: cd crawler && node index.js --board-id=${data.id}`);
}

main().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('\n📝 부산광역시교육청 게시판 등록\n');

  // 부산교육청은 nttPattern 크롤러를 사용하므로 별도 소스 파일이 필요 없음
  // sources.json의 설정을 사용하여 등록

  const boardData = {
    name: '부산광역시교육청-학교인력채용',
    board_url: 'https://www.pen.go.kr/main/na/ntt/selectNttList.do?mi=30367&bbsId=2364',
    crawler_source_code: null, // nttPattern 사용하므로 null
    crawl_batch_size: 10,
    is_active: true,
    region: '부산광역시',
    is_local_government: false,
    // crawler/config/sources.json의 busan 설정 참조
    metadata: {
      parserType: 'ntt',
      detailUrlTemplate: 'https://www.pen.go.kr/main/na/ntt/selectNttInfo.do?mi=30367&bbsId=2364&nttSn=',
      selectors: {
        rows: 'table tbody tr',
        link: 'a.nttInfoBtn, a[data-id]',
        date: 'td:nth-child(5)'
      }
    }
  };

  console.log(`이름: ${boardData.name}`);
  console.log(`URL: ${boardData.board_url}`);
  console.log(`지역: ${boardData.region}`);
  console.log(`파서 타입: nttPattern (범용 크롤러 사용)`);
  console.log();

  // 2. DB에 등록
  const { data, error } = await supabase
    .from('crawl_boards')
    .insert(boardData)
    .select()
    .single();

  if (error) {
    console.error('❌ 등록 실패:', error.message);

    // 이미 존재하는지 확인
    const { data: existing } = await supabase
      .from('crawl_boards')
      .select('*')
      .eq('name', boardData.name)
      .single();

    if (existing) {
      console.log('\n⚠️  이미 등록된 게시판입니다.');
      console.log(`ID: ${existing.id}`);
      console.log(`이름: ${existing.name}`);
      console.log(`URL: ${existing.board_url}`);
      console.log(`활성화: ${existing.is_active}`);

      // 설정 업데이트
      console.log('\n📝 설정 업데이트 중...');
      const { error: updateError } = await supabase
        .from('crawl_boards')
        .update({
          is_active: boardData.is_active,
          crawl_batch_size: boardData.crawl_batch_size,
          region: boardData.region,
          metadata: boardData.metadata
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error('❌ 업데이트 실패:', updateError.message);
      } else {
        console.log('✅ 설정 업데이트 완료!');
      }
    }

    return;
  }

  console.log('✅ 등록 완료!\n');
  console.log(`ID: ${data.id}`);
  console.log(`이름: ${data.name}`);
  console.log(`URL: ${data.board_url}`);
  console.log(`지역: ${data.region}`);
  console.log(`배치 크기: ${data.crawl_batch_size}`);

  console.log('\n📋 다음 단계:');
  console.log(`1. 로컬 테스트: cd crawler && node test-busan.js`);
  console.log(`2. 실제 크롤링: cd crawler && node index.js --source=busan`);
  console.log(`3. GitHub Actions에서 자동 실행 설정`);
}

main().catch(console.error);

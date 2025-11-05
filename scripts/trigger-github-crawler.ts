import * as dotenv from 'dotenv';

dotenv.config();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GHPAT2;
const REPO_OWNER = 'nomadcgrang9';
const REPO_NAME = 'SellmeBuyme';

async function triggerCrawler(boardId: string, boardName: string) {
  if (!GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN이 .env에 설정되지 않았습니다.');
    console.log('GitHub Personal Access Token을 발급받아 .env에 추가하세요:');
    console.log('https://github.com/settings/tokens');
    return;
  }

  const logId = `manual-${Date.now()}`;

  console.log(`🚀 GitHub Actions 크롤러 트리거: ${boardName}`);
  console.log(`Board ID: ${boardId}`);
  console.log(`Log ID: ${logId}\n`);

  try {
    const response = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/run-crawler.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: {
            board_id: boardId,
            log_id: logId,
            mode: 'run',
          },
        }),
      }
    );

    if (response.status === 204) {
      console.log('✅ 워크플로우 트리거 성공!');
      console.log(`\n📊 실행 상태 확인:`);
      console.log(`https://github.com/${REPO_OWNER}/${REPO_NAME}/actions`);
    } else {
      const text = await response.text();
      console.error(`❌ 실패 (${response.status}):`, text);
    }
  } catch (error) {
    console.error('❌ 요청 실패:', error);
  }
}

// 성남, 의정부, 구리남양주 트리거
async function main() {
  const boards = [
    { id: '5a94f47d-5feb-4821-99af-f8805cc3d619', name: '성남교육지원청' },
    { id: '55d09cac-71aa-48d5-a8b8-bbd9181970bb', name: '의정부교육지원청' },
    { id: '5d7799d9-5d8d-47a2-b0df-6dd4f39449bd', name: '구리남양주 기간제교사' },
  ];

  for (const board of boards) {
    await triggerCrawler(board.id, board.name);
    console.log('\n---\n');
    // Rate limiting 방지
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

main();

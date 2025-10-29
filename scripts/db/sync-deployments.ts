// sync-deployments.ts - Git 커밋 내역을 github_deployments 테이블에 동기화
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// .env 파일 로드
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');

    envContent.split('\n').forEach((line) => {
      const match = line.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        process.env[key] = value;
      }
    });
  } catch (error) {
    console.warn('⚠️  .env 파일을 찾을 수 없습니다.');
  }
}

loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('   VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface GitCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  branch: string;
}

/**
 * Git 로그에서 최근 커밋 가져오기
 */
function getRecentCommits(limit = 5): GitCommit[] {
  try {
    // Git 로그 형식: sha|message|author|date
    // Windows에서는 format 문자열을 따옴표로 감싸야 함
    const log = execSync(
      `git log -${limit} "--format=%H|%s|%an|%aI" main`,
      { encoding: 'utf-8' }
    );

    return log
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [sha, message, author, date] = line.split('|');
        return {
          sha,
          message,
          author,
          date,
          branch: 'main',
        };
      });
  } catch (error) {
    console.error('❌ Git 로그 읽기 실패:', error);
    return [];
  }
}

/**
 * 배포 기록 동기화
 */
async function syncDeployments() {
  console.log('🔄 배포 기록 동기화 시작...\n');

  // 1. 최근 5개 커밋 가져오기
  const commits = getRecentCommits(5);
  if (commits.length === 0) {
    console.error('❌ 커밋 내역을 찾을 수 없습니다.');
    return;
  }

  console.log(`✅ ${commits.length}개 커밋 발견\n`);

  // 2. 기존 배포 기록 확인
  const { data: existingDeployments, error: fetchError } = await supabase
    .from('github_deployments')
    .select('commit_sha');

  if (fetchError) {
    console.error('❌ 기존 배포 기록 조회 실패:', fetchError.message);
    return;
  }

  const existingShas = new Set(
    existingDeployments?.map((d) => d.commit_sha) || []
  );
  console.log(`📋 기존 배포 기록: ${existingShas.size}개\n`);

  // 3. 새 배포 기록 추가
  const newDeployments = commits
    .filter((commit) => !existingShas.has(commit.sha))
    .map((commit) => ({
      commit_sha: commit.sha,
      commit_message: commit.message,
      branch: commit.branch,
      author: commit.author,
      status: 'success', // 기본적으로 성공으로 설정
      deployed_at: commit.date,
      created_at: new Date().toISOString(),
    }));

  if (newDeployments.length === 0) {
    console.log('✅ 모든 커밋이 이미 동기화되어 있습니다.');
    return;
  }

  console.log(`🆕 새로운 배포 기록 ${newDeployments.length}개 추가 중...\n`);

  // 4. 배포 기록 삽입
  const { error: insertError } = await supabase
    .from('github_deployments')
    .insert(newDeployments);

  if (insertError) {
    console.error('❌ 배포 기록 추가 실패:', insertError.message);
    return;
  }

  console.log('✅ 배포 기록 동기화 완료!\n');

  // 5. 결과 출력
  newDeployments.forEach((deployment, index) => {
    console.log(`${index + 1}. ${deployment.commit_message}`);
    console.log(`   SHA: ${deployment.commit_sha.substring(0, 7)}`);
    console.log(`   Author: ${deployment.author}`);
    console.log(`   Date: ${new Date(deployment.deployed_at).toLocaleString('ko-KR')}`);
    console.log('');
  });
}

// 실행
syncDeployments()
  .then(() => {
    console.log('✅ 동기화 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 동기화 실패:', error);
    process.exit(1);
  });

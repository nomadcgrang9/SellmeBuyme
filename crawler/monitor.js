/**
 * 크롤러 실시간 모니터링 대시보드
 * - blessed TUI 기반
 * - .progress.json 파일을 실시간으로 읽어서 표시
 */

import blessed from 'blessed';
import { readProgress } from './lib/progressTracker.js';
import { parseBackgroundLog } from './lib/logParser.js';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Parse command-line arguments
const args = process.argv.slice(2);
const logFileArg = args.find(arg => arg.startsWith('--log-file='));
const customLogFile = logFileArg ? logFileArg.split('=')[1] : null;

// 이모지 아이콘
const ICONS = {
  completed: '✅',
  failed: '❌',
  running: '🔄',
  pending: '⏳',
  stats: '📊',
  chart: '📈',
  list: '📋',
  map: '🗺️',
  timer: '⏱️',
  target: '🎯',
  rocket: '🚀',
  warning: '⚠️'
};

// 화면 생성
const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  title: '셀미바이미 크롤러 모니터'
});

// 헤더
const header = blessed.box({
  top: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}🚀 셀미바이미 크롤러 모니터 - 초기화 중...{/center}',
  tags: true,
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' },
    fg: 'white',
    bold: true
  },
  label: ' 📊 모니터 대시보드 '
});

// 진행률 바
const progressBar = blessed.box({
  top: 3,
  left: 2,
  width: '100%-4',
  height: 3,
  content: '{center}대기 중... (0/35){/center}',
  tags: true,
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' }
  },
  label: ' 진행률 '
});

// 통계 패널
const statsBox = blessed.box({
  top: 6,
  left: 0,
  width: '100%',
  height: 5,
  content: '  {yellow-fg}대기 중...{/yellow-fg}\n\n  크롤러 실행을 기다리고 있습니다.',
  tags: true,
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' },
    fg: 'white'
  },
  label: ' 📈 실시간 통계 '
});

// 지역 그리드
const regionBox = blessed.box({
  top: 11,
  left: 0,
  width: '100%',
  height: 12,
  content: '\n  {gray-fg}크롤러가 시작되면 35개 지역별 현황이 여기에 실시간으로 표시됩니다.{/gray-fg}\n\n  {cyan-fg}광역시도 (17개) + 경기 기초지자체 (18개){/cyan-fg}',
  tags: true,
  border: { type: 'line' },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  style: {
    border: { fg: 'cyan' },
    fg: 'white'
  },
  label: ' 🗺️  지역별 현황 '
});

// 로그 스트림
const logBox = blessed.log({
  top: 23,
  left: 0,
  width: '100%',
  height: '100%-26',
  tags: true,
  border: { type: 'line' },
  scrollable: true,
  alwaysScroll: true,
  scrollbar: {
    ch: '█',
    style: { fg: 'cyan' }
  },
  mouse: true,
  style: {
    border: { fg: 'cyan' },
    fg: 'white'
  },
  label: ' 📝 최근 활동 로그 '
});

// 푸터 (현재 작업)
const footer = blessed.box({
  bottom: 0,
  left: 0,
  width: '100%',
  height: 3,
  content: '{center}{gray-fg}크롤러 대기 중... (Q 또는 ESC로 종료, R로 새로고침){/gray-fg}{/center}',
  tags: true,
  border: { type: 'line' },
  style: {
    border: { fg: 'cyan' },
    fg: 'yellow',
    bold: true
  },
  label: ' 🎯 현재 작업 '
});

// 화면에 추가
screen.append(header);
screen.append(progressBar);
screen.append(statsBox);
screen.append(regionBox);
screen.append(logBox);
screen.append(footer);

// 종료 키 바인딩
screen.key(['escape', 'q', 'C-c'], () => {
  return process.exit(0);
});

// 새로고침 키 바인딩
screen.key(['r'], () => {
  updateUI();
});

// UI 업데이트 함수
function updateUI() {
  let progress = readProgress();

  // .progress.json이 없으면 백그라운드 로그 파싱 시도
  if (!progress && customLogFile) {
    progress = parseBackgroundLog(customLogFile);
    if (progress) {
      header.setContent('{center}{yellow-fg}📡 백그라운드 크롤러 모니터링 중...{/yellow-fg}{/center}\n{center}{gray-fg}로그 파일에서 진행 상황을 읽고 있습니다{/gray-fg}{/center}');
    }
  }

  if (!progress) {
    header.setContent('{center}{red-fg}⚠️  진행 상태 파일을 찾을 수 없습니다{/red-fg}{/center}\n{center}{gray-fg}크롤러가 실행되면 자동으로 표시됩니다...{/gray-fg}{/center}');
    progressBar.setContent('{center}대기 중... (0/35){/center}');
    statsBox.setContent(`  {yellow-fg}대기 중...{/yellow-fg}\n\n  크롤러 실행을 기다리고 있습니다.`);
    regionBox.setContent(`  {gray-fg}크롤러가 시작되면 지역별 현황이 여기에 표시됩니다.{/gray-fg}`);
    footer.setContent(`{center}{gray-fg}크롤러 대기 중... (run-all-local.ps1 실행 필요){/gray-fg}{/center}`);
    screen.render();
    return;
  }

  // 헤더 업데이트
  const now = new Date().toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  header.setContent(`{center}${ICONS.rocket} 셀미바이미 35개 크롤러 실행 현황                    [${now}]{/center}`);

  // 진행률 바 업데이트
  const percentage = progress.total > 0 ? (progress.stats.completed + progress.stats.failed) / progress.total : 0;
  const barWidth = 40;
  const filledWidth = Math.floor(barWidth * percentage);
  const emptyWidth = barWidth - filledWidth;
  const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
  const progressText = `${Math.floor(percentage * 100)}% (${progress.stats.completed + progress.stats.failed}/${progress.total})`;
  progressBar.setContent(`{center}[{green-fg}${bar}{/green-fg}] ${progressText}{/center}`);

  // 소요 시간 계산
  const startTime = new Date(progress.startTime);
  const now2 = new Date();
  const elapsedMs = now2 - startTime;
  const elapsedSec = Math.floor(elapsedMs / 1000);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const remainingSec = elapsedSec % 60;
  const elapsed = `${elapsedMin}분 ${remainingSec}초`;

  // 남은 시간 예측
  let estimated = '-';
  if (progress.stats.completed > 0) {
    const avgTimePerRegion = elapsedMs / (progress.stats.completed + progress.stats.failed);
    const remainingRegions = progress.total - progress.stats.completed - progress.stats.failed;
    const remainingMs = avgTimePerRegion * remainingRegions;
    const remainingMin = Math.floor(remainingMs / 60000);
    estimated = `약 ${remainingMin}분`;
  }

  // 통계 패널 업데이트
  const stats = progress.stats;
  statsBox.setContent(
    `  ${ICONS.chart} {bold}실시간 통계{/bold}\n\n` +
    `    {green-fg}${ICONS.completed} 성공: ${stats.completed}개{/green-fg}  |  ` +
    `{red-fg}${ICONS.failed} 실패: ${stats.failed}개{/red-fg}  |  ` +
    `{yellow-fg}${ICONS.running} 진행중: ${stats.running}개{/yellow-fg}  |  ` +
    `{gray-fg}${ICONS.pending} 대기: ${stats.pending}개{/gray-fg}\n` +
    `    ${ICONS.list} 전체: ${stats.totalProcessed}건  |  ` +
    `{cyan-fg}🆕 신규: ${stats.totalNew}건{/cyan-fg}  |  ` +
    `⏭️  중복: ${stats.totalSkipped}건\n` +
    `    ${ICONS.timer} 소요시간: ${elapsed}  |  ⏳ 예상 남은 시간: ${estimated}`
  );

  // 지역 그리드 업데이트
  const regions = progress.regions;
  const regionKeys = Object.keys(regions);

  // 광역시도 (17개)
  const metropolitan = regionKeys.slice(0, 17);
  // 경기 기초지자체 (18개)
  const local = regionKeys.slice(17);

  let regionContent = `  {bold}광역시도 (17개){/bold}\n    `;
  metropolitan.forEach((key, idx) => {
    const region = regions[key];
    const icon = getStatusIcon(region.status);
    const color = getStatusColor(region.status);
    regionContent += `{${color}}${icon} ${key.padEnd(12)}{/${color}}`;
    if ((idx + 1) % 4 === 0 && idx < metropolitan.length - 1) {
      regionContent += '\n    ';
    }
  });

  regionContent += '\n\n  {bold}경기 기초지자체 (18개){/bold}\n    ';
  local.forEach((key, idx) => {
    const region = regions[key];
    const icon = getStatusIcon(region.status);
    const color = getStatusColor(region.status);
    regionContent += `{${color}}${icon} ${key.padEnd(16)}{/${color}}`;
    if ((idx + 1) % 4 === 0 && idx < local.length - 1) {
      regionContent += '\n    ';
    }
  });

  regionBox.setContent(regionContent);

  // 로그 업데이트 (새로운 로그만 추가)
  if (progress.logs && progress.logs.length > 0) {
    // 기존 로그 개수 확인
    const currentLogCount = logBox.getLines().length;
    const newLogs = progress.logs.slice(0, progress.logs.length - currentLogCount);

    newLogs.reverse().forEach(log => {
      const icon = getStatusIcon(log.type);
      const color = getStatusColor(log.type);
      logBox.log(`[${log.time}] {${color}}${icon} ${log.source}{/${color}} - ${log.message}`);
    });
  }

  // 푸터 업데이트 (현재 작업)
  if (progress.currentSource) {
    const current = regions[progress.currentSource];
    const status = current.status === 'running'
      ? `크롤링 중... (발견: ${current.processed}개, 신규: ${current.new}개, 중복: ${current.skipped}개)`
      : current.status;

    footer.setContent(
      `{center}${ICONS.target} 현재 작업: {bold}${progress.currentSource}{/bold} (${progress.currentIndex}/${progress.total}) - ${status}{/center}`
    );
  } else {
    footer.setContent(`{center}${ICONS.pending} 대기 중...{/center}`);
  }

  screen.render();
}

// 상태별 아이콘
function getStatusIcon(status) {
  switch (status) {
    case 'completed': return ICONS.completed;
    case 'failed': return ICONS.failed;
    case 'running': return ICONS.running;
    case 'started': return ICONS.running;
    case 'pending': return ICONS.pending;
    default: return '❓';
  }
}

// 상태별 색상
function getStatusColor(status) {
  switch (status) {
    case 'completed': return 'green-fg';
    case 'failed': return 'red-fg';
    case 'running': return 'yellow-fg';
    case 'started': return 'yellow-fg';
    case 'pending': return 'gray-fg';
    default: return 'white-fg';
  }
}

// 초기 메시지
logBox.log('{center}{bold}{cyan-fg}═══════════════════════════════════════════════════════{/cyan-fg}{/bold}{/center}');
logBox.log('{center}{bold}{white-fg}셀미바이미 크롤러 실시간 모니터 v1.0{/white-fg}{/bold}{/center}');
logBox.log('{center}{bold}{cyan-fg}═══════════════════════════════════════════════════════{/cyan-fg}{/bold}{/center}');
logBox.log('');
logBox.log('{yellow-fg}📊 모니터링 시작됨{/yellow-fg}');
logBox.log('{gray-fg}   - 크롤러 실행을 기다리고 있습니다{/gray-fg}');
logBox.log('{gray-fg}   - .progress.json 파일 생성 시 자동으로 업데이트됩니다{/gray-fg}');
logBox.log('');
logBox.log('{cyan-fg}💡 Tip: TossFaceFontMac 폰트를 설치하면 더 예쁜 이모지를 볼 수 있습니다{/cyan-fg}');
logBox.log('{cyan-fg}   설치 방법: public/fonts/TossFaceFontMac.ttf 더블클릭{/cyan-fg}');
logBox.log('');
logBox.log('{green-fg}⌨️  단축키:{/green-fg}');
logBox.log('{gray-fg}   Q 또는 ESC: 종료 | R: 새로고침 | 마우스 휠: 스크롤{/gray-fg}');
logBox.log('');
logBox.log('{yellow-fg}대기 중...{/yellow-fg}');

// 실시간 업데이트 (500ms마다)
setInterval(updateUI, 500);

// 초기 렌더링
updateUI();
screen.render();

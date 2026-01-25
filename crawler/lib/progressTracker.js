/**
 * 크롤러 진행 상황 추적 유틸리티
 * - .progress.json 파일로 실시간 상태 공유
 * - monitor.js가 이 파일을 읽어서 대시보드 업데이트
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, '..', '.progress.json');

/**
 * 진행 상태 초기화
 */
export function initProgress(sources) {
  const progress = {
    startTime: new Date().toISOString(),
    currentIndex: 0,
    total: sources.length,
    currentSource: null,
    regions: {},
    stats: {
      completed: 0,
      failed: 0,
      running: 0,
      pending: sources.length,
      totalNew: 0,
      totalSkipped: 0,
      totalProcessed: 0
    },
    logs: []
  };

  // 모든 소스를 pending으로 초기화
  sources.forEach(source => {
    progress.regions[source] = {
      status: 'pending',
      new: 0,
      skipped: 0,
      processed: 0,
      startTime: null,
      endTime: null,
      duration: 0,
      error: null
    };
  });

  writeProgress(progress);
  return progress;
}

/**
 * 진행 상태 읽기
 */
export function readProgress() {
  try {
    if (!fs.existsSync(PROGRESS_FILE)) {
      return null;
    }
    const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.warn('⚠️  .progress.json 읽기 실패:', error.message);
    return null;
  }
}

/**
 * 진행 상태 쓰기
 */
export function writeProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
  } catch (error) {
    console.warn('⚠️  .progress.json 쓰기 실패:', error.message);
  }
}

/**
 * 현재 소스 업데이트 (크롤링 시작)
 */
export function updateSourceStart(source, index) {
  const progress = readProgress();
  if (!progress) return;

  progress.currentIndex = index;
  progress.currentSource = source;
  progress.regions[source] = {
    ...progress.regions[source],
    status: 'running',
    startTime: new Date().toISOString()
  };

  progress.stats.running = 1;
  progress.stats.pending = Object.values(progress.regions).filter(r => r.status === 'pending').length;

  addLog(progress, source, 'started', `크롤링 시작`);
  writeProgress(progress);
}

/**
 * 현재 소스 업데이트 (크롤링 완료)
 */
export function updateSourceComplete(source, stats) {
  const progress = readProgress();
  if (!progress) return;

  const endTime = new Date();
  const startTime = new Date(progress.regions[source].startTime);
  const duration = Math.floor((endTime - startTime) / 1000); // 초 단위

  progress.regions[source] = {
    ...progress.regions[source],
    status: 'completed',
    new: stats.new || 0,
    skipped: stats.skipped || 0,
    processed: stats.processed || 0,
    endTime: endTime.toISOString(),
    duration: duration
  };

  progress.stats.completed++;
  progress.stats.running = 0;
  progress.stats.totalNew += stats.new || 0;
  progress.stats.totalSkipped += stats.skipped || 0;
  progress.stats.totalProcessed += stats.processed || 0;

  addLog(progress, source, 'completed', `완료 - 신규 ${stats.new}개, 중복 ${stats.skipped}개 (${duration}초)`);
  writeProgress(progress);
}

/**
 * 현재 소스 업데이트 (크롤링 실패)
 */
export function updateSourceFailed(source, error) {
  const progress = readProgress();
  if (!progress) return;

  const endTime = new Date();
  const startTime = new Date(progress.regions[source].startTime);
  const duration = Math.floor((endTime - startTime) / 1000);

  progress.regions[source] = {
    ...progress.regions[source],
    status: 'failed',
    endTime: endTime.toISOString(),
    duration: duration,
    error: error
  };

  progress.stats.failed++;
  progress.stats.running = 0;

  addLog(progress, source, 'failed', `실패 - ${error}`);
  writeProgress(progress);
}

/**
 * 크롤링 진행 중 상태 업데이트 (발견 개수 등)
 */
export function updateSourceProgress(source, partialStats) {
  const progress = readProgress();
  if (!progress) return;

  progress.regions[source] = {
    ...progress.regions[source],
    new: partialStats.new || progress.regions[source].new,
    skipped: partialStats.skipped || progress.regions[source].skipped,
    processed: partialStats.processed || progress.regions[source].processed
  };

  writeProgress(progress);
}

/**
 * 로그 추가
 */
function addLog(progress, source, type, message) {
  const timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  progress.logs.unshift({
    time: timestamp,
    source: source,
    type: type,
    message: message
  });

  // 최대 20개만 유지
  if (progress.logs.length > 20) {
    progress.logs = progress.logs.slice(0, 20);
  }
}

/**
 * 진행 상태 삭제
 */
export function cleanProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
  } catch (error) {
    console.warn('⚠️  .progress.json 삭제 실패:', error.message);
  }
}

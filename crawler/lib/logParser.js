/**
 * 백그라운드 크롤러 로그 파싱 유틸리티
 * - .progress.json이 없을 때 로그 파일을 직접 파싱
 */

import fs from 'fs';

/**
 * 로그 파일에서 진행 상황 추출
 */
export function parseBackgroundLog(logFilePath) {
  try {
    if (!fs.existsSync(logFilePath)) {
      return null;
    }

    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const lines = logContent.split('\n');

    const progress = {
      startTime: new Date().toISOString(),
      currentIndex: 0,
      total: 35,
      currentSource: null,
      regions: {},
      stats: {
        completed: 0,
        failed: 0,
        running: 0,
        pending: 35,
        totalNew: 0,
        totalSkipped: 0,
        totalProcessed: 0
      },
      logs: []
    };

    // 35개 지역 초기화
    const allSources = [
      'seoul', 'busan', 'daegu', 'incheon', 'gwangju', 'daejeon', 'ulsan', 'sejong',
      'gyeonggi', 'gangwon', 'chungbuk', 'chungnam', 'jeonbuk', 'jeonnam', 'gyeongbuk', 'gyeongnam', 'jeju',
      'seongnam', 'goyang', 'uijeongbu', 'namyangju', 'bucheon', 'gimpo', 'gwangmyeong',
      'gwangjuhanam', 'gurinamyangju', 'anseong', 'pyeongtaek', 'paju', 'yangpyeong',
      'pocheon', 'yeoncheon', 'dongducheonyangjyu', 'gapyeong1', 'gapyeong2'
    ];

    allSources.forEach(source => {
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

    // 로그 파싱
    let currentSource = null;
    let lastTimestamp = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 타임스탬프 추출
      const timestampMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)\]/);
      if (timestampMatch) {
        lastTimestamp = timestampMatch[1];
      }

      // 크롤링 시작 감지: "[1/35] seoul crawling..."
      const startMatch = line.match(/\[(\d+)\/35\]\s+(\w+)\s+crawling/);
      if (startMatch) {
        const index = parseInt(startMatch[1]);
        const source = startMatch[2];
        currentSource = source;
        progress.currentIndex = index;
        progress.currentSource = source;

        if (progress.regions[source]) {
          progress.regions[source].status = 'running';
          progress.regions[source].startTime = lastTimestamp;
        }

        progress.logs.unshift({
          time: new Date(lastTimestamp).toLocaleTimeString('ko-KR', { hour12: false }),
          source: source,
          type: 'started',
          message: '크롤링 시작'
        });
        continue;
      }

      // 완료 감지: "[OK] seoul completed"
      const completeMatch = line.match(/\[OK\]\s+(\w+)\s+completed/);
      if (completeMatch) {
        const source = completeMatch[1];
        if (progress.regions[source]) {
          progress.regions[source].status = 'completed';
          progress.regions[source].endTime = lastTimestamp;
          progress.stats.completed++;
          progress.stats.pending = 35 - progress.stats.completed - progress.stats.failed;
        }

        // 이전 라인에서 통계 추출
        const prevLine = lines[i - 1] || '';
        const statsMatch = prevLine.match(/신규\s+(\d+)개.*중복\s+(\d+)개/);
        if (statsMatch) {
          const newCount = parseInt(statsMatch[1]);
          const skippedCount = parseInt(statsMatch[2]);
          progress.regions[source].new = newCount;
          progress.regions[source].skipped = skippedCount;
          progress.regions[source].processed = newCount + skippedCount;
          progress.stats.totalNew += newCount;
          progress.stats.totalSkipped += skippedCount;
        }

        progress.logs.unshift({
          time: new Date(lastTimestamp).toLocaleTimeString('ko-KR', { hour12: false }),
          source: source,
          type: 'completed',
          message: `완료 - 신규 ${progress.regions[source].new}개, 중복 ${progress.regions[source].skipped}개`
        });
        continue;
      }

      // 실패 감지: "[FAIL] seoul failed"
      const failMatch = line.match(/\[FAIL\]\s+(\w+)\s+failed/);
      if (failMatch) {
        const source = failMatch[1];
        if (progress.regions[source]) {
          progress.regions[source].status = 'failed';
          progress.regions[source].endTime = lastTimestamp;
          progress.regions[source].error = '크롤링 실패';
          progress.stats.failed++;
          progress.stats.pending = 35 - progress.stats.completed - progress.stats.failed;
        }

        progress.logs.unshift({
          time: new Date(lastTimestamp).toLocaleTimeString('ko-KR', { hour12: false }),
          source: source,
          type: 'failed',
          message: '실패'
        });
        continue;
      }

      // 발견된 공고 수 추출 (진행 중)
      if (currentSource && line.includes('신규 수집:')) {
        const match = line.match(/신규 수집:\s+(\d+)개.*스킵\(중복\):\s+(\d+)개/);
        if (match && progress.regions[currentSource]) {
          progress.regions[currentSource].new = parseInt(match[1]);
          progress.regions[currentSource].skipped = parseInt(match[2]);
          progress.regions[currentSource].processed = parseInt(match[1]) + parseInt(match[2]);
        }
      }
    }

    // running 상태 업데이트
    progress.stats.running = Object.values(progress.regions).filter(r => r.status === 'running').length;
    progress.stats.totalProcessed = progress.stats.totalNew + progress.stats.totalSkipped;

    // 로그 최대 20개만 유지
    if (progress.logs.length > 20) {
      progress.logs = progress.logs.slice(0, 20);
    }

    return progress;
  } catch (error) {
    console.error('로그 파싱 오류:', error.message);
    return null;
  }
}

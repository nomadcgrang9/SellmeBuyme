import { loadPageWithRetry, resolveUrl } from '../lib/playwright.js';
import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 범용 selectNttList.do 패턴 크롤러
 *
 * 지원 사이트:
 * - 성남, 의정부, 남양주 (경기도 교육지원청)
 * - 대구, 강원, 충북, 충남, 전남, 경상북도 (시도교육청)
 *
 * 공통 HTML 구조:
 * - 목록: table tbody tr → a.nttInfoBtn[data-id] 또는 a[data-id]
 * - 상세: selectNttInfo.do?mi=XXX&bbsId=YYY&nttSn={data-id}
 *
 * @param {import('playwright').Page} page - Playwright Page 객체
 * @param {object} config - sources.json에서 로드된 설정
 * @returns {Promise<object[]>} - 크롤링된 채용 정보 배열
 */
export async function crawlNttPattern(page, config) {
  console.log(`\n📍 [NTT패턴] ${config.name} 크롤링 시작`);

  const jobs = [];
  let skippedCount = 0;

  // 배치 반복 방식 설정 (서울/경기/인천과 동일하게 개선)
  const SAFETY = {
    maxItems: 150,                // 절대 최대 수집 개수
    maxBatches: 15,               // 최대 배치 반복 횟수
    batchDuplicateThreshold: 0.8, // 배치 내 중복률 80% 이상이면 종료
    consecutiveDuplicateLimit: 10, // 연속 10개 중복 시 즉시 중단
  };

  const batchSize = config.crawlBatchSize || 10;
  let consecutiveDuplicates = 0;
  let totalProcessedCount = 0;
  let batchNumber = 0;
  let batchNewCount = 0;
  let batchDuplicateCount = 0;

  console.log(`\n🔄 배치 반복 모드: 배치당 ${batchSize}개, 최대 ${SAFETY.maxBatches}회`);
  console.log(`   중복률 ${SAFETY.batchDuplicateThreshold * 100}% 이상이면 종료`);

  try {
    // 1. 목록 페이지 로드
    console.log(`🌐 목록 페이지 접속: ${config.baseUrl}`);
    const loadResult = await loadPageWithRetry(page, config.baseUrl, { maxRetries: 3 });

    if (!loadResult.success) {
      console.error(`❌ 페이지 로드 실패: ${loadResult.error}`);
      return [];
    }

    await page.waitForTimeout(2000);

    // 테이블 렌더링 대기 (JavaScript 동적 로딩 사이트 대응)
    const tableSelector = config.selectors?.rows || 'table tbody tr';
    try {
      await page.waitForSelector(tableSelector, { timeout: 15000 });
      console.log('✅ 테이블 렌더링 확인됨');
    } catch (e) {
      console.warn('⚠️ 테이블 셀렉터 대기 타임아웃, 추가 대기 후 진행...');
      await page.waitForTimeout(3000);
    }

    // 2. 게시글 목록 추출 (공통 셀렉터 사용)
    console.log('📋 게시글 목록 추출 중...');

    const jobListData = await page.evaluate((cfg) => {
      const results = [];

      // 셀렉터 우선순위: config에 정의된 것 > 기본값
      const rowSelector = cfg.selectors?.rows || 'table tbody tr';
      const linkSelector = cfg.selectors?.link || 'a.nttInfoBtn, a[data-id], td.ta_l a';
      const dateSelector = cfg.selectors?.date || 'td:nth-child(5), td:nth-child(4), td:nth-child(6)';

      const rows = document.querySelectorAll(rowSelector);

      rows.forEach((row, index) => {
        try {
          // 공지사항 행 스킵 (일반적으로 클래스로 구분)
          if (row.classList.contains('notice') || row.classList.contains('noti')) {
            return;
          }

          // 제목 링크 찾기
          const titleLink = row.querySelector(linkSelector);
          if (!titleLink) return;

          // data-id 추출 (여러 방식 시도)
          let dataId = titleLink.getAttribute('data-id');

          // data-id가 없으면 onclick에서 추출 시도
          if (!dataId) {
            const onclick = titleLink.getAttribute('onclick') || '';
            const match = onclick.match(/['"](\d+)['"]/);
            if (match) dataId = match[1];
          }

          // href에서 nttSn 파라미터 추출 시도
          if (!dataId) {
            const href = titleLink.getAttribute('href') || '';
            const match = href.match(/nttSn=(\d+)/);
            if (match) dataId = match[1];
          }

          if (!dataId) return;

          const title = titleLink.textContent.trim();
          if (!title) return;

          // 날짜 추출 (여러 위치 시도)
          let dateText = '';
          const dateCandidates = dateSelector.split(',').map(s => s.trim());
          for (const sel of dateCandidates) {
            const dateEl = row.querySelector(sel);
            if (dateEl) {
              const text = dateEl.textContent.trim();
              // 날짜 형식 확인 (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD)
              if (/\d{4}[-./]\d{2}[-./]\d{2}/.test(text)) {
                dateText = text;
                break;
              }
            }
          }

          // 첨부파일 여부 확인
          const hasAttachment = !!row.querySelector('a[href*="download"], .file-icon, img[alt*="파일"], .ico_file');

          results.push({
            nttId: dataId,
            title,
            registeredDate: dateText,
            hasAttachment,
            rowIndex: index
          });
        } catch (e) {
          console.error(`행 ${index} 처리 오류:`, e.message);
        }
      });

      return results;
    }, config);

    console.log(`📊 발견된 공고 수: ${jobListData.length}개`);

    if (jobListData.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다. HTML 구조 확인 필요');

      // 디버깅: 페이지 HTML 일부 출력
      const debugInfo = await page.evaluate(() => {
        const tables = document.querySelectorAll('table');
        const links = document.querySelectorAll('a[data-id], a.nttInfoBtn');
        return {
          tableCount: tables.length,
          linkCount: links.length,
          bodyPreview: document.body.innerText.substring(0, 500)
        };
      });
      console.log('디버그 정보:', debugInfo);

      return [];
    }

    // 3. 각 공고 상세 페이지 크롤링 (SAFETY 로직 적용)
    for (let i = 0; i < jobListData.length; i++) {
      // SAFETY: 최대 수집 개수 체크
      if (jobs.length >= SAFETY.maxItems) {
        console.log(`\n🛑 최대 수집 개수(${SAFETY.maxItems}개) 도달, 크롤링 종료`);
        break;
      }

      // SAFETY: 연속 중복 10개 이상이면 종료
      if (consecutiveDuplicates >= SAFETY.consecutiveDuplicateLimit) {
        console.log(`\n🛑 연속 ${SAFETY.consecutiveDuplicateLimit}개 중복, 크롤링 종료`);
        break;
      }

      // 배치 시작
      if (i % batchSize === 0) {
        batchNumber++;
        batchNewCount = 0;
        batchDuplicateCount = 0;

        // SAFETY: 최대 배치 횟수 체크
        if (batchNumber > SAFETY.maxBatches) {
          console.log(`\n🛑 최대 배치 횟수(${SAFETY.maxBatches}회) 도달, 크롤링 종료`);
          break;
        }

        console.log(`\n📦 배치 ${batchNumber} 시작 (${i + 1}번째 공고부터)`);
      }

      const listInfo = jobListData[i];
      const nttId = listInfo.nttId;

      // 상세 페이지 URL 구성
      const detailUrl = `${config.detailUrlTemplate}${nttId}`;

      console.log(`\n  🔍 공고 ${i + 1}/${jobListData.length} (ID: ${nttId})`);
      console.log(`     제목: ${listInfo.title}`);
      console.log(`     URL: ${detailUrl}`);

      try {
        // SAFETY: DB 중복 체크
        const existing = await getExistingJobBySource(detailUrl);
        if (existing) {
          console.log(`     ⏭️  이미 존재하는 공고, 스킵`);
          skippedCount++;
          consecutiveDuplicates++;
          batchDuplicateCount++;
          totalProcessedCount++;

          // 배치 완료 체크
          if ((i + 1) % batchSize === 0 || i === jobListData.length - 1) {
            const batchTotal = batchNewCount + batchDuplicateCount;
            const duplicateRate = batchTotal > 0 ? batchDuplicateCount / batchTotal : 0;
            console.log(`\n📊 배치 ${batchNumber} 완료: 신규 ${batchNewCount}개, 중복 ${batchDuplicateCount}개 (중복률 ${(duplicateRate * 100).toFixed(1)}%)`);

            // SAFETY: 중복률 80% 이상이면 종료
            if (duplicateRate >= SAFETY.batchDuplicateThreshold && batchTotal >= 3) {
              console.log(`\n🛑 배치 중복률 ${(duplicateRate * 100).toFixed(1)}% >= ${SAFETY.batchDuplicateThreshold * 100}%, 크롤링 종료`);
              break;
            }
          }
          continue;
        }

        // 신규 공고 - 연속 중복 카운터 리셋
        consecutiveDuplicates = 0;
        batchNewCount++;
        totalProcessedCount++;

        const detailResult = await loadPageWithRetry(page, detailUrl, { maxRetries: 2 });
        if (!detailResult.success) {
          console.warn(`     ⚠️ 상세 페이지 로드 실패: ${detailResult.error}`);
          continue;
        }

        await page.waitForTimeout(1500);

        // 상세 페이지 데이터 추출
        const detailData = await extractDetailContent(page, config);

        // 스크린샷 캡처
        console.log(`     📸 스크린샷 캡처 중...`);
        const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
        const screenshotBase64 = screenshot.toString('base64');

        // 데이터 병합 (index.js가 기대하는 형식으로)
        const jobData = {
          organization: config.name || '교육청',
          title: listInfo.title,
          tags: ['교육청', 'NTT패턴'],
          location: config.region || '미상',
          metropolitanRegion: config.metropolitanRegion || null,
          compensation: null,
          deadline: listInfo.registeredDate,
          isUrgent: true,
          schoolLevel: 'mixed',
          subject: null,
          requiredLicense: null,
          link: detailUrl,
          crawledAt: new Date().toISOString(),
          detailContent: detailData.content,
          hasContentImages: detailData.hasContentImages,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          structuredContent: {
            nttId: nttId,
            content: detailData.content,
            attachmentUrl: detailData.attachmentUrl,
            attachmentFilename: detailData.attachmentFilename,
            hasContentImages: detailData.hasContentImages,
            metropolitanRegion: config.metropolitanRegion || null
          },
          screenshotBase64
        };

        jobs.push(jobData);
        console.log(`     ✅ 크롤링 완료 (본문 ${detailData.content.length}자)`);

        // 다음 공고 전 잠시 대기
        await page.waitForTimeout(1000);

        // 배치 완료 체크
        if ((i + 1) % batchSize === 0 || i === jobListData.length - 1) {
          const batchTotal = batchNewCount + batchDuplicateCount;
          const duplicateRate = batchTotal > 0 ? batchDuplicateCount / batchTotal : 0;
          console.log(`\n📊 배치 ${batchNumber} 완료: 신규 ${batchNewCount}개, 중복 ${batchDuplicateCount}개 (중복률 ${(duplicateRate * 100).toFixed(1)}%)`);

          // SAFETY: 중복률 80% 이상이면 종료
          if (duplicateRate >= SAFETY.batchDuplicateThreshold && batchTotal >= 3) {
            console.log(`\n🛑 배치 중복률 ${(duplicateRate * 100).toFixed(1)}% >= ${SAFETY.batchDuplicateThreshold * 100}%, 크롤링 종료`);
            break;
          }
        }

      } catch (error) {
        console.error(`     ❌ 상세 페이지 크롤링 실패: ${error.message}`);
        continue;
      }
    }

    console.log(`\n✅ [NTT패턴] ${config.name} 크롤링 완료`);
    console.log(`   📊 총 처리: ${totalProcessedCount}개, 신규 수집: ${jobs.length}개, 스킵(중복): ${skippedCount}개`);
    return jobs;

  } catch (error) {
    console.error(`❌ 크롤링 오류: ${error.message}`);
    throw error;
  }
}

/**
 * 상세 페이지 본문 및 첨부파일 추출
 */
async function extractDetailContent(page, config) {
  const result = {
    content: '',
    attachmentUrl: null,
    attachmentFilename: null,
    hasContentImages: false
  };

  try {
    // 본문 내용 추출
    result.content = await page.evaluate(() => {
      // 불필요한 요소 제거
      const removeSelectors = [
        'header', 'footer', 'nav', '.header', '.footer', '.gnb', '.lnb',
        '.breadcrumb', '.btn-area', '.skip-nav', '.sidebar', '.navigation'
      ];

      removeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });

      // 본문 선택자 우선순위 (경기 지역교육청 셀렉터 추가)
      const contentSelectors = [
        '.bbsV_cont',         // 경기 지역교육청 (가평, 성남 등)
        '.bbs_ViewA',         // 경기 지역교육청 대체
        'td.nttCn',           // 일반 NTT 패턴
        'div.nttCn',
        '.nttCtnt',
        '.view_con',
        '.board_view',
        '.view-content',
        '.view_content',
        '.content',
        '#content',
        'article',
        'main'
      ];

      for (const selector of contentSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          let text = elem.innerText.trim();
          // 불필요한 텍스트 제거
          text = text
            .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          // 텍스트가 있으면 반환 (이미지만 있는 경우 텍스트가 0일 수 있음)
          if (text.length > 0) {
            return text;
          }
        }
      }

      // 전체 body 사용 (최후 수단)
      return document.body.innerText.substring(0, 5000).trim();
    });

    // 첨부파일 추출
    const attachmentData = await page.evaluate(() => {
      // 1. 직접 다운로드 링크 찾기
      const fileExtensions = ['.hwp', '.hwpx', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
      const links = Array.from(document.querySelectorAll('a'));

      for (const link of links) {
        const href = link.getAttribute('href') || '';
        const text = link.textContent || '';

        // 파일 확장자가 포함된 링크
        for (const ext of fileExtensions) {
          if (href.toLowerCase().includes(ext) || text.toLowerCase().includes(ext)) {
            if (!href.startsWith('javascript:') && href !== '#') {
              return {
                url: href,
                filename: text.trim() || null
              };
            }
          }
        }
      }

      // 2. 다운로드 관련 onclick 이벤트 찾기
      const downloadElements = document.querySelectorAll('[onclick*="download"], [onclick*="file"]');
      for (const el of downloadElements) {
        const onclick = el.getAttribute('onclick') || '';
        // URL 추출 시도
        const urlMatch = onclick.match(/['"]([^'"]+\.(hwp|pdf|doc|docx|xls|xlsx)[^'"]*)['"]/i);
        if (urlMatch) {
          return {
            url: urlMatch[1],
            filename: el.textContent?.trim() || null
          };
        }
      }

      // 3. previewAjax 패턴 (성남 등)
      const prvwLinks = document.querySelectorAll('.prvw a, .prvw_btns a');
      for (const link of prvwLinks) {
        const onclick = link.getAttribute('onclick') || '';
        const match = onclick.match(/previewAjax\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
        if (match) {
          return { url: match[1], filename: match[2] };
        }
      }

      return null;
    });

    if (attachmentData) {
      result.attachmentUrl = resolveUrl(page.url(), attachmentData.url);
      result.attachmentFilename = attachmentData.filename;
    }

    // 본문 내 이미지 확인 (경기 지역교육청 셀렉터 포함)
    result.hasContentImages = await page.evaluate(() => {
      const contentSelectors = [
        '.bbsV_cont',         // 경기 지역교육청
        '.bbs_ViewA',
        '.board_view',
        '.nttCn',
        '.content',
        '.view_con',
        'article'
      ];
      let contentArea = null;

      for (const selector of contentSelectors) {
        contentArea = document.querySelector(selector);
        if (contentArea) break;
      }

      if (!contentArea) contentArea = document.body;

      const images = contentArea.querySelectorAll('img');
      const realImages = Array.from(images).filter(img => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        const src = img.src || '';
        // 아이콘, 로고, 버튼 이미지 제외
        const isIcon = src.includes('icon') || src.includes('logo') || src.includes('btn') || src.includes('bullet');
        return width > 100 && height > 100 && !isIcon;
      });

      return realImages.length > 0;
    });

  } catch (error) {
    console.warn(`     상세 내용 추출 실패: ${error.message}`);
  }

  return result;
}

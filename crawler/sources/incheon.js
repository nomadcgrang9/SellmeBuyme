import { loadPage, getTextBySelectors, getAttributeBySelectors, resolveUrl } from '../lib/playwright.js';
import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 인천교육청 크롤러
 * 패턴 A: data-id 기반 (nttInfoBtn + data-id)
 * 광역자치단체: 상세 페이지에서 지역(구/군) 추출 필요
 */

// 인천 자치구 목록 (지역 매핑용)
const INCHEON_DISTRICTS = [
  '중구', '동구', '미추홀구', '연수구', '남동구',
  '부평구', '계양구', '서구', '강화군', '옹진군'
];

export async function crawlIncheon(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  // 1. 목록 페이지 로딩
  await loadPage(page, config.baseUrl, config.selectors.listContainer);

  // 2. 페이지 구조 분석 (디버깅용)
  const pageTitle = await page.title();
  console.log(`📄 페이지 제목: ${pageTitle}`);

  // 3. 공고 목록 추출 (배치 반복 방식)
  const jobs = [];
  let skippedCount = 0;

  const SAFETY = {
    maxItems: 100,                // 절대 최대 수집 개수
    maxBatches: 10,               // 최대 배치 반복 횟수
    batchDuplicateThreshold: 0.5, // 배치 내 중복률 50% 이상이면 종료
    consecutiveDuplicateLimit: 3, // 연속 중복 시 즉시 중단
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
    // 여러 선택자 시도
    const rows = await page.$$(config.selectors.rows);

    if (rows.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다. HTML 구조 확인 필요');

      // 디버깅: 페이지 HTML 일부 출력
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('페이지 내용 샘플:', bodyText);

      return [];
    }

    console.log(`📋 발견된 공고 수: ${rows.length}개`);

    // 4. 각 행에서 데이터 추출
    let shouldStop = false;

    for (let i = 0; i < rows.length && !shouldStop; i++) {
      // 안전장치 1: 절대 최대 개수
      if (totalProcessedCount >= SAFETY.maxItems) {
        console.log(`\n⚠️ 절대 최대 수집 개수(${SAFETY.maxItems}) 도달`);
        break;
      }

      // 연속 중복 즉시 중단
      if (consecutiveDuplicates >= SAFETY.consecutiveDuplicateLimit) {
        console.log(`\n🛑 연속 ${SAFETY.consecutiveDuplicateLimit}개 중복 - 기존 영역 도달, 즉시 종료`);
        break;
      }

      // 배치 완료 체크
      if (batchNewCount + batchDuplicateCount >= batchSize) {
        batchNumber++;
        const batchTotal = batchNewCount + batchDuplicateCount;
        const duplicateRate = batchTotal > 0 ? batchDuplicateCount / batchTotal : 0;

        console.log(`\n━━━ 배치 ${batchNumber} 결과 ━━━`);
        console.log(`   신규: ${batchNewCount}개, 중복: ${batchDuplicateCount}개`);
        console.log(`   중복률: ${(duplicateRate * 100).toFixed(0)}% (임계값: ${SAFETY.batchDuplicateThreshold * 100}%)`);

        if (duplicateRate >= SAFETY.batchDuplicateThreshold) {
          console.log(`   → ✅ 기존 데이터 영역 진입 → 크롤링 완료`);
          shouldStop = true;
          break;
        }

        if (batchNumber >= SAFETY.maxBatches) {
          console.log(`   → ⚠️ 최대 배치 횟수 도달`);
          shouldStop = true;
          break;
        }

        console.log(`   → 🔄 중복률 낮음, 다음 배치 계속...`);
        batchNewCount = 0;
        batchDuplicateCount = 0;
      }

      try {
        // 매번 새로 rows를 가져와서 stale element 방지
        const currentRows = await page.$$(config.selectors.rows);
        if (i >= currentRows.length) {
          console.warn(`  ⚠️  행 ${i + 1} 찾을 수 없음`);
          continue;
        }

        const row = currentRows[i];

        console.log(`\n  🔍 행 ${i + 1} 디버깅:`);

        let title = await getTextBySelectors(row, config.selectors.title);
        // 제목 정리: N(새글표시), 줄바꿈, 탭, 공백 정리
        if (title) {
          title = title.replace(/^N\s*/, '').replace(/\s+/g, ' ').trim();
        }
        console.log(`     title: "${title}" (길이: ${title ? title.length : 0})`);

        const date = await getTextBySelectors(row, config.selectors.date);
        console.log(`     date: "${date}"`);

        // 목록에서 추가 정보 추출 (인천 특화)
        // 컬럼 순서: 등록일(1), 모집상태(2), 기관명(3), 모집직종(4), 제목(5), 모집종료일(6), 채용시작일(7), 채용종료일(8)
        const organization = await row.$eval('td:nth-child(3)', el => el.textContent.trim()).catch(() => null);
        const jobType = await row.$eval('td:nth-child(4)', el => el.textContent.trim()).catch(() => null);
        const recruitStatus = await row.$eval('td:nth-child(2)', el => el.textContent.trim()).catch(() => null);
        console.log(`     기관: "${organization}", 직종: "${jobType}", 상태: "${recruitStatus}"`);

        // data-id 속성 추출 (javascript: 링크 대신)
        const dataId = await getAttributeBySelectors(row, config.selectors.link, 'data-id');
        console.log(`     dataId: "${dataId}"`);

        // 행의 HTML 구조 출력 (디버깅)
        if (!title || !dataId) {
          const rowHtml = await row.innerHTML();
          console.log(`     ❌ 실패 원인 - HTML 구조:`);
          console.log(`     ${rowHtml.substring(0, 300)}`);
        }

        // 필수 필드 검증
        if (!title || !dataId) {
          console.warn(`  ⚠️  행 ${i + 1} 필수 필드 누락 (title: ${!!title}, dataId: ${!!dataId})`);
          continue;
        }

        // data-id로 상세 페이지 URL 생성
        const absoluteLink = config.detailUrlTemplate + dataId;

        // 중복 체크 (크롤러 단계에서 수행)
        const existing = await getExistingJobBySource(absoluteLink);

        if (existing) {
          consecutiveDuplicates++;
          skippedCount++;
          batchDuplicateCount++;
          console.log(`  ⏭️ 중복 ${consecutiveDuplicates}/${SAFETY.consecutiveDuplicateLimit}: ${title?.substring(0, 30)}...`);
          continue;
        }

        // 신규 공고 발견 - 중복 카운터 리셋
        consecutiveDuplicates = 0;
        totalProcessedCount++;
        batchNewCount++;

        console.log(`  📄 신규 ${totalProcessedCount}. ${title}`);
        console.log(`     상세 페이지 접속 중...`);

        // 상세 페이지 크롤링 (텍스트 + 스크린샷)
        const detailData = await crawlDetailPage(page, absoluteLink, config);

        // 지역 추출: 상세 페이지에서 기관위치 파싱
        // 규칙1: 광역자치단체(인천) + 기초자치단체(남동 등) 둘 다 저장
        // 규칙2: 구/군 접미사 제거 (예: 남동구 → 남동)
        // 규칙2 예외: 중구, 동구, 남구, 서구, 북구 등 '구' 자체가 이름인 경우 유지
        const rawDistrict = detailData.location || extractDistrictFromText(organization);
        const EXCEPTION_DISTRICTS = ['중구', '동구', '남구', '서구', '북구'];
        let basicLocation = '인천';
        if (rawDistrict) {
          if (EXCEPTION_DISTRICTS.includes(rawDistrict)) {
            basicLocation = rawDistrict;  // 예외: 중구, 동구 등은 그대로 유지
          } else {
            basicLocation = rawDistrict.replace(/구$|군$/, '');  // 일반: 남동구 → 남동
          }
        }
        const metropolitanLocation = '인천';

        jobs.push({
          title: title,
          date: date || '날짜 없음',
          link: absoluteLink,
          organization: organization,
          jobField: jobType,
          location: basicLocation,                    // 기초자치단체 (접미사 제거)
          metropolitanLocation: metropolitanLocation, // 광역자치단체
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          hasContentImages: detailData.hasContentImages,
          screenshotBase64: detailData.screenshot,
        });

        console.log(`  ✅ 신규 ${totalProcessedCount}. 완료 (지역: ${metropolitanLocation} > ${basicLocation})`);

        // 목록 페이지로 돌아가기
        if (totalProcessedCount < SAFETY.maxItems) {
          console.log(`     목록으로 돌아가는 중...`);
          await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1000);
        }
      } catch (error) {
        console.warn(`  ⚠️  행 ${i + 1} 파싱 실패: ${error.message}`);
      }
    }
  } catch (error) {
    console.error(`❌ 크롤링 실패: ${error.message}`);
    throw error;
  }

  console.log(`\n✅ ${config.name} 크롤링 완료`);
  console.log(`   - 신규: ${jobs.length}개`);
  console.log(`   - 중복 스킵: ${skippedCount}개`);
  console.log(`   - 총 처리: ${jobs.length + skippedCount}개`);
  console.log(`   - 배치 수: ${batchNumber}회\n`);
  return jobs;
}

/**
 * 텍스트에서 인천 자치구 추출
 */
function extractDistrictFromText(text) {
  if (!text) return null;

  for (const district of INCHEON_DISTRICTS) {
    if (text.includes(district)) {
      return district;
    }
  }
  return null;
}

/**
 * 상세 페이지 크롤링 (본문 + 첨부파일 + 스크린샷 + 지역)
 */
async function crawlDetailPage(page, detailUrl, config) {
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // 기관위치에서 지역(구/군) 추출
    const location = await page.evaluate((districts) => {
      // 기관위치 필드 찾기
      const rows = document.querySelectorAll('table tr, dl, .info-row');
      for (const row of rows) {
        const text = row.textContent || '';
        if (text.includes('기관위치') || text.includes('소재지') || text.includes('근무지')) {
          // 인천 자치구 찾기
          for (const district of districts) {
            if (text.includes(district)) {
              return district;
            }
          }
        }
      }
      return null;
    }, INCHEON_DISTRICTS);

    // 본문 내용 추출 (불필요한 요소 제거)
    const content = await page.evaluate(() => {
      // 불필요한 요소 제거
      const removeSelectors = [
        '.skip-nav',
        '.header',
        '.footer',
        '.sidebar',
        '.gnb',
        '.lnb',
        '.breadcrumb',
        '.btn-area',
        '.share-area',
        'nav',
        'header',
        'footer',
        '.navigation',
        '.menu'
      ];

      removeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });

      // 일반적인 게시판 본문 선택자들
      const selectors = [
        '.board-view-content',
        '.view-content',
        '.content',
        '#content',
        '.nttCn',
        '.board_view',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          let text = element.innerText.trim();

          // 불필요한 텍스트 패턴 제거
          text = text
            .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵|알림마당/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          return text;
        }
      }

      // 선택자로 못 찾으면 body 전체
      let text = document.body.innerText.substring(0, 5000);
      text = text
        .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵|알림마당/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return text;
    });

    // 첨부파일 추출 (인천 특화: goFileDown 패턴)
    let attachmentUrl = null;
    let attachmentFilename = null;

    // 방법 1: goFileDown 함수 호출 패턴 분석
    const fileDownData = await page.evaluate(() => {
      // onclick="goFileDown('a15b2c37ea32dcea4d845a7953c5a1db')" 패턴 찾기
      const allElements = document.querySelectorAll('[onclick*="goFileDown"], [onclick*="FileDown"]');

      for (const el of allElements) {
        const onclick = el.getAttribute('onclick');
        const match = onclick.match(/goFileDown\s*\(\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
          const filename = el.textContent?.trim() || null;
          return {
            fileKey: match[1],
            filename: filename
          };
        }
      }

      // 첨부파일 영역에서 링크 찾기
      const attachArea = document.querySelector('.atch-file-list, .file-list, .file-area');
      if (attachArea) {
        const links = attachArea.querySelectorAll('a');
        for (const link of links) {
          const href = link.getAttribute('href');
          const onclick = link.getAttribute('onclick');

          if (onclick?.includes('goFileDown')) {
            const match = onclick.match(/goFileDown\s*\(\s*['"]([^'"]+)['"]/);
            if (match) {
              return {
                fileKey: match[1],
                filename: link.textContent?.trim()
              };
            }
          }

          // 일반 다운로드 링크
          if (href && !href.startsWith('javascript:') && href !== '#') {
            const text = link.textContent?.trim();
            if (text?.match(/\.(hwp|hwpx|pdf|doc|docx)$/i) || href.match(/\.(hwp|hwpx|pdf|doc|docx)/i)) {
              return {
                directUrl: href,
                filename: text
              };
            }
          }
        }
      }

      return null;
    });

    if (fileDownData) {
      if (fileDownData.directUrl) {
        attachmentUrl = resolveUrl(detailUrl, fileDownData.directUrl);
        attachmentFilename = fileDownData.filename;
      } else if (fileDownData.fileKey) {
        // goFileDown 패턴: 인천교육청 파일 다운로드 URL 구성
        // 일반적으로 /cmm/fms/FileDown.do?atchFileId=xxx 패턴
        attachmentUrl = `https://www.ice.go.kr/cmm/fms/FileDown.do?atchFileId=${fileDownData.fileKey}&fileSn=0`;
        attachmentFilename = fileDownData.filename;
        console.log(`     📎 goFileDown 패턴 감지: ${fileDownData.fileKey}`);
      }
    }

    // 방법 2: 일반 첨부파일 링크 fallback
    if (!attachmentUrl) {
      const selectorCandidates = (config.selectors?.attachment ?? '')
        .split(',')
        .map((selector) => selector.trim())
        .filter((selector) => selector.length > 0);

      for (const selector of selectorCandidates) {
        attachmentUrl = await page.evaluate((sel) => {
          const element = document.querySelector(sel);
          if (!element) return null;

          const href = element.getAttribute('href') || element.getAttribute('data-href');
          if (!href || href.startsWith('javascript:') || href === '#') return null;

          return href.trim();
        }, selector);

        if (attachmentUrl) {
          attachmentUrl = resolveUrl(detailUrl, attachmentUrl);
          break;
        }
      }
    }

    // 방법 3: 파일 확장자로 검색
    if (!attachmentUrl) {
      const fileExtensions = ['.hwp', '.hwpx', '.pdf', '.doc', '.docx'];
      for (const ext of fileExtensions) {
        attachmentUrl = await page.evaluate((extension) => {
          const links = Array.from(document.querySelectorAll('a'));
          const target = links.find((link) => {
            const hrefValue = link.getAttribute('href') || '';
            const textValue = link.textContent || '';
            return (
              hrefValue.toLowerCase().includes(extension) ||
              textValue.toLowerCase().includes(extension)
            ) && !hrefValue.startsWith('javascript:');
          });

          if (!target) return null;
          const href = target.getAttribute('href');
          return href && !href.startsWith('javascript:') ? href.trim() : null;
        }, ext);

        if (attachmentUrl) {
          attachmentUrl = resolveUrl(detailUrl, attachmentUrl);
          break;
        }
      }
    }

    // 본문 내부 실제 이미지 판별
    console.log(`     🖼️ 본문 이미지 확인 중...`);
    const hasContentImages = await page.evaluate(() => {
      const contentSelectors = ['.board_view', '.nttCn', '.content', '.view_con', 'article'];
      let contentArea = null;

      for (const selector of contentSelectors) {
        contentArea = document.querySelector(selector);
        if (contentArea) break;
      }

      if (!contentArea) {
        contentArea = document.body;
      }

      const images = contentArea.querySelectorAll('img');
      const realImages = Array.from(images).filter(img => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        return width > 100 && height > 100;
      });

      return realImages.length > 0;
    });

    console.log(`     본문 이미지: ${hasContentImages ? '있음' : '없음'}`);

    // 페이지 스크린샷 캡처
    console.log(`     📸 스크린샷 캡처 중...`);
    const screenshot = await page.screenshot({
      fullPage: true,
      type: 'png'
    });
    const screenshotBase64 = screenshot.toString('base64');

    console.log(`     본문 길이: ${content.length}자`);
    console.log(`     첨부파일: ${attachmentUrl ? '있음' : '없음'}`);
    console.log(`     스크린샷: ${(screenshotBase64.length / 1024).toFixed(0)}KB`);
    console.log(`     지역: ${location || '미추출'}`);

    return {
      content: content,
      attachmentUrl: attachmentUrl,
      attachmentFilename: attachmentFilename,
      hasContentImages: hasContentImages,
      screenshot: screenshotBase64,
      location: location,
    };
  } catch (error) {
    console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
    return {
      content: '',
      attachmentUrl: null,
      attachmentFilename: null,
      hasContentImages: false,
      screenshot: null,
      location: null,
    };
  }
}

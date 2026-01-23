import { loadPageWithRetry, resolveUrl } from '../lib/playwright.js';
import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 강원특별자치도교육청 크롤러 (v2)
 * 패턴: /main/bbs/list.do 기반 테이블 목록 + onclick 상세 페이지
 * 광역자치단체: 상세 페이지 주소에서 지역(시/군) 추출
 */

// 강원도 시/군 목록 (지역 매핑용)
// 규칙2: '시', '군' 접미사 제거하여 저장
const GANGWON_REGIONS = [
  '춘천', '원주', '강릉', '동해', '태백',
  '속초', '삼척', '홍천', '횡성', '영월',
  '평창', '정선', '철원', '화천', '양구',
  '인제', '고성', '양양'
];

export async function crawlGangwon(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  // 1. 목록 페이지 로딩
  const loadResult = await loadPageWithRetry(page, config.baseUrl, { maxRetries: 3 });
  if (!loadResult.success) {
    console.error(`❌ 페이지 로드 실패: ${loadResult.error}`);
    return [];
  }
  await page.waitForTimeout(2000);

  // 2. 페이지 구조 분석 (디버깅용)
  const pageTitle = await page.title();
  console.log(`📄 페이지 제목: ${pageTitle}`);

  // 3. 공고 목록 추출 (배치 반복 방식)
  const jobs = [];
  let skippedCount = 0;

  const SAFETY = {
    maxItems: 150,                // 절대 최대 수집 개수 (100→150 통일)
    maxBatches: 15,               // 최대 배치 반복 횟수 (10→15 통일)
    batchDuplicateThreshold: 0.8, // 배치 내 중복률 80% 이상이면 종료 (0.5→0.8 통일)
    consecutiveDuplicateLimit: 10, // 연속 중복 시 즉시 중단 (3→10 통일)
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
    // 테이블 행 선택 (tbody tr) - 새 구조에서는 caption 있는 테이블의 tbody tr
    const rowSelector = 'table tbody tr';
    const rows = await page.$$(rowSelector);

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
        await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1500);

        const currentRows = await page.$$(rowSelector);
        if (i >= currentRows.length) {
          console.warn(`  ⚠️  행 ${i + 1} 찾을 수 없음`);
          continue;
        }

        const row = currentRows[i];

        console.log(`\n  🔍 행 ${i + 1} 처리 중...`);

        // 목록에서 기본 정보 추출 (새 구조: 번호|제목|작성일|채용여부|기관명|마감일자|파일)
        const listData = await row.evaluate((el) => {
          const cells = el.querySelectorAll('td');
          if (cells.length < 5) return null;

          // 번호 (첫 번째 컬럼)
          const number = cells[0]?.textContent?.trim() || '';

          // 제목과 링크 (두 번째 컬럼) - onclick으로 상세 페이지 이동
          const titleCell = cells[1];
          const titleLink = titleCell?.querySelector('a');
          let title = titleLink?.textContent?.trim() || titleCell?.textContent?.trim() || '';

          // NEW 라벨 제거
          title = title.replace(/^NEW\s*/i, '').trim();

          // 제목에서 카테고리 태그 추출 (예: [기간제교사])
          const categoryMatch = title.match(/^\[([^\]]+)\]/);
          const category = categoryMatch ? categoryMatch[1] : '';
          // 카테고리 태그 제거한 순수 제목
          const cleanTitle = title.replace(/^\[[^\]]+\]\s*/, '').trim();

          // 작성일 (세 번째 컬럼)
          const date = cells[2]?.textContent?.trim() || '';

          // 채용여부 (네 번째 컬럼)
          const recruitStatus = cells[3]?.textContent?.trim() || '';

          // 기관명 (다섯 번째 컬럼)
          const organization = cells[4]?.textContent?.trim() || '';

          // 마감일자 (여섯 번째 컬럼)
          const deadline = cells[5]?.textContent?.trim() || '';

          // 첨부파일 유무 (일곱 번째 컬럼)
          const hasAttachment = cells[6]?.querySelector('img') !== null;

          return {
            number,
            title: cleanTitle,
            category,
            date,
            recruitStatus,
            organization,
            deadline,
            hasAttachment
          };
        });

        if (!listData) {
          console.warn(`  ⚠️  행 ${i + 1} 필수 필드 누락`);
          continue;
        }

        console.log(`     제목: "${listData.title}"`);
        console.log(`     기관: "${listData.organization}"`);
        console.log(`     채용상태: "${listData.recruitStatus}"`);

        // 링크 클릭하여 상세 페이지로 이동
        const link = await row.$('td:nth-child(2) a');
        if (!link) {
          console.warn(`  ⚠️  행 ${i + 1} 링크를 찾을 수 없음`);
          continue;
        }

        console.log(`  📄 ${i + 1}. ${listData.title}`);
        console.log(`     상세 페이지 접속 중... (클릭 방식)`);

        // 클릭하여 상세 페이지로 이동
        await link.click();
        await page.waitForTimeout(2000);

        // 현재 URL에서 bbsSn 추출
        const currentUrl = page.url();
        const bbsSnMatch = currentUrl.match(/bbsSn=(\d+)/);
        const bbsSn = bbsSnMatch ? bbsSnMatch[1] : null;

        if (!bbsSn) {
          console.warn(`  ⚠️  상세 페이지 URL에서 bbsSn 추출 실패: ${currentUrl}`);
          continue;
        }

        console.log(`     bbsSn: "${bbsSn}"`);

        // 중복 체크 (크롤러 단계에서 수행)
        const existing = await getExistingJobBySource(currentUrl);

        if (existing) {
          consecutiveDuplicates++;
          skippedCount++;
          batchDuplicateCount++;
          console.log(`  ⏭️ 중복 ${consecutiveDuplicates}/${SAFETY.consecutiveDuplicateLimit}: ${listData.title?.substring(0, 30)}...`);
          continue;
        }

        // 신규 공고 발견 - 중복 카운터 리셋
        consecutiveDuplicates = 0;
        totalProcessedCount++;
        batchNewCount++;

        console.log(`  📄 신규 ${totalProcessedCount}. ${listData.title}`);

        // 상세 페이지 크롤링
        const detailData = await crawlDetailPage(page, currentUrl, config);

        // 지역 추출: 상세 페이지 주소에서 시/군 추출
        // 규칙1: 광역자치단체(강원) + 기초자치단체(춘천 등) 둘 다 저장
        // 규칙2: 시/군 접미사 제거 (GANGWON_REGIONS 배열에서 이미 처리됨)
        const basicLocation = detailData.location || extractRegionFromText(listData.organization) || '강원';
        const metropolitanLocation = '강원';

        jobs.push({
          title: listData.category ? `[${listData.category}] ${listData.title}` : listData.title,
          date: listData.date || '날짜 없음',
          link: currentUrl,
          organization: detailData.organization || listData.organization,
          jobField: listData.category,
          location: basicLocation,                    // 기초자치단체 (접미사 제거됨)
          metropolitanLocation: metropolitanLocation, // 광역자치단체
          recruitStatus: detailData.recruitStatus || listData.recruitStatus,
          deadline: detailData.deadline || listData.deadline,
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          hasContentImages: detailData.hasContentImages,
          screenshotBase64: detailData.screenshot,
          contact: detailData.contact,
          email: detailData.email,
          manager: detailData.manager,
        });

        console.log(`  ✅ 신규 ${totalProcessedCount}. 완료 (지역: ${metropolitanLocation} > ${basicLocation})`);

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
 * 텍스트에서 강원도 시/군 추출
 */
function extractRegionFromText(text) {
  if (!text) return null;

  for (const region of GANGWON_REGIONS) {
    if (text.includes(region)) {
      return region;
    }
  }
  return null;
}

/**
 * 상세 페이지 크롤링 (본문 + 첨부파일 + 스크린샷 + 상세 정보)
 */
async function crawlDetailPage(page, detailUrl, config) {
  try {
    // 상세 정보 추출 (강원 교육청 특화 - dt/dd 구조)
    const detailInfo = await page.evaluate((regions) => {
      const result = {
        organization: null,
        recruitStatus: null,
        location: null,
        contact: null,
        email: null,
        manager: null,
        address: null,
        deadline: null,
      };

      // dt/dd 패턴에서 정보 추출
      const terms = document.querySelectorAll('dt, term');
      terms.forEach(term => {
        const label = term.textContent?.trim() || '';
        const dd = term.nextElementSibling;
        const value = dd?.textContent?.trim() || '';

        if (label.includes('기관명') || label.includes('학교명')) {
          result.organization = value;
          // 기관명에서 지역 추출 시도
          for (const region of regions) {
            if (value.includes(region)) {
              result.location = region;
              break;
            }
          }
        } else if (label.includes('채용여부')) {
          result.recruitStatus = value;
        } else if (label.includes('주소') || label.includes('소재지') || label.includes('위치')) {
          result.address = value;
          // 주소에서 지역 추출
          if (!result.location) {
            for (const region of regions) {
              if (value.includes(region)) {
                result.location = region;
                break;
              }
            }
          }
        } else if (label.includes('전화') || label.includes('연락처')) {
          result.contact = value;
        } else if (label.includes('이메일') || label.includes('E-mail') || label.includes('email')) {
          result.email = value;
        } else if (label.includes('담당자')) {
          result.manager = value;
        } else if (label.includes('마감일자')) {
          result.deadline = value;
        }
      });

      return result;
    }, GANGWON_REGIONS);

    // 본문 내용 추출 (paragraph 요소들)
    const content = await page.evaluate(() => {
      // 본문 컨테이너 찾기
      const contentSelectors = [
        'div.view_content',
        'div.bbs_view',
        'div.board_view',
        '.content_area',
        'article',
      ];

      let contentArea = null;
      for (const selector of contentSelectors) {
        contentArea = document.querySelector(selector);
        if (contentArea) break;
      }

      // 컨테이너를 못 찾으면 paragraph 요소들 직접 수집
      if (!contentArea) {
        const paragraphs = document.querySelectorAll('p, .paragraph');
        const texts = [];
        paragraphs.forEach(p => {
          const text = p.textContent?.trim();
          if (text && text.length > 10 && !text.includes('만족도') && !text.includes('바로가기')) {
            texts.push(text);
          }
        });
        return texts.join('\n\n').substring(0, 5000);
      }

      // 불필요한 요소 제거
      const removeSelectors = [
        '.skip-nav', '.header', '.footer', '.sidebar',
        '.gnb', '.lnb', '.breadcrumb', '.btn-area',
        '.share-area', 'nav', 'header', 'footer',
        '.navigation', '.menu', '.satisfaction'
      ];
      removeSelectors.forEach(selector => {
        contentArea.querySelectorAll(selector).forEach(el => el.remove());
      });

      let text = contentArea.innerText.trim();
      text = text
        .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵/g, '')
        .replace(/만족도 조사[\s\S]*?평가하기/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      return text.substring(0, 5000);
    });

    // 첨부파일 추출 (강원 교육청: /cmm/fileDown.do?encKey=xxx 패턴)
    let attachmentUrl = null;
    let attachmentFilename = null;

    const fileData = await page.evaluate(() => {
      // 첨부파일 링크 찾기
      const fileLinks = document.querySelectorAll('a[href*="fileDown.do"], a[href*="download"]');

      for (const link of fileLinks) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('javascript:')) {
          const filename = link.textContent?.trim() || null;
          return {
            url: href,
            filename: filename
          };
        }
      }

      return null;
    });

    if (fileData && fileData.url) {
      attachmentUrl = resolveUrl(detailUrl, fileData.url);
      attachmentFilename = fileData.filename;
      console.log(`     📎 첨부파일 발견: ${attachmentFilename || 'unknown'}`);
    }

    // 본문 내부 실제 이미지 판별
    console.log(`     🖼️ 본문 이미지 확인 중...`);
    const hasContentImages = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const realImages = Array.from(images).filter(img => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        const src = img.src || '';
        // 아이콘이나 로고 제외
        const isIcon = src.includes('icon') || src.includes('logo') || src.includes('btn') || src.includes('bullet');
        return width > 100 && height > 100 && !isIcon;
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
    console.log(`     지역: ${detailInfo.location || '미추출'}`);

    return {
      content: content,
      attachmentUrl: attachmentUrl,
      attachmentFilename: attachmentFilename,
      hasContentImages: hasContentImages,
      screenshot: screenshotBase64,
      organization: detailInfo.organization,
      recruitStatus: detailInfo.recruitStatus,
      location: detailInfo.location,
      contact: detailInfo.contact,
      email: detailInfo.email,
      manager: detailInfo.manager,
      deadline: detailInfo.deadline,
    };
  } catch (error) {
    console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
    return {
      content: '',
      attachmentUrl: null,
      attachmentFilename: null,
      hasContentImages: false,
      screenshot: null,
      organization: null,
      recruitStatus: null,
      location: null,
      contact: null,
      email: null,
      manager: null,
      deadline: null,
    };
  }
}

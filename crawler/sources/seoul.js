import { loadPageWithRetry, resolveUrl } from '../lib/playwright.js';
import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 서울교육일자리포털 크롤러
 * 패턴 D: 구조화된 목록 + q_rcrtSn 파라미터
 * 광역자치단체: 상세 페이지/주소에서 지역(구) 추출
 * 특징: 목록에 대부분 정보 포함 (상세 페이지 방문 최소화 가능)
 */

// 서울 자치구 목록 (지역 매핑용)
const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구'
];

// 기본 selectors - li.flex_cont가 실제 공고 목록 (2026.01 구조 변경 대응)
// 주의: 'article ul > li'는 필터 메뉴(직종별, 지역별 등)까지 포함하므로 사용 금지
const DEFAULT_SELECTORS = {
  listContainer: 'article ul',
  rows: 'li.flex_cont'
};

export async function crawlSeoul(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  // selectors 기본값 설정
  const selectors = config.selectors || DEFAULT_SELECTORS;

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
    maxItems: 150,                // 절대 최대 수집 개수 (서울은 공고가 많음)
    maxBatches: 15,               // 최대 배치 반복 횟수
    batchDuplicateThreshold: 0.8, // 배치 내 중복률 80% 이상이면 종료
    consecutiveDuplicateLimit: 10, // 연속 10개 중복 시 즉시 중단 (3→10으로 완화)
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
    // 목록 테이블 행 가져오기
    const rows = await page.$$(selectors.rows);

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
        const currentRows = await page.$$(selectors.rows);
        if (i >= currentRows.length) {
          console.warn(`  ⚠️  행 ${i + 1} 찾을 수 없음`);
          continue;
        }

        const row = currentRows[i];

        console.log(`\n  🔍 행 ${i + 1} 처리 중...`);

        // 목록에서 구조화된 정보 추출 (서울 포털 특화 - 카드 기반 레이아웃)
        const listData = await row.evaluate((el) => {
          // 1. 상단 정보: 학교명 | 연락처 | 등록일 | 조회수
          const sTitle = el.querySelector('.s_title')?.textContent?.trim() || '';
          const sTitleParts = sTitle.split('|').map(s => s.trim());
          const organization = sTitleParts[0] || '';
          const contact = sTitleParts[1] || '';
          // 등록일 추출: "등록일 : 2025-12-24" 형태
          const dateMatch = sTitle.match(/등록일\s*:\s*(\d{4}-\d{2}-\d{2})/);
          const registrationDate = dateMatch ? dateMatch[1] : '';

          // 2. 제목 및 링크 추출
          const titleLink = el.querySelector('.list_title a');
          const title = titleLink?.textContent?.trim() || '';
          const href = titleLink?.getAttribute('href') || '';

          // q_rcrtSn 추출
          const match = href.match(/q_rcrtSn=(\d+)/);
          const rcrtSn = match ? match[1] : null;

          // 3. 태그 영역에서 구조화된 정보 추출
          // .list_tag 안에 .tag_title + span 쌍으로 데이터가 있음
          const tagData = {};
          const tagDivs = el.querySelectorAll('.list_tag');

          tagDivs.forEach(tagDiv => {
            const tagTitles = tagDiv.querySelectorAll('.tag_title');
            tagTitles.forEach(tagTitle => {
              const label = tagTitle.textContent?.trim() || '';
              // 다음 형제 span에서 값 추출
              const valueSpan = tagTitle.nextElementSibling;
              const value = valueSpan?.textContent?.trim() || '';

              if (label.includes('과목') || label.includes('담당업무')) {
                tagData.subject = value;
              } else if (label.includes('채용인원')) {
                tagData.headcount = value;
              } else if (label.includes('보수') || label.includes('임금')) {
                tagData.salary = value;
              } else if (label.includes('모집정보')) {
                tagData.location = value; // 지역 정보 (구)
              } else if (label.includes('접수기간')) {
                tagData.applicationPeriod = value;
              } else if (label.includes('채용기간')) {
                tagData.employmentPeriod = value;
              } else if (label.includes('직무분야')) {
                tagData.jobCategory = value;
              }
            });
          });

          return {
            organization,
            contact,
            registrationDate,
            title,
            rcrtSn,
            href,
            subject: tagData.subject || '-',
            headcount: tagData.headcount || '-',
            salary: tagData.salary || '협의',
            location: tagData.location || '',
            applicationPeriod: tagData.applicationPeriod || '',
            employmentPeriod: tagData.employmentPeriod || '',
            jobCategory: tagData.jobCategory || '',
          };
        });

        console.log(`     학교: "${listData.organization}"`);
        console.log(`     제목: "${listData.title}"`);
        console.log(`     rcrtSn: "${listData.rcrtSn}"`);
        console.log(`     지역(목록): "${listData.location}"`);
        console.log(`     등록일: "${listData.registrationDate}"`);
        console.log(`     접수기간: "${listData.applicationPeriod}"`);

        // 필수 필드 검증
        if (!listData.title || !listData.rcrtSn) {
          console.warn(`  ⚠️  행 ${i + 1} 필수 필드 누락`);
          continue;
        }

        // 상세 페이지 URL 생성
        const absoluteLink = config.detailUrlTemplate + listData.rcrtSn;

        // 중복 체크 (크롤러 단계에서 수행)
        const existing = await getExistingJobBySource(absoluteLink);

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
        console.log(`     상세 페이지 접속 중...`);

        // 상세 페이지 크롤링 (추가 정보 + 스크린샷)
        const detailData = await crawlDetailPage(page, absoluteLink, config);

        // 지역 추출: 목록에서 먼저 시도 → 상세 페이지 주소에서 구 파싱
        // 규칙1: 광역자치단체(서울) + 기초자치단체(강남 등) 둘 다 저장
        // 규칙2: 구 접미사 제거 (예: 강남구 → 강남)
        // 규칙2 예외: 중구, 동구, 남구, 서구, 북구 등 '구' 자체가 이름인 경우 유지
        const rawDistrict = listData.location || detailData.location || extractDistrictFromAddress(detailData.address);
        const EXCEPTION_DISTRICTS = ['중구', '동구', '남구', '서구', '북구'];
        const basicLocation = rawDistrict
          ? (EXCEPTION_DISTRICTS.includes(rawDistrict) ? rawDistrict : rawDistrict.replace(/구$/, ''))
          : '서울';
        const metropolitanLocation = '서울';

        // 마감일 파싱 (접수기간에서 추출)
        const deadline = parseDeadline(listData.applicationPeriod);

        jobs.push({
          title: listData.title,
          date: listData.registrationDate || '', // 목록에서 등록일 추출
          link: absoluteLink,
          organization: listData.organization,
          subject: listData.subject,
          headcount: listData.headcount,
          jobField: listData.jobCategory,
          location: basicLocation,                    // 기초자치단체 (구 접미사 제거)
          metropolitanLocation: metropolitanLocation, // 광역자치단체
          compensation: listData.salary,
          applicationPeriod: listData.applicationPeriod,
          employmentPeriod: listData.employmentPeriod,
          deadline: deadline,
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          hasContentImages: detailData.hasContentImages,
          screenshotBase64: detailData.screenshot,
          // 상세 페이지에서 추가로 얻은 정보
          workTime: detailData.workTime,
          contact: listData.contact || detailData.contact, // 목록의 연락처 우선
          address: detailData.address,
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
 * 주소에서 서울 자치구 추출
 */
function extractDistrictFromAddress(address) {
  if (!address) return null;

  for (const district of SEOUL_DISTRICTS) {
    if (address.includes(district)) {
      return district;
    }
  }
  return null;
}

/**
 * 접수기간에서 마감일 추출
 * 예: "2025.12.24 16:00 ~ 2025.12.28 23:59" → "2025.12.28"
 */
function parseDeadline(applicationPeriod) {
  if (!applicationPeriod) return null;

  // "~" 이후의 날짜 추출
  const parts = applicationPeriod.split('~');
  if (parts.length < 2) return null;

  const endPart = parts[1].trim();
  // YYYY.MM.DD 패턴 추출
  const match = endPart.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return null;
}

/**
 * 상세 페이지 크롤링 (추가 정보 + 스크린샷)
 */
async function crawlDetailPage(page, detailUrl, config) {
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // 상세 정보 추출
    const detailInfo = await page.evaluate((districts) => {
      const result = {
        location: null,
        address: null,
        workTime: null,
        contact: null,
        submissionMethod: null,
      };

      // 채용조건, 근무조건, 상세요강 섹션에서 정보 추출
      const sections = document.querySelectorAll('.detail-section, .info-section, dl, table');

      for (const section of sections) {
        const text = section.textContent || '';

        // 주소/근무지역 추출
        if (text.includes('근무지역') || text.includes('주소') || text.includes('소재지')) {
          // 카카오맵 또는 주소 필드 찾기
          const addressEl = section.querySelector('[class*="addr"], .address, dd');
          if (addressEl) {
            result.address = addressEl.textContent?.trim();
          }

          // 자치구 추출
          for (const district of districts) {
            if (text.includes(district)) {
              result.location = district;
              break;
            }
          }
        }

        // 근무시간 추출
        if (text.includes('근무시간') || text.includes('시간')) {
          const match = text.match(/(\d{1,2}:\d{2})\s*[~-]\s*(\d{1,2}:\d{2})/);
          if (match) {
            result.workTime = `${match[1]} ~ ${match[2]}`;
          }
        }

        // 담당자 연락처 추출
        if (text.includes('연락처') || text.includes('담당자') || text.includes('전화')) {
          const phoneMatch = text.match(/(\d{2,4}[-.\s]?\d{3,4}[-.\s]?\d{4})/);
          if (phoneMatch) {
            result.contact = phoneMatch[1].replace(/[-.\s]/g, '-');
          }
        }
      }

      return result;
    }, SEOUL_DISTRICTS);

    // 본문 내용 추출
    const content = await page.evaluate(() => {
      // 상세요강 또는 본문 영역 찾기
      const contentSelectors = [
        '.detail-content',
        '.view-content',
        '.content',
        '.spec-content',
        '#content',
        'article',
      ];

      for (const selector of contentSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          let text = element.innerText.trim();
          text = text
            .replace(/\n{3,}/g, '\n\n')
            .trim();
          return text;
        }
      }

      // fallback: 전체 페이지
      return document.body.innerText.substring(0, 5000);
    });

    // 첨부파일 추출
    let attachmentUrl = null;
    let attachmentFilename = null;

    const fileData = await page.evaluate(() => {
      // 첨부파일 영역 찾기
      const fileArea = document.querySelector('.file-area, .attach, [class*="file"]');

      if (fileArea) {
        const links = fileArea.querySelectorAll('a');
        for (const link of links) {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();

          if (href && !href.startsWith('javascript:') && href !== '#') {
            // 파일 확장자 확인
            if (href.match(/\.(hwp|hwpx|pdf|doc|docx)$/i) || text?.match(/\.(hwp|hwpx|pdf|doc|docx)$/i)) {
              return { url: href, filename: text };
            }
          }
        }
      }

      // 일반 다운로드 링크 검색
      const allLinks = document.querySelectorAll('a[download], a[href*="download"]');
      for (const link of allLinks) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('javascript:')) {
          return { url: href, filename: link.textContent?.trim() };
        }
      }

      return null;
    });

    if (fileData?.url) {
      attachmentUrl = resolveUrl(detailUrl, fileData.url);
      attachmentFilename = fileData.filename;
    }

    // 본문 이미지 확인
    const hasContentImages = await page.evaluate(() => {
      const contentArea = document.querySelector('.content, .view-content, article') || document.body;
      const images = contentArea.querySelectorAll('img');
      const realImages = Array.from(images).filter(img => {
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;
        return width > 100 && height > 100;
      });
      return realImages.length > 0;
    });

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
    console.log(`     주소: ${detailInfo.address || '미추출'}`);

    return {
      content: content,
      attachmentUrl: attachmentUrl,
      attachmentFilename: attachmentFilename,
      hasContentImages: hasContentImages,
      screenshot: screenshotBase64,
      location: detailInfo.location,
      address: detailInfo.address,
      workTime: detailInfo.workTime,
      contact: detailInfo.contact,
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
      address: null,
      workTime: null,
      contact: null,
    };
  }
}

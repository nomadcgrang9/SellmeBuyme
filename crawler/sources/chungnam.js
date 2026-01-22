import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 충청남도교육청 크롤러
 * URL 패턴: boardCnts/list.do / boardCnts/view.do
 *
 * 게시판 URL: https://www.cne.go.kr/boardCnts/list.do?boardID=642&m=020201&s=cne
 *
 * 충남 교육청 채용공고 카테고리:
 * - 초등 특기적성 강사 채용 (boardID=642)
 * - 초등 방과후 학교 교사 채용 (boardID=643)
 * - 중등 특기적성 강사 채용 (boardID=646)
 * - 중등 방과후학교 교사 채용 (boardID=645)
 * - 교육공무직원 채용 (boardID=704)
 * - 수준별 이동수업 강사 채용 (boardID=647)
 * - 사립학교 기타 채용 공고 (boardID=914)
 */

// 충남 카테고리별 게시판 정보
const CHUNGNAM_CATEGORIES = [
  { boardID: '642', name: '초등 특기적성 강사 채용' },
  { boardID: '643', name: '초등 방과후 학교 교사 채용' },
  { boardID: '646', name: '중등 특기적성 강사 채용' },
  { boardID: '645', name: '중등 방과후학교 교사 채용' },
  { boardID: '704', name: '교육공무직원 채용' },
  { boardID: '647', name: '수준별 이동수업 강사 채용' },
  { boardID: '914', name: '사립학교 기타 채용 공고' },
];

// 충남 시/군 목록 (지역 매핑용)
const CHUNGNAM_REGIONS = [
  '천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시',
  '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'
];

/**
 * 텍스트에서 충남 시/군 추출
 */
function extractRegionFromText(text) {
  if (!text) return null;

  for (const region of CHUNGNAM_REGIONS) {
    if (text.includes(region)) {
      return region;
    }
  }
  return null;
}

/**
 * 충청남도교육청 크롤러 메인 함수
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 모든 카테고리 게시판 순회 (각 카테고리 1페이지씩)
 * - 중복된 것만 제외 (source_url 기준)
 */
export async function crawlChungnam(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  const allJobs = [];
  let totalSkippedCount = 0;

  console.log(`📂 크롤링 대상 카테고리: ${CHUNGNAM_CATEGORIES.length}개\n`);

  // 모든 카테고리 게시판 순회
  for (const category of CHUNGNAM_CATEGORIES) {
    const categoryUrl = `https://www.cne.go.kr/boardCnts/list.do?boardID=${category.boardID}&m=020201&s=cne`;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📂 [${category.name}] 카테고리 크롤링`);
    console.log(`   URL: ${categoryUrl}`);

    try {
      const { jobs, skippedCount } = await crawlCategoryPage(page, categoryUrl, category, config);
      allJobs.push(...jobs);
      totalSkippedCount += skippedCount;

      console.log(`   ✅ ${category.name}: ${jobs.length}개 수집`);
    } catch (error) {
      console.error(`   ❌ ${category.name} 크롤링 실패: ${error.message}`);
    }

    // 카테고리 간 대기
    await page.waitForTimeout(500);
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`✅ ${config.name} 전체 크롤링 완료`);
  console.log(`   - 총 카테고리: ${CHUNGNAM_CATEGORIES.length}개`);
  console.log(`   - 신규: ${allJobs.length}개`);
  console.log(`   - 중복 스킵: ${totalSkippedCount}개`);
  console.log(`   - 총 처리: ${allJobs.length + totalSkippedCount}개\n`);

  return allJobs;
}

/**
 * 개별 카테고리 페이지 크롤링
 */
async function crawlCategoryPage(page, categoryUrl, category, config) {
  const jobs = [];
  let skippedCount = 0;

  try {
    // 1. 목록 페이지 로드
    await page.goto(categoryUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // 2. 게시글 목록 추출
    const jobListData = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row, index) => {
        try {
          const cells = row.querySelectorAll('td');
          // if (cells.length < 5) return; // 충남은 테이블마다 컬럼 수가 다를 수 있음

          // 번호 (공지사항 체크)
          const numText = cells[0]?.textContent?.trim() || '';
          const isNotice = numText === '공지' || numText === '';

          // 분류/지역은 컬럼 위치가 가변적일 수 있음. 일단 대략적인 위치나 텍스트로 추정
          // 보통 제목은 class="ta_l" 또는 "subject" 또는 <a> 태그가 있는 곳
          let titleCell = null;
          let categoryText = '';
          let location = '';

          // 제목 컬럼 찾기
          for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            if (cell.classList.contains('ta_l') || cell.classList.contains('subject') || cell.classList.contains('title')) {
              titleCell = cell;

              // 제목 앞의 컬럼들을 지역/분류로 추정
              if (i > 1) location = cells[i - 1]?.textContent?.trim();
              if (i > 2) categoryText = cells[i - 2]?.textContent?.trim();
              break;
            }
            // 클래스가 없으면 <a> 태그가 있고 텍스트가 긴 것을 제목으로 간주
            if (!titleCell && cell.querySelector('a') && cell.textContent.trim().length > 5) {
              titleCell = cell;
            }
          }

          // 못 찾았으면 고정 인덱스 시도 (기존 로직)
          if (!titleCell && cells.length >= 4) {
            titleCell = cells[3];
            categoryText = cells[1]?.textContent?.trim();
            location = cells[2]?.textContent?.trim();
          }

          if (!titleCell) return;

          const titleLink = titleCell.querySelector('a');
          if (!titleLink) return;

          // 파라미터 추출
          let boardId, boardSeq, lev, statusYN, currPage;

          // 1. onclick (goView) 시도
          const onclick = titleLink.getAttribute('onclick') || '';
          const match = onclick.match(/goView\s*\(\s*['"]?(\d+)['"]?,\s*['"]?(\d+)['"]?,\s*['"]?([^'"]*)['"]?,\s*['"]?([^'"]*)['"]?,\s*['"]?([^'"]*)['"]?,\s*['"]?([^'"]*)['"]?/);

          if (match) {
            boardId = match[1];
            boardSeq = match[2];
            lev = match[3];
            statusYN = match[5];
            currPage = match[6];
          } else {
            // 2. href에서 추출 시도
            const href = titleLink.getAttribute('href') || '';
            const hrefMatch = href.match(/[?&]boardID=(\d+)&boardSeq=(\d+)/);
            if (hrefMatch) {
              boardId = hrefMatch[1];
              boardSeq = hrefMatch[2];
              // 나머지는 기본값
              lev = '0';
              statusYN = 'W';
              currPage = '1';
            } else {
              return; // ID를 못 찾으면 상세 페이지를 못 만드므로 스킵
            }
          }

          // 학교명 (cells[3])
          let schoolName = titleLink.textContent?.trim() || '';
          // 새글 태그 제거
          schoolName = schoolName.replace(/새글\s*N?\s*/g, '').replace(/\s+/g, ' ').trim();
          if (!schoolName) return;

          // 제목 생성: "[과목/분류] 학교명" 형태로 조합
          const title = categoryText ? `[${categoryText}] ${schoolName}` : schoolName;

          // 등록일 (5번째 컬럼)
          const registeredDate = cells[4]?.textContent?.trim() || '';

          // 마감일 (6번째 컬럼)
          const deadline = cells[5]?.textContent?.trim() || '';

          // 조회수 (7번째 컬럼)
          const viewCount = cells[6]?.textContent?.trim() || '';

          results.push({
            boardId,
            boardSeq,
            lev,
            statusYN,
            currPage,
            title,
            category: categoryText,
            location,
            registeredDate,
            deadline,
            viewCount,
            isNotice,
            rowIndex: index
          });
        } catch (e) {
          // 개별 행 오류 무시
        }
      });

      return results;
    });

    if (jobListData.length === 0) {
      return { jobs: [], skippedCount: 0 };
    }

    // 3. 각 공고 상세 페이지 크롤링 (중복만 제외)
    const SAFETY = {
      maxItems: 50, // 카테고리당 최대 50개
    };

    let processedCount = 0;

    for (const listInfo of jobListData) {
      // 안전장치: 최대 개수
      if (processedCount >= SAFETY.maxItems) {
        break;
      }

      // 상세 URL 생성
      const detailUrl = `https://www.cne.go.kr/boardCnts/view.do?boardID=${listInfo.boardId}&boardSeq=${listInfo.boardSeq}&lev=${listInfo.lev}&searchType=null&statusYN=${listInfo.statusYN}&page=${listInfo.currPage}&s=cne&m=020201&opType=N`;

      // 중복 체크 (source_url 기준)
      const existing = await getExistingJobBySource(detailUrl);

      if (existing) {
        skippedCount++;
        continue;
      }

      processedCount++;

      console.log(`   🔍 [${category.name}] ${listInfo.title.substring(0, 40)}...`);

      try {
        // 상세 페이지 크롤링
        const detailData = await crawlDetailPage(page, detailUrl, categoryUrl);

        // 지역 결정
        const location = listInfo.location ||
          detailData.location ||
          extractRegionFromText(detailData.organization) ||
          extractRegionFromText(detailData.content) ||
          config.region || '충청남도';

        const jobData = {
          title: listInfo.title,
          date: listInfo.registeredDate || new Date().toISOString().split('T')[0],
          link: detailUrl,
          location: location,
          category: category.name, // 카테고리명 사용
          organization: detailData.organization,
          deadline: listInfo.deadline || detailData.deadline,
          viewCount: listInfo.viewCount,
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          attachments: detailData.attachments,
          hasContentImages: detailData.hasContentImages,
          screenshotBase64: detailData.screenshot,
          contact: detailData.contact,
        };

        jobs.push(jobData);

        // 다음 공고 전 대기
        await page.waitForTimeout(800);

      } catch (error) {
        console.error(`      ❌ 상세 페이지 실패: ${error.message}`);
        continue;
      }
    }

  } catch (error) {
    throw error;
  }

  return { jobs, skippedCount };
}

/**
 * 상세 페이지 크롤링
 */
async function crawlDetailPage(page, detailUrl, baseUrl) {
  try {
    console.log(`     상세 페이지 접속: ${detailUrl}`);
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // 상세 정보 추출
    const detailInfo = await page.evaluate((regions) => {
      const result = {
        organization: null,
        location: null,
        contact: null,
        deadline: null,
      };

      // 테이블 형태 (th/td)에서 정보 추출
      const infoRows = document.querySelectorAll('table tr, .view_info tr, dl');
      infoRows.forEach(row => {
        const th = row.querySelector('th, dt');
        const td = row.querySelector('td, dd');
        if (!th || !td) return;

        const label = th.textContent?.trim() || '';
        const value = td.textContent?.trim() || '';

        if (label.includes('기관') || label.includes('학교') || label.includes('작성자')) {
          result.organization = value;
          for (const region of regions) {
            if (value.includes(region)) {
              result.location = region;
              break;
            }
          }
        } else if (label.includes('전화') || label.includes('연락처')) {
          result.contact = value;
        } else if (label.includes('마감')) {
          result.deadline = value;
        }
      });

      return result;
    }, CHUNGNAM_REGIONS);

    // 본문 내용 추출
    const content = await page.evaluate(() => {
      // 불필요한 요소 제거
      const removeSelectors = [
        'header', 'footer', 'nav', '.header', '.footer', '.gnb', '.lnb',
        '.breadcrumb', '.btn-area', '.skip-nav', '.sidebar', '.navigation',
        '.btn_wrap', '.btn_area'
      ];

      removeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });

      // 본문 선택자 우선순위
      const contentSelectors = [
        '.view_con',
        '.board_view',
        '.view-content',
        '.content_view',
        '.bbs_content',
        '#contents',
        '.content',
        'article',
        'main'
      ];

      for (const selector of contentSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          let text = elem.innerText.trim();
          text = text
            .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim();

          if (text.length > 50) {
            return text;
          }
        }
      }

      return document.body.innerText.substring(0, 5000).trim();
    });

    // 첨부파일 추출
    const attachments = await page.evaluate((baseUrlStr) => {
      const results = [];

      // 여러 패턴의 첨부파일 링크 찾기
      const fileSelectors = [
        'a[href*="FileDown"]',
        'a[href*="fileDown"]',
        'a[href*="download"]',
        'a[onclick*="FileDown"]',
        'a[onclick*="fileDown"]',
        '.file_list a',
        '.attach_file a',
        '.file_down a'
      ];

      fileSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(link => {
          let url = link.getAttribute('href') || '';
          const onclick = link.getAttribute('onclick') || '';
          const filename = link.textContent?.trim() || '';

          // onclick에서 URL 추출 시도
          if (url === '#' || url === 'javascript:;' || !url || url.startsWith('javascript:')) {
            // fn_egov_downFile 패턴: fn_egov_downFile('/cmm/fms/FileDown.do','...')
            const downFileMatch = onclick.match(/fn_egov_downFile\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
            if (downFileMatch) {
              url = `${downFileMatch[1]}?atchFileId=${downFileMatch[2]}`;
            }

            // 일반 FileDown 패턴
            const fileDownMatch = onclick.match(/FileDown\.do[^'"]*['"]?([^'"]*)/);
            if (fileDownMatch && !url) {
              url = onclick.match(/['"]([^'"]*FileDown[^'"]*)['"]/)?.[1] || '';
            }
          }

          if (url && url !== '#' && !url.startsWith('javascript:')) {
            // 상대경로를 절대경로로 변환
            if (!url.startsWith('http')) {
              const base = new URL(baseUrlStr);
              url = url.startsWith('/') ? `${base.origin}${url}` : `${base.origin}/${url}`;
            }

            // 중복 제거
            if (!results.find(r => r.url === url)) {
              results.push({
                url: url,
                name: filename || '첨부파일'
              });
            }
          }
        });
      });

      return results;
    }, baseUrl);

    // 본문 이미지 확인
    const hasContentImages = await page.evaluate(() => {
      const contentSelectors = ['.board_view', '.view_con', '.content', 'article'];
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
        const isIcon = src.includes('icon') || src.includes('logo') || src.includes('btn');
        return width > 100 && height > 100 && !isIcon;
      });

      return realImages.length > 0;
    });

    // 스크린샷 캡처
    console.log(`     📸 스크린샷 캡처 중...`);
    const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
    const screenshotBase64 = screenshot.toString('base64');

    console.log(`     본문 길이: ${content.length}자`);
    console.log(`     첨부파일: ${attachments.length}건`);
    console.log(`     스크린샷: ${(screenshotBase64.length / 1024).toFixed(0)}KB`);

    return {
      content,
      attachmentUrl: attachments.length > 0 ? attachments[0].url : null,
      attachmentFilename: attachments.length > 0 ? attachments[0].name : null,
      attachments,
      hasContentImages,
      screenshot: screenshotBase64,
      organization: detailInfo.organization,
      location: detailInfo.location,
      contact: detailInfo.contact,
      deadline: detailInfo.deadline,
    };

  } catch (error) {
    console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
    return {
      content: '',
      attachmentUrl: null,
      attachmentFilename: null,
      attachments: [],
      hasContentImages: false,
      screenshot: null,
      organization: null,
      location: null,
      contact: null,
      deadline: null,
    };
  }
}

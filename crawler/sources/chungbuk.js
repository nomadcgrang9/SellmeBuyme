import { getExistingJobBySource } from '../lib/supabase.js';

/**
 * 충청북도교육청 크롤러
 * URL 패턴: selectNttList.do / selectNttInfo.do (ntt 패턴)
 *
 * 게시판 URL: https://www.cbe.go.kr/cbe/na/ntt/selectNttList.do?mi=11716&bbsId=1798
 */

// 충북 시/군 목록 (지역 매핑용)
const CHUNGBUK_REGIONS = [
  '청주시', '충주시', '제천시', '보은군', '옥천군',
  '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'
];

/**
 * 텍스트에서 충북 시/군 추출
 */
function extractRegionFromText(text) {
  if (!text) return null;

  for (const region of CHUNGBUK_REGIONS) {
    if (text.includes(region)) {
      return region;
    }
  }
  return null;
}

/**
 * 충청북도교육청 크롤러 메인 함수
 *
 * 규칙: 게시판 1페이지(최신 페이지)만 크롤링
 * - 중복된 것만 제외 (source_url 기준)
 */
export async function crawlChungbuk(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);

  const jobs = [];
  let skippedCount = 0;

  try {
    // 1. 목록 페이지 로드
    console.log(`🌐 목록 페이지 접속: ${config.baseUrl}`);
    await page.goto(config.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);

    // 2. 게시글 목록 추출
    console.log('📋 게시글 목록 추출 중...');

    const jobListData = await page.evaluate(() => {
      const results = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row, index) => {
        try {
          // 공지사항 행 스킵
          if (row.classList.contains('notice') || row.classList.contains('noti')) {
            return;
          }

          const cells = row.querySelectorAll('td');
          if (cells.length < 4) return;

          // 번호 (공지사항 체크)
          const numText = cells[0]?.textContent?.trim() || '';
          const isNotice = numText === '공지' || numText === '';

          // 제목 링크 찾기 (nttInfoBtn 클래스 또는 data-id 속성)
          const titleLink = row.querySelector('a.nttInfoBtn, a[data-id], td.ta_l a, td a');
          if (!titleLink) return;

          // data-id 추출
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

          let title = titleLink.textContent?.trim() || '';
          // "새글 N" 태그 제거
          title = title.replace(/새글\s*N?\s*/g, '').replace(/\s+/g, ' ').trim();
          if (!title) return;

          // 날짜 추출 (여러 위치 시도)
          let dateText = '';
          for (let i = 3; i < cells.length; i++) {
            const text = cells[i]?.textContent?.trim() || '';
            // 날짜 형식 확인 (YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD)
            if (/\d{4}[-./]\d{2}[-./]\d{2}/.test(text)) {
              dateText = text;
              break;
            }
          }

          // 마감일 추출
          let deadlineText = '';
          for (let i = 3; i < cells.length; i++) {
            const text = cells[i]?.textContent?.trim() || '';
            if (text.includes('/') && text !== dateText) {
              deadlineText = text;
            }
          }

          // 첨부파일 여부 확인
          const hasAttachment = !!row.querySelector('a[href*="download"], .file-icon, img[alt*="파일"], .ico_file, .listFileDown');

          results.push({
            nttId: dataId,
            title,
            registeredDate: dateText,
            deadline: deadlineText,
            hasAttachment,
            isNotice,
            rowIndex: index
          });
        } catch (e) {
          console.error(`행 ${index} 처리 오류:`, e.message);
        }
      });

      return results;
    });

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

    // 3. 각 공고 상세 페이지 크롤링 (중복만 제외)
    const SAFETY = {
      maxItems: 100,
    };

    let processedCount = 0;

    for (const listInfo of jobListData) {
      // 안전장치: 최대 개수
      if (processedCount >= SAFETY.maxItems) {
        console.log(`  ⚠️ 최대 수집 개수(${SAFETY.maxItems}) 도달`);
        break;
      }

      const nttId = listInfo.nttId;
      const detailUrl = `${config.detailUrlTemplate}${nttId}`;

      // 중복 체크 (source_url 기준)
      const existing = await getExistingJobBySource(detailUrl);

      if (existing) {
        skippedCount++;
        consecutiveDuplicates++;

        // 연속 중복 한계 도달 시 종료
        if (consecutiveDuplicates >= SAFETY.consecutiveDuplicateLimit) {
          console.log(`  ⚠️ 연속 중복 ${SAFETY.consecutiveDuplicateLimit}개 도달 - 크롤링 종료`);
          break;
        }
        continue;
      }

      // 신규 항목 발견 시 연속 중복 카운터 리셋
      consecutiveDuplicates = 0;
      processedCount++;

      console.log(`\n  🔍 신규 공고 ${processedCount} (ID: ${nttId})`);
      console.log(`     제목: ${listInfo.title}`);

      try {
        // 상세 페이지 크롤링
        const detailData = await crawlDetailPage(page, detailUrl, config);

        // 지역 추출
        const location = detailData.location ||
                        extractRegionFromText(detailData.organization) ||
                        extractRegionFromText(detailData.content) ||
                        config.region || '충청북도';

        const jobData = {
          title: listInfo.title,
          date: listInfo.registeredDate || new Date().toISOString().split('T')[0],
          link: detailUrl,
          location: location,
          organization: detailData.organization,
          deadline: listInfo.deadline || detailData.deadline,
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          attachments: detailData.attachments,
          hasContentImages: detailData.hasContentImages,
          screenshotBase64: detailData.screenshot,
          contact: detailData.contact,
          email: detailData.email,
        };

        jobs.push(jobData);
        console.log(`     ✅ 크롤링 완료 (본문 ${detailData.content?.length || 0}자)`);

        // 다음 공고 전 대기
        await page.waitForTimeout(1000);

      } catch (error) {
        console.error(`     ❌ 상세 페이지 크롤링 실패: ${error.message}`);
        continue;
      }
    }

  } catch (error) {
    console.error(`❌ 크롤링 실패: ${error.message}`);
    throw error;
  }

  console.log(`\n✅ ${config.name} 크롤링 완료`);
  console.log(`   - 신규: ${jobs.length}개`);
  console.log(`   - 중복 스킵: ${skippedCount}개`);
  console.log(`   - 총 처리: ${jobs.length + skippedCount}개\n`);

  return jobs;
}

/**
 * 상세 페이지 크롤링
 */
async function crawlDetailPage(page, detailUrl, config) {
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
        email: null,
        deadline: null,
      };

      // dt/dd 패턴에서 정보 추출
      const terms = document.querySelectorAll('dt, .info_tit, th');
      terms.forEach(term => {
        const label = term.textContent?.trim() || '';
        const dd = term.nextElementSibling;
        const value = dd?.textContent?.trim() || '';

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
        } else if (label.includes('이메일') || label.includes('E-mail')) {
          result.email = value;
        } else if (label.includes('마감')) {
          result.deadline = value;
        }
      });

      // 테이블 형태에서도 시도
      const infoRows = document.querySelectorAll('table tr');
      infoRows.forEach(row => {
        const th = row.querySelector('th');
        const td = row.querySelector('td');
        if (!th || !td) return;

        const label = th.textContent?.trim() || '';
        const value = td.textContent?.trim() || '';

        if (label.includes('기관') || label.includes('학교') || label.includes('작성자')) {
          result.organization = value;
        } else if (label.includes('전화') || label.includes('연락처')) {
          result.contact = value;
        } else if (label.includes('마감')) {
          result.deadline = value;
        }
      });

      return result;
    }, CHUNGBUK_REGIONS);

    // 본문 내용 추출
    const content = await page.evaluate(() => {
      // 불필요한 요소 제거
      const removeSelectors = [
        'header', 'footer', 'nav', '.header', '.footer', '.gnb', '.lnb',
        '.breadcrumb', '.btn-area', '.skip-nav', '.sidebar', '.navigation'
      ];

      removeSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => el.remove());
      });

      // 본문 선택자 우선순위
      const contentSelectors = [
        'td.nttCn',
        'div.nttCn',
        '.view_con',
        '.board_view',
        '.view-content',
        '.content',
        '#content',
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
    const attachments = await page.evaluate(() => {
      const results = [];

      // 다양한 첨부파일 링크 패턴 검색
      // 충북 교육청: href="javaScript:goFileDown('키값');" 패턴 사용
      const fileLinks = document.querySelectorAll('a[href*="download"], a[href*="fileDown"], a[href*="goFileDown"], a[onclick*="fileDown"], a[onclick*="goFileDown"], .file_list a, .prvw a, .atch_file a');

      fileLinks.forEach(link => {
        let url = '';
        const href = link.getAttribute('href') || '';
        const onclick = link.getAttribute('onclick') || '';
        const filename = link.textContent?.trim() || '';

        // href에서 goFileDown('키값') 패턴 처리 (충북 교육청 패턴)
        // href="javaScript:goFileDown('3f797f3a37aff78b63e2873a5cc20e73');"
        const hrefGoFileDownMatch = href.match(/goFileDown\s*\(\s*['"]([^'"]+)['"]\s*\)/i);
        if (hrefGoFileDownMatch) {
          const fileKey = hrefGoFileDownMatch[1];
          url = `/cbe/na/cmm/selectFileDown.do?fileKey=${fileKey}`;
        }

        // onclick에서 goFileDown('키값') 패턴 처리
        if (!url) {
          const onclickGoFileDownMatch = onclick.match(/goFileDown\s*\(\s*['"]([^'"]+)['"]\s*\)/);
          if (onclickGoFileDownMatch) {
            const fileKey = onclickGoFileDownMatch[1];
            url = `/cbe/na/cmm/selectFileDown.do?fileKey=${fileKey}`;
          }
        }

        // onclick에서 URL 추출 시도
        if (!url) {
          const match = onclick.match(/['"]([^'"]+\.(hwp|pdf|doc|docx|xls|xlsx|zip)[^'"]*)['"]/i);
          if (match) {
            url = match[1];
          }
        }

        // fileKey 패턴
        if (!url) {
          const fileKeyMatch = onclick.match(/fileKey[=:]\s*['"]?(\d+)['"]?/);
          if (fileKeyMatch) {
            url = `/comm/nttFileDownload.do?fileKey=${fileKeyMatch[1]}`;
          }
        }

        // 일반 다운로드 URL
        if (!url && href && !href.startsWith('javascript:') && !href.startsWith('#')) {
          url = href;
        }

        if (url && url !== '#') {
          results.push({
            url: url,
            name: filename || '첨부파일'
          });
        }
      });

      return results;
    });

    // URL 절대경로 변환
    const baseUrl = new URL(detailUrl);
    const processedAttachments = attachments.map(att => ({
      ...att,
      url: att.url.startsWith('http') ? att.url : `${baseUrl.origin}${att.url.startsWith('/') ? '' : '/'}${att.url}`
    }));

    // 본문 이미지 확인
    const hasContentImages = await page.evaluate(() => {
      const contentSelectors = ['.board_view', '.nttCn', '.content', '.view_con', 'article'];
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
    console.log(`     첨부파일: ${processedAttachments.length}건`);
    console.log(`     스크린샷: ${(screenshotBase64.length / 1024).toFixed(0)}KB`);

    return {
      content,
      attachmentUrl: processedAttachments.length > 0 ? processedAttachments[0].url : null,
      attachmentFilename: processedAttachments.length > 0 ? processedAttachments[0].name : null,
      attachments: processedAttachments,
      hasContentImages,
      screenshot: screenshotBase64,
      organization: detailInfo.organization,
      location: detailInfo.location,
      contact: detailInfo.contact,
      email: detailInfo.email,
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
      email: null,
      deadline: null,
    };
  }
}

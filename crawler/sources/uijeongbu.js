import { loadPage, getTextBySelectors, getAttributeBySelectors, resolveUrl } from '../lib/playwright.js';

/**
 * 의정부교육지원청 크롤러
 */
export async function crawlUijeongbu(page, config) {
  console.log(`\n📍 ${config.name} 크롤링 시작`);
  
  async function captureDebugSnapshot(page, reason) {
    try {
      const screenshotPath = `debug-uijeongbu-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => null);
      const htmlSnippet = await page.content().catch(() => null);
      console.warn(`[debug] ${reason} | screenshot: ${screenshotPath}`, {
        snippet: htmlSnippet ? htmlSnippet.substring(0, 5000) : null,
      });
    } catch (snapshotError) {
      console.warn(`[debug] 스냅샷 캡처 실패: ${snapshotError.message}`);
    }
  }

  function waitSelectorsForRows(rows) {
    if (!rows || rows.length === 0) {
      return 'table.board-list tbody tr';
    }
    return rows.join(', ');
  }

  const fallbackSelectors = {
    listContainer: [
      config.selectors.listContainer,
      'table.board-list',
      '.board_list',
      '.tbl_list',
      '.board-list-wrap',
      '.board-table'
    ].filter(Boolean),
    rows: [
      config.selectors.rows,
      'table.board-list tbody tr',
      '.board_list tbody tr',
      '.tbl_list tbody tr',
      '.board-list-wrap tbody tr',
      '.board-table tbody tr'
    ].filter(Boolean),
  };

  const waitSelectors = fallbackSelectors.listContainer.join(', ');

  // 1. 목록 페이지 로딩
  await loadPage(page, config.baseUrl, waitSelectors);
  
  // 2. 페이지 구조 분석 (디버깅용)
  const pageTitle = await page.title();
  console.log(`📄 페이지 제목: ${pageTitle}`);
  
  // 3. 공고 목록 추출
  const jobs = [];
  
  try {
    // 여러 선택자 시도
    const rows = await page.$$(waitSelectorsForRows(fallbackSelectors.rows));
    
    if (rows.length === 0) {
      console.warn('⚠️  공고 목록을 찾을 수 없습니다. HTML 구조 확인 필요');

      // 디버깅: 페이지 HTML 일부 출력
      const bodyText = await page.evaluate(() => document.body.innerText.substring(0, 500)).catch(() => '미확인');
      console.log('페이지 내용 샘플:', bodyText);
      await captureDebugSnapshot(page, '목록 선택자 미검출');

      return [];
    }
    
    console.log(`📋 발견된 공고 수: ${rows.length}개`);
    
    // 4. 각 행에서 데이터 추출 (config.crawlBatchSize 또는 기본값 10개)
    const batchSize = config.crawlBatchSize || 10;
    const maxRows = Math.min(rows.length, batchSize);
    for (let i = 0; i < maxRows; i++) {
      try {
        // 매번 새로 rows를 가져와서 stale element 방지
        const currentRows = await page.$$(waitSelectorsForRows(fallbackSelectors.rows));
        if (i >= currentRows.length) {
          console.warn(`  ⚠️  행 ${i + 1} 찾을 수 없음`);
          await captureDebugSnapshot(page, `목록 행 ${i + 1} 미검출`);
          continue;
        }
        
        const row = currentRows[i];
        
        console.log(`\n  🔍 행 ${i + 1} 디버깅:`);
        
        const title = await getTextBySelectors(row, config.selectors.title);
        console.log(`     title: "${title}" (길이: ${title ? title.length : 0})`);
        
        const date = await getTextBySelectors(row, config.selectors.date);
        console.log(`     date: "${date}"`);
        
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
        
        console.log(`  📄 ${i + 1}. ${title}`);
        console.log(`     상세 페이지 접속 중...`);
        
        // 상세 페이지 크롤링 (텍스트 + 스크린샷)
        const detailData = await crawlDetailPage(page, absoluteLink, config).catch(async (detailError) => {
          console.warn(`  ⚠️  상세 페이지 로드 실패: ${detailError.message}`);
          await captureDebugSnapshot(page, `상세 페이지 실패 (${absoluteLink})`);
          throw detailError;
        });
        
        jobs.push({
          title: title,
          date: date || '날짜 없음',
          link: absoluteLink,
          detailContent: detailData.content,
          attachmentUrl: detailData.attachmentUrl,
          attachmentFilename: detailData.attachmentFilename,
          hasContentImages: detailData.hasContentImages,
          screenshotBase64: detailData.screenshot, // 스크린샷 추가
        });
        
        console.log(`  ✅ ${i + 1}. 완료`);
        
        // 목록 페이지로 돌아가기
        if (i < maxRows - 1) { // 마지막 행이 아니면
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
  
  console.log(`✅ ${config.name} 크롤링 완료: ${jobs.length}개 수집\n`);
  return jobs;
}

/**
 * 상세 페이지 크롤링 (본문 + 첨부파일 + 스크린샷)
 */
async function crawlDetailPage(page, detailUrl, config) {
  try {
    await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2000);
    
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
            .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵|알림마당|과목\/기관|검색|구인|구직/g, '')
            .replace(/\n{3,}/g, '\n\n')  // 과도한 줄바꿈 제거
            .trim();
          
          return text;
        }
      }
      
      // 선택자로 못 찾으면 body 전체
      let text = document.body.innerText.substring(0, 5000);
      text = text
        .replace(/본문으로 바로가기|메인메뉴 바로가기|통합검색|로그인|사이트맵|알림마당|과목\/기관|검색|구인|구직/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      return text;
    });
    
    // HWP 첨부파일 링크 추출
    const selectorCandidates = (config.selectors?.attachment ?? '')
      .split(',')
      .map((selector) => selector.trim())
      .filter((selector) => selector.length > 0);
    let attachmentUrl = null;
    for (const selector of selectorCandidates) {
      attachmentUrl = await page.evaluate((sel) => {
        const element = document.querySelector(sel);
        if (!element) {
          return null;
        }
        const href = element.getAttribute('href') || element.getAttribute('data-href') || element.getAttribute('data-file') || element.href;
        if (!href) {
          return null;
        }
        const trimmed = href.trim();
        if (!trimmed || trimmed.toLowerCase().startsWith('javascript:') || trimmed === '#') {
          return null;
        }
        return trimmed;
      }, selector);
      if (attachmentUrl) {
        break;
      }
    }
    const fileExtensions = ['.hwp', '.hwpx', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    if (!attachmentUrl) {
      for (const ext of fileExtensions) {
        attachmentUrl = await page.evaluate((extension) => {
          const lowerExtension = extension.toLowerCase();
          const links = Array.from(document.querySelectorAll('a'));
          const target = links.find((link) => {
            const hrefValue = link.getAttribute('href') || link.href || '';
            const textValue = link.textContent || '';
            return hrefValue.toLowerCase().includes(lowerExtension) || textValue.toLowerCase().includes(lowerExtension);
          });
          if (!target) {
            return null;
          }
          const href = target.getAttribute('href') || target.getAttribute('data-href') || target.getAttribute('data-file') || target.href;
          if (!href) {
            return null;
          }
          const trimmed = href.trim();
          if (!trimmed || trimmed.toLowerCase().startsWith('javascript:') || trimmed === '#') {
            return null;
          }
          return trimmed;
        }, ext);
        if (attachmentUrl) {
          break;
        }
      }
    }
    const keywordCandidates = ['첨부', '다운로드', '내려받기', '파일'];
    if (!attachmentUrl) {
      attachmentUrl = await page.evaluate((keywords) => {
        const links = Array.from(document.querySelectorAll('a, button'));
        const lowerKeywords = keywords.map((keyword) => keyword.toLowerCase());
        const target = links.find((element) => {
          const text = (element.textContent || '').toLowerCase();
          const aria = (element.getAttribute('aria-label') || '').toLowerCase();
          return lowerKeywords.some((keyword) => text.includes(keyword) || aria.includes(keyword));
        });
        if (!target) {
          return null;
        }
        const href = target.getAttribute('href') || target.getAttribute('data-href') || target.getAttribute('data-file') || target.href;
        if (!href) {
          return null;
        }
        const trimmed = href.trim();
        if (!trimmed || trimmed.toLowerCase().startsWith('javascript:') || trimmed === '#') {
          return null;
        }
        return trimmed;
      }, keywordCandidates);
    }
    let resolvedAttachmentUrl = attachmentUrl ? resolveUrl(detailUrl, attachmentUrl) : null;
    let extractedData = null;
    
    if (!resolvedAttachmentUrl) {
      console.log(`     ⏬ 동적 첨부파일 탐색 시도...`);
      
      // DOM 구조 분석 (디버깅)
      const attachmentDebug = await page.evaluate(() => {
        const results = [];
        
        // 0. 첨부파일 영역 컨테이너 찾기
        const containers = document.querySelectorAll('.atch-file-list, .file-list, .file-area, #fileList, [class*="file"], [class*="attach"]');
        containers.forEach((container) => {
          results.push({
            type: 'container',
            tag: container.tagName,
            className: container.className,
            id: container.id,
            text: container.textContent?.trim().substring(0, 100),
          });
        });
        
        // 1. 파일명이 포함된 테이블 행 검사 (더 정밀하게)
        const allRows = document.querySelectorAll('table tr, tbody tr');
        allRows.forEach((el) => {
          const text = el.textContent?.trim() || '';
          if (text.includes('.hwp') || text.includes('.pdf') || text.includes('.doc') || text.includes('KB') || text.includes('MB')) {
            results.push({
              type: 'file-row',
              tag: el.tagName,
              text: text.substring(0, 150),
              ondblclick: el.getAttribute('ondblclick'),
              onclick: el.getAttribute('onclick'),
              className: el.className,
              id: el.id,
              html: el.innerHTML.substring(0, 800),
            });
          }
        });
        
        // 2. ondblclick/onclick 속성이 있는 모든 요소 (file 관련)
        const handlers = document.querySelectorAll('[ondblclick], [onclick]');
        handlers.forEach((el) => {
          const ondbl = el.getAttribute('ondblclick');
          const onclk = el.getAttribute('onclick');
          if ((ondbl && (ondbl.includes('file') || ondbl.includes('down'))) || 
              (onclk && (onclk.includes('file') || onclk.includes('down')))) {
            results.push({
              type: 'handler',
              tag: el.tagName,
              text: el.textContent?.trim().substring(0, 100),
              ondblclick: ondbl,
              onclick: onclk,
              className: el.className,
              id: el.id,
            });
          }
        });
        
        // 3. 다운로드 버튼 찾기
        const buttons = document.querySelectorAll('button, a, input[type="button"]');
        buttons.forEach((el) => {
          const text = el.textContent?.trim() || '';
          const value = el.getAttribute('value') || '';
          if (text.includes('다운로드') || text.includes('열기') || value.includes('다운로드')) {
            results.push({
              type: 'download-button',
              tag: el.tagName,
              text: text,
              onclick: el.getAttribute('onclick'),
              className: el.className,
              id: el.id,
            });
          }
        });
        
        // 4. .prvw 영역 내부의 링크 상세 조사
        const prvwLinks = document.querySelectorAll('.prvw a, .prvw_btns a');
        prvwLinks.forEach((el) => {
          results.push({
            type: 'prvw-link',
            tag: el.tagName,
            text: el.textContent?.trim(),
            onclick: el.getAttribute('onclick'),
            href: el.getAttribute('href'),
            className: el.className,
          });
        });
        
        return results;
      });
      console.log(`     📋 첨부 관련 요소 발견 (${attachmentDebug.length}개):`, JSON.stringify(attachmentDebug, null, 2));
      
      // .prvw 링크에서 직접 URL과 파일명 추출
      extractedData = await page.evaluate(() => {
        const prvwLinks = document.querySelectorAll('.prvw a, .prvw_btns a');
        for (const link of prvwLinks) {
          const onclick = link.getAttribute('onclick');
          if (!onclick) continue;
          
          // previewAjax('URL', 'filename') 패턴 추출
          const match = onclick.match(/previewAjax\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
          if (match && match[1]) {
            return { url: match[1], filename: match[2] || null };
          }
          
          // preListen('URL', 'filename') 패턴도 시도
          const match2 = onclick.match(/preListen\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/);
          if (match2 && match2[1]) {
            return { url: match2[1], filename: match2[2] || null };
          }
          
          // URL만 있는 경우
          const matchUrlOnly = onclick.match(/previewAjax\s*\(\s*['"]([^'"]+)['"]/);
          if (matchUrlOnly && matchUrlOnly[1]) {
            return { url: matchUrlOnly[1], filename: null };
          }
        }
        return null;
      });
      
      if (extractedData?.url) {
        console.log(`     ✅ 첨부파일 URL 추출 성공: ${extractedData.url}`);
        if (extractedData.filename) {
          console.log(`     📄 파일명: ${extractedData.filename}`);
        }
        resolvedAttachmentUrl = resolveUrl(detailUrl, extractedData.url);
      }

      if (!resolvedAttachmentUrl && !extractedData) {
        console.log(`     🔍 DEXT5UPLOAD 스크립트 분석 시도...`);
        const dextScriptData = await page.evaluate(() => {
          const scripts = Array.from(document.scripts || []);
          for (const script of scripts) {
            const text = script.textContent || '';
            const match = text.match(/DEXT5UPLOAD\.AddUploadedFile\(`([^`]+)`\s*,\s*`([^`]+)`\s*,\s*`([^`]+)`\s*,\s*`([^`]+)`/);
            if (match) {
              return {
                itemKey: match[1],
                filename: match[2],
                path: match[3],
                size: match[4],
              };
            }
          }
          return null;
        });

        if (dextScriptData?.path) {
          extractedData = {
            url: dextScriptData.path,
            filename: dextScriptData.filename || null,
            size: dextScriptData.size || null,
          };
          resolvedAttachmentUrl = resolveUrl(detailUrl, dextScriptData.path);
          console.log(`     ✅ DEXT5 스크립트에서 첨부파일 추출 성공: ${dextScriptData.path}`);
          if (dextScriptData.filename) {
            console.log(`     📄 파일명: ${dextScriptData.filename}`);
          }
        } else {
          console.log(`     ⚠️ DEXT5UPLOAD.AddUploadedFile 호출을 찾을 수 없음`);
        }
      }

      if (!resolvedAttachmentUrl && !extractedData) {
        const captureResult = await captureDownloadViaEvent(page, keywordCandidates, config);
        if (captureResult?.url) {
          resolvedAttachmentUrl = resolveUrl(detailUrl, captureResult.url);
        }
        if (captureResult?.clicked && page.url() !== detailUrl) {
          try {
            await page.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.waitForTimeout(1000);
          } catch (navError) {
            console.warn(`     상세 페이지 복구 실패: ${navError.message}`);
          }
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
    console.log(`     첨부파일: ${resolvedAttachmentUrl ? '있음' : '없음'}`);
    console.log(`     스크린샷: ${(screenshotBase64.length / 1024).toFixed(0)}KB`);
    
    return {
      content: content,
      attachmentUrl: resolvedAttachmentUrl,
      attachmentFilename: extractedData?.filename || null,
      screenshot: screenshotBase64,
      hasContentImages: hasContentImages,
    };
  } catch (error) {
    console.warn(`     상세 페이지 크롤링 실패: ${error.message}`);
    return {
      content: '',
      attachmentUrl: null,
      attachmentFilename: null,
      screenshot: null,
      hasContentImages: false,
    };
  }
}

async function captureDownloadViaEvent(page, keywords, config) {
  const normalizedKeywords = keywords
    .map((keyword) => keyword.trim().toLowerCase())
    .filter((keyword) => keyword.length > 0);
  const result = { url: null, clicked: false };

  const triggerSelectors = (config.selectors?.downloadTriggers ?? '')
    .split(',')
    .map((selector) => selector.trim())
    .filter((selector) => selector.length > 0);

  for (const selector of triggerSelectors) {
    const handle = await page.$(selector);
    if (!handle) {
      continue;
    }

    result.clicked = true;
    try {
      const url = await attemptDownloadFromHandle(page, handle);
      if (url) {
        result.url = url;
        return result;
      }
    } catch (error) {
      if (!isTimeoutError(error)) {
        console.warn(`     동적 첨부파일 추출 실패 (${selector}): ${error.message}`);
      }
    } finally {
      await safeDispose(handle);
    }
  }

  if (normalizedKeywords.length === 0) {
    return result;
  }

  const matchInfo = await page.evaluate((keywordsArray) => {
    const selector = 'a, button, [role="button"]';
    const elements = Array.from(document.querySelectorAll(selector));
    for (let index = 0; index < elements.length; index += 1) {
      const element = elements[index];
      const text = (element.textContent || '').toLowerCase();
      const aria = (element.getAttribute('aria-label') || '').toLowerCase();
      if (keywordsArray.some((keyword) => text.includes(keyword) || aria.includes(keyword))) {
        return { selector, index };
      }
    }
    return null;
  }, normalizedKeywords);

  if (!matchInfo) {
    return result;
  }

  const candidates = await page.$$(matchInfo.selector);
  if (matchInfo.index >= candidates.length) {
    await Promise.all(candidates.map((handle) => safeDispose(handle)));
    return result;
  }

  const targetHandle = candidates[matchInfo.index];
  result.clicked = true;

  try {
    const url = await attemptDownloadFromHandle(page, targetHandle);
    if (url) {
      result.url = url;
    }
  } catch (error) {
    if (!isTimeoutError(error)) {
      console.warn(`     동적 첨부파일 추출 실패 (키워드 매칭): ${error.message}`);
    }
  } finally {
    await Promise.all(candidates.map((handle) => (handle === targetHandle ? Promise.resolve() : safeDispose(handle))));
  }

  return result;
}

async function attemptDownloadFromHandle(page, elementHandle) {
  const downloadPromise = page.waitForEvent('download', { timeout: 4000 });
  await elementHandle.click({ force: true });
  const download = await downloadPromise;
  return download.url();
}

function isTimeoutError(error) {
  return error?.name === 'TimeoutError' || (typeof error?.message === 'string' && error.message.includes('Timeout'));
}

async function safeDispose(handle) {
  if (!handle) {
    return;
  }
  try {
    await handle.dispose();
  } catch (error) {
    // ignore disposal errors
  }
}

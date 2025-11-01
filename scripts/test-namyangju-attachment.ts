import { chromium } from 'playwright';

async function testNamyangjuAttachment() {
  console.log('\n🔍 남양주 사이트 첨부파일 HTML 구조 분석 시작...\n');

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // 1. 목록 페이지 접속
    const listUrl = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656';
    console.log(`📍 목록 페이지 접속: ${listUrl}`);
    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // 2. 첫 번째 공고 클릭
    console.log('\n📋 첫 번째 공고 클릭...');
    const firstLink = await page.$('tbody tr td.ta_l a');
    if (!firstLink) {
      console.error('❌ 첫 번째 공고를 찾을 수 없습니다.');
      await browser.close();
      return;
    }

    const title = await firstLink.textContent();
    console.log(`   제목: ${title?.trim()}`);

    await firstLink.click();
    await page.waitForTimeout(3000);

    // 3. 상세 페이지에서 모든 링크 분석
    console.log('\n🔗 상세 페이지의 모든 <a> 태그 분석:');
    const allLinks = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.map((link, index) => ({
        index,
        href: link.getAttribute('href') || link.href || '',
        text: link.textContent?.trim() || '',
        dataHref: link.getAttribute('data-href') || '',
        dataFile: link.getAttribute('data-file') || '',
        className: link.className,
        id: link.id,
        onclick: link.getAttribute('onclick') || ''
      }));
    });

    console.log(`   총 ${allLinks.length}개의 링크 발견\n`);

    // 파일 확장자 포함된 링크 찾기
    const fileExtensions = ['.hwp', '.hwpx', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const attachmentLinks = allLinks.filter(link => {
      const lowerHref = link.href.toLowerCase();
      const lowerText = link.text.toLowerCase();
      return fileExtensions.some(ext => lowerHref.includes(ext) || lowerText.includes(ext));
    });

    console.log(`📎 파일 확장자 포함된 링크 (${attachmentLinks.length}개):`);
    attachmentLinks.forEach(link => {
      console.log(`   [${link.index}] href="${link.href}"`);
      console.log(`       text="${link.text}"`);
      console.log(`       onclick="${link.onclick}"`);
      console.log('');
    });

    // 한글 키워드 포함된 링크 찾기
    const keywords = ['첨부', '다운로드', '내려받기', '파일'];
    const keywordLinks = allLinks.filter(link => {
      const lowerText = link.text.toLowerCase();
      return keywords.some(keyword => lowerText.includes(keyword));
    });

    console.log(`📎 한글 키워드 포함된 링크 (${keywordLinks.length}개):`);
    keywordLinks.forEach(link => {
      console.log(`   [${link.index}] href="${link.href}"`);
      console.log(`       text="${link.text}"`);
      console.log(`       onclick="${link.onclick}"`);
      console.log('');
    });

    // 4. 특정 패턴 확인
    console.log('\n🔍 특수 패턴 확인:');

    // onclick으로 다운로드 트리거하는 경우
    const onclickDownloads = allLinks.filter(link =>
      link.onclick.includes('download') ||
      link.onclick.includes('file') ||
      link.onclick.includes('attach')
    );

    console.log(`   onclick에 download/file/attach 포함: ${onclickDownloads.length}개`);
    onclickDownloads.forEach(link => {
      console.log(`   [${link.index}] onclick="${link.onclick}"`);
      console.log(`       text="${link.text}"`);
      console.log('');
    });

    // JavaScript: void(0) 패턴
    const voidLinks = allLinks.filter(link =>
      link.href.includes('javascript:') || link.href === '#'
    );
    console.log(`   javascript:/# 패턴: ${voidLinks.length}개`);

    console.log('\n✅ 분석 완료! 브라우저를 10초간 유지합니다...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error('\n❌ 에러 발생:', error);
  } finally {
    await browser.close();
  }
}

testNamyangjuAttachment();

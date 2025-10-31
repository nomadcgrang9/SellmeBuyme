/**
 * Test if the board URL is accessible and has posts
 */

const BOARD_URL = 'https://www.goegn.kr/goegn/na/ntt/selectNttList.do?mi=14084&bbsId=8656';

async function testAccess() {
  console.log('Testing board URL:', BOARD_URL);

  try {
    const response = await fetch(BOARD_URL);
    console.log('Status:', response.status, response.statusText);

    const html = await response.text();
    console.log('Response length:', html.length, 'chars');

    // Check for common table selectors
    const hasTable = html.includes('<table') || html.includes('tbody');
    const hasTr = html.includes('<tr');
    const hasLinks = html.includes('<a href');

    console.log('\nHTML Structure:');
    console.log('  Has <table>:', hasTable);
    console.log('  Has <tr>:', hasTr);
    console.log('  Has <a href>:', hasLinks);

    // Try to find row count
    const trMatches = html.match(/<tr/gi);
    console.log('  <tr> count:', trMatches?.length || 0);

    // Check for Korean text (posts)
    const hasKorean = /[가-힣]/.test(html);
    console.log('  Has Korean text:', hasKorean);

    // Sample of content
    console.log('\nFirst 500 chars:');
    console.log(html.substring(0, 500));
  } catch (error) {
    console.error('Failed to fetch:', error);
  }
}

testAccess();

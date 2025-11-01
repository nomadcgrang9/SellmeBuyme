import dotenv from 'dotenv';
dotenv.config();

// 실제 브라우저에서 호출될 URL 생성
const downloadFunctionUrl = `${process.env.VITE_SUPABASE_URL}/functions/v1/download-attachment`;
const testUrl = 'http://222.120.4.134/upload/goeujb/ba/2025/10/test.hwp';
const testFilename = '테스트학교 공고문.hwp';

const params = new URLSearchParams();
params.set('url', testUrl);
params.set('filename', testFilename);

const fullUrl = `${downloadFunctionUrl}?${params.toString()}`;

console.log('=== 브라우저에서 호출될 URL ===');
console.log(fullUrl);
console.log('\n=== 파라미터 확인 ===');
console.log('- url:', params.get('url'));
console.log('- filename:', params.get('filename'));
console.log('\n이 URL을 브라우저에서 직접 열어보세요.');

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * HWP 파일 다운로드
 */
export async function downloadHWP(url, filename) {
  try {
    const downloadDir = path.join(__dirname, '../downloads');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const filepath = path.join(downloadDir, filename);
    
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000,
    });

    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filepath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`HWP 다운로드 실패: ${error.message}`);
    return null;
  }
}

/**
 * HWP → PDF 변환 (LibreOffice 사용)
 * Windows에서는 LibreOffice가 설치되어 있어야 함
 */
export async function convertHWPtoPDF(hwpPath) {
  try {
    const outputDir = path.dirname(hwpPath);
    
    // LibreOffice 경로 (Windows 기본 설치 경로)
    const libreOfficePath = 'C:\\Program Files\\LibreOffice\\program\\soffice.exe';
    
    // LibreOffice가 없으면 온라인 변환 API 사용
    if (!fs.existsSync(libreOfficePath)) {
      console.warn('⚠️  LibreOffice 미설치 - 온라인 변환 API 사용');
      return await convertHWPtoPDFOnline(hwpPath);
    }

    const command = `"${libreOfficePath}" --headless --convert-to pdf --outdir "${outputDir}" "${hwpPath}"`;
    
    await execAsync(command, { timeout: 60000 });
    
    const pdfPath = hwpPath.replace(/\.hwp$/i, '.pdf');
    
    if (fs.existsSync(pdfPath)) {
      console.log(`✅ PDF 변환 완료: ${path.basename(pdfPath)}`);
      return pdfPath;
    } else {
      throw new Error('PDF 파일 생성 실패');
    }
  } catch (error) {
    console.error(`PDF 변환 실패: ${error.message}`);
    return null;
  }
}

/**
 * 온라인 변환 API 사용 (LibreOffice 없을 때)
 * CloudConvert API 또는 무료 대안 사용
 */
async function convertHWPtoPDFOnline(hwpPath) {
  console.warn('⚠️  온라인 변환은 구현되지 않음 - LibreOffice 설치 필요');
  console.warn('   다운로드: https://www.libreoffice.org/download/download/');
  return null;
}

/**
 * PDF를 Base64로 인코딩
 */
export function pdfToBase64(pdfPath) {
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    return pdfBuffer.toString('base64');
  } catch (error) {
    console.error(`PDF 인코딩 실패: ${error.message}`);
    return null;
  }
}

/**
 * 임시 파일 삭제
 */
export function cleanupFiles(filePaths) {
  for (const filepath of filePaths) {
    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    } catch (error) {
      console.warn(`파일 삭제 실패: ${filepath}`);
    }
  }
}

/**
 * HWP → PDF 전체 파이프라인
 */
export async function processHWPtoPDF(hwpUrl) {
  const filename = `job_${Date.now()}.hwp`;
  
  console.log(`📥 HWP 다운로드 중...`);
  const hwpPath = await downloadHWP(hwpUrl, filename);
  
  if (!hwpPath) {
    return null;
  }

  console.log(`🔄 PDF 변환 중...`);
  const pdfPath = await convertHWPtoPDF(hwpPath);
  
  if (!pdfPath) {
    cleanupFiles([hwpPath]);
    return null;
  }

  const base64 = pdfToBase64(pdfPath);
  
  // 원본 파일 삭제
  cleanupFiles([hwpPath, pdfPath]);
  
  return base64;
}

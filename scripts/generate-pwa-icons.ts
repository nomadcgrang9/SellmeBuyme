import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// 간단한 개발자 노트 아이콘 SVG 생성
const createIconSVG = (size: number): string => {
  const padding = size * 0.15;
  const noteWidth = size - padding * 2;
  const noteHeight = size - padding * 2;

  return `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <!-- 배경 -->
      <rect width="${size}" height="${size}" fill="#a8c5e0" rx="${size * 0.15}"/>

      <!-- 노트 종이 -->
      <rect x="${padding}" y="${padding}"
            width="${noteWidth}" height="${noteHeight}"
            fill="#ffffff" rx="${size * 0.08}"/>

      <!-- 노트 라인들 -->
      <line x1="${padding + noteWidth * 0.15}" y1="${padding + noteHeight * 0.3}"
            x2="${padding + noteWidth * 0.85}" y2="${padding + noteHeight * 0.3}"
            stroke="#a8c5e0" stroke-width="${size * 0.015}" stroke-linecap="round"/>
      <line x1="${padding + noteWidth * 0.15}" y1="${padding + noteHeight * 0.5}"
            x2="${padding + noteWidth * 0.85}" y2="${padding + noteHeight * 0.5}"
            stroke="#a8c5e0" stroke-width="${size * 0.015}" stroke-linecap="round"/>
      <line x1="${padding + noteWidth * 0.15}" y1="${padding + noteHeight * 0.7}"
            x2="${padding + noteWidth * 0.65}" y2="${padding + noteHeight * 0.7}"
            stroke="#a8c5e0" stroke-width="${size * 0.015}" stroke-linecap="round"/>
    </svg>
  `;
};

async function generateIcons() {
  const outputDir = join(process.cwd(), 'public', 'pwa-icons');

  // 출력 디렉토리 생성
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    // 디렉토리가 이미 존재하면 무시
  }

  const sizes = [192, 512];

  for (const size of sizes) {
    const svg = createIconSVG(size);
    const outputPath = join(outputDir, `icon-${size}x${size}.png`);

    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);

    console.log(`✅ 생성 완료: icon-${size}x${size}.png`);
  }

  // Apple Touch Icon (180x180)
  const appleSvg = createIconSVG(180);
  const appleOutputPath = join(outputDir, 'apple-touch-icon.png');

  await sharp(Buffer.from(appleSvg))
    .png()
    .toFile(appleOutputPath);

  console.log('✅ 생성 완료: apple-touch-icon.png');

  console.log('\n🎉 PWA 아이콘 생성이 완료되었습니다!');
  console.log(`📁 위치: ${outputDir}`);
}

generateIcons().catch(console.error);

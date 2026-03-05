// CSV를 읽어서 SQL INSERT 문 생성
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'school_locations.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

// 헤더 파싱 (BOM 제거)
const headers = lines[0].replace('\ufeff', '').split(',');
const nameIdx = headers.indexOf('학교명');
const latIdx = headers.indexOf('위도');
const lngIdx = headers.indexOf('경도');

console.log(`-- 컬럼 인덱스: 학교명=${nameIdx}, 위도=${latIdx}, 경도=${lngIdx}`);

// 첫 100개만 처리 (테스트)
const limit = parseInt(process.argv[2]) || 100;
const offset = parseInt(process.argv[3]) || 0;

const values = [];
for (let i = 1 + offset; i < Math.min(lines.length, 1 + offset + limit); i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const cols = line.split(',');
  const name = cols[nameIdx]?.replace(/'/g, "''");
  const lat = parseFloat(cols[latIdx]);
  const lng = parseFloat(cols[lngIdx]);

  if (name && !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
    values.push(`('${name}', ${lat}, ${lng}, 'neis')`);
  }
}

console.log(`-- 총 ${values.length}개 학교`);
console.log(`INSERT INTO geocache (organization, latitude, longitude, source) VALUES`);
console.log(values.join(',\n'));
console.log(`ON CONFLICT (organization) DO NOTHING;`);

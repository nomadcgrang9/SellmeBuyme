import https from 'https';
import fs from 'fs';

const fetchData = (url) => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
};

async function fetchAllPages(baseUrl, dataKey) {
    const allRows = [];
    let pageIndex = 1;
    const pageSize = 1000;

    while (true) {
        const url = `${baseUrl}&pIndex=${pageIndex}&pSize=${pageSize}`;
        console.log(`  페이지 ${pageIndex} 가져오는 중...`);

        try {
            const response = await fetchData(url);
            const rows = response?.[dataKey]?.[1]?.row || [];

            if (rows.length === 0) break;

            allRows.push(...rows);
            console.log(`    → ${rows.length}개 (누적: ${allRows.length}개)`);

            if (rows.length < pageSize) break;
            pageIndex++;
        } catch (e) {
            console.log(`  ❌ 페이지 ${pageIndex} 오류:`, e.message);
            break;
        }
    }

    return allRows;
}

async function main() {
    const results = [];

    // 1. 경기도 유치원
    console.log('📚 경기도 유치원 데이터 가져오는 중...');
    try {
        const kinderRows = await fetchAllPages(
            'https://openapi.gg.go.kr/Kndrgrschoolstus?Type=json',
            'Kndrgrschoolstus'
        );
        console.log(`  → 전체 유치원: ${kinderRows.length}개`);

        // 국공립만 필터링 (FNDN_TYPE에 '공립' 포함)
        let publicCount = 0;
        let privateCount = 0;
        kinderRows.forEach(row => {
            const isPublic = row.FNDN_TYPE?.includes('공립');
            if (row.REFINE_WGS84_LAT && row.REFINE_WGS84_LOGT && row.KDGT_NM) {
                if (isPublic) {
                    publicCount++;
                    results.push({
                        organization: row.KDGT_NM,
                        latitude: parseFloat(row.REFINE_WGS84_LAT),
                        longitude: parseFloat(row.REFINE_WGS84_LOGT),
                        source: 'gyeonggi_kindergarten'
                    });
                } else {
                    privateCount++;
                }
            }
        });
        console.log(`  → 국공립 유치원 (좌표 있음): ${publicCount}개`);
        console.log(`  → 사립 유치원 (스킵): ${privateCount}개`);
    } catch (e) {
        console.log('  ❌ 유치원 API 오류:', e.message);
    }

    // 2. 경기도 특수학교 (다른 API 시도)
    console.log('\n🏫 경기도 특수학교 데이터 가져오는 중...');
    try {
        // 경기도 학교현황 API
        const schoolRows = await fetchAllPages(
            'https://openapi.gg.go.kr/SchoolStatus?Type=json',
            'SchoolStatus'
        );

        if (schoolRows.length > 0) {
            console.log(`  → 전체 학교: ${schoolRows.length}개`);

            let specialCount = 0;
            schoolRows.forEach(row => {
                // 특수학교만 필터링
                const isSpecial = row.SCHUL_KND_NM?.includes('특수') ||
                                  row.SCHOOL_NM?.includes('특수학교') ||
                                  row.SCHOOL_NM?.includes('혜은') ||
                                  row.SCHOOL_NM?.includes('성은') ||
                                  row.SCHOOL_NM?.includes('나래');

                if (isSpecial && row.REFINE_WGS84_LAT && row.REFINE_WGS84_LOGT && row.SCHOOL_NM) {
                    specialCount++;
                    results.push({
                        organization: row.SCHOOL_NM,
                        latitude: parseFloat(row.REFINE_WGS84_LAT),
                        longitude: parseFloat(row.REFINE_WGS84_LOGT),
                        source: 'gyeonggi_special'
                    });
                }
            });
            console.log(`  → 특수학교: ${specialCount}개`);
        } else {
            console.log('  ⚠️ 학교현황 API 데이터 없음');
        }
    } catch (e) {
        console.log('  ⚠️ 특수학교 API 없음 또는 오류:', e.message);
    }

    console.log(`\n📊 총 수집: ${results.length}개 위치`);

    if (results.length === 0) {
        console.log('❌ 수집된 데이터 없음');
        return;
    }

    // SQL INSERT 문 생성
    const sqlLines = ['-- Gyeonggi kindergartens and special schools'];
    sqlLines.push('INSERT INTO geocache (organization, latitude, longitude, source) VALUES');

    const valueLines = results.map(r =>
        `  ('${r.organization.replace(/'/g, "''")}', ${r.latitude}, ${r.longitude}, '${r.source}')`
    );
    sqlLines.push(valueLines.join(',\n'));
    sqlLines.push('ON CONFLICT (organization) DO NOTHING;');

    fs.writeFileSync('gyeonggi_locations.sql', sqlLines.join('\n'), 'utf8');
    console.log('\n✅ SQL 저장: gyeonggi_locations.sql');

    // CSV도 저장
    const csv = ['organization,latitude,longitude,source'];
    results.forEach(r => {
        csv.push(`"${r.organization}",${r.latitude},${r.longitude},${r.source}`);
    });
    fs.writeFileSync('gyeonggi_locations.csv', csv.join('\n'), 'utf8');
    console.log('✅ CSV 저장: gyeonggi_locations.csv');

    // 샘플 출력
    console.log('\n📋 샘플 데이터:');
    results.slice(0, 5).forEach(r => {
        console.log(`  - ${r.organization} (${r.latitude}, ${r.longitude})`);
    });
}

main().catch(console.error);

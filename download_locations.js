const https = require('https');
const fs = require('fs');

const urls = [
    // 경기도 유치원 (1,940개)
    'https://openapi.gg.go.kr/Kndrgrschoolstus?Type=json&pIndex=1&pSize=2000',
    // 경기도 특수학교
    'https://openapi.gg.go.kr/Specialschoolstus?Type=json&pIndex=1&pSize=100',
];

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

async function main() {
    const results = [];

    // 경기도 유치원
    console.log('Fetching Gyeonggi kindergartens...');
    const kinder = await fetchData(urls[0]);
    const kinderRows = kinder?.Kndrgrschoolstus?.[1]?.row || [];
    console.log(`Found ${kinderRows.length} kindergartens`);

    kinderRows.forEach(row => {
        if (row.REFINE_WGS84_LAT && row.REFINE_WGS84_LOGT && row.KDGT_NM) {
            results.push({
                organization: row.KDGT_NM,
                latitude: parseFloat(row.REFINE_WGS84_LAT),
                longitude: parseFloat(row.REFINE_WGS84_LOGT),
                source: 'gyeonggi_kindergarten'
            });
        }
    });

    // 경기도 특수학교
    console.log('Fetching Gyeonggi special schools...');
    try {
        const special = await fetchData(urls[1]);
        const specialRows = special?.Specialschoolstus?.[1]?.row || [];
        console.log(`Found ${specialRows.length} special schools`);

        specialRows.forEach(row => {
            if (row.REFINE_WGS84_LAT && row.REFINE_WGS84_LOGT && row.SCHOOL_NM) {
                results.push({
                    organization: row.SCHOOL_NM,
                    latitude: parseFloat(row.REFINE_WGS84_LAT),
                    longitude: parseFloat(row.REFINE_WGS84_LOGT),
                    source: 'gyeonggi_special'
                });
            }
        });
    } catch (e) {
        console.log('Special school API not found, skipping');
    }

    console.log(`\nTotal: ${results.length} locations with coordinates`);

    // CSV 출력
    const csv = ['organization,latitude,longitude,source'];
    results.forEach(r => {
        csv.push(`"${r.organization}",${r.latitude},${r.longitude},${r.source}`);
    });

    fs.writeFileSync('gyeonggi_locations.csv', csv.join('\n'), 'utf8');
    console.log('Saved to gyeonggi_locations.csv');
}

main().catch(console.error);

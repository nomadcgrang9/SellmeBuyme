import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

// 디버깅: API 키 확인
console.log('🔑 Gemini API Key 로딩 상태:');
console.log(`  - 키 존재: ${!!apiKey}`);
console.log(`  - 키 길이: ${apiKey ? apiKey.length : 0}`);
console.log(`  - 키 앞 10자: ${apiKey ? apiKey.substring(0, 10) : 'N/A'}`);

if (!apiKey) {
  throw new Error('GEMINI_API_KEY not found in .env file');
}

if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
  throw new Error('GEMINI_API_KEY가 기본값입니다. 실제 키를 입력하세요.');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

console.log('✅ Gemini 2.0 Flash 모델 초기화 완료\n');

/**
 * 크롤링 데이터를 정규화된 JSON으로 변환
 */
export async function normalizeJobData(rawData, sourceName) {
  const prompt = `
다음 교육청 구인 공고 데이터를 분석하여 JSON으로 정규화해주세요.

원본 데이터:
- 제목: ${rawData.title}
- 날짜: ${rawData.date}
- 링크: ${rawData.link}
- 상세 본문:
${rawData.detailContent}

출력 형식 (JSON만 출력, 다른 텍스트 없이):
{
  "organization": "모집하는 학교명 (예: 성일정보고등학교)",
  "title": "직무명만 간결하게 (예: 보건 기간제교사)",
  "job_type": "teacher | contract_teacher | after_school",
  "tags": ["분야1", "분야2", "분야3"],
  "location": "성남 분당구",
  "compensation": "월급여 | 시급 XX,000원 | 협의",
  "deadline": "2025-10-25",
  "is_urgent": false,
  "source_url": "${rawData.link}"
}

중요 규칙:
1. **organization**: 제목이나 본문에서 학교명을 추출 (예: "성일정보고등학교", "운중중학교")
2. **title**: 직무명만 간결하게 (예: "보건 기간제교사", "영어 시간강사")
3. **job_type**: 
   - "teacher": 정규 교원
   - "contract_teacher": 기간제/계약제 교원
   - "after_school": 방과후 강사/시간강사
4. **compensation**:
   - 교원/기간제 공고 → "월급여" (국가보수이므로)
   - 방과후 강사 → "시급 XX,000원" (본문에서 추출)
   - 정보 없으면 → "협의"
5. **deadline**: 본문에서 "접수기간", "마감일", "~까지" 등 키워드로 날짜 추출 (YYYY-MM-DD 형식)
6. **tags**: 2-5개 (과목명, 학교급, 특징 등)
7. **location**: "성남 분당구" 형식 (본문에서 학교 주소 추출)
8. **is_urgent**: "긴급", "시급" 키워드 있으면 true
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // JSON 추출 (마크다운 코드블록 제거)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
    }

    const normalized = JSON.parse(jsonMatch[0]);
    
    console.log(`🤖 AI 정규화 완료: ${normalized.title}`);
    return normalized;
  } catch (error) {
    console.error(`❌ AI 정규화 실패: ${error.message}`);
    console.error(`   전체 에러:`, error);
    return null;
  }
}

/**
 * 정규화된 데이터 검증
 */
export async function validateJobData(jobData) {
  const prompt = `
다음 공고 데이터를 검증하고 오류가 있으면 수정해주세요.

데이터:
${JSON.stringify(jobData, null, 2)}

검증 규칙:
1. deadline은 미래 날짜여야 함 (과거면 null로 수정)
2. location은 경기도 내 지역이어야 함
3. tags는 2-5개여야 함
4. title은 비어있으면 안됨

출력 형식 (JSON만):
{
  "is_valid": true,
  "corrected_data": { ...수정된 데이터... },
  "errors": ["오류1", "오류2"]
}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { is_valid: true, corrected_data: jobData, errors: [] };
    }

    const validation = JSON.parse(jsonMatch[0]);
    
    if (validation.errors.length > 0) {
      console.log(`⚠️  검증 경고: ${validation.errors.join(', ')}`);
    }
    
    return validation;
  } catch (error) {
    console.error(`❌ AI 검증 실패: ${error.message}`);
    return { is_valid: true, corrected_data: jobData, errors: [] };
  }
}

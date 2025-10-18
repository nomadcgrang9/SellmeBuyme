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

/**
 * 상세 본문을 구조화된 JSON으로 변환
 */
export async function structureDetailContent(rawContent) {
  if (!rawContent || rawContent.trim().length === 0) {
    return null;
  }

  const prompt = `
다음 교육청 채용 공고 상세 본문을 구조화된 JSON으로 정리해주세요.

원본 본문:
${rawContent}

출력 형식 (JSON만 출력, 다른 텍스트 없이):
{
  "overview": {
    "organization": "기관명",
    "field": "모집 분야 또는 직무",
    "headcount": "모집 인원 (숫자 또는 표현)",
    "work_period": "근무 기간 (예: 2025.10.17 ~ 2025.10.24)",
    "application_period": "접수 기간 (예: 2025.10.17 ~ 2025.10.20)",
    "duty_summary": "주요 업무 요약 (1-2문장)"
  },
  "qualifications": ["핵심 자격 1개 (예: 봉사 참여의사(나이무관))"],
  "preferred": ["우대사항1", "우대사항2"],
  "application": {
    "method": "지원 방법",
    "documents": ["제출 서류1", "제출 서류2"]
  },
  "contact": {
    "department": "담당 부서 또는 담당자",
    "name": "담당자 이름",
    "phone": "전화번호",
    "email": "이메일"
  },
  "notes": ["기타 안내사항"]
}

중요 규칙:
1. 정보가 없으면 null 또는 빈 배열로 설정
2. **qualifications**는 최대 1개, 15자 이내로 핵심 키워드만 남기고 불필요한 수식어(예: "있는 자")는 제거
3. 날짜는 원문 형식을 유지 (예: 2025.10.24)
4. JSON 외 다른 텍스트 출력 금지
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
    }

    const structured = JSON.parse(jsonMatch[0]);

    console.log('🧱 상세 본문 구조화 성공');
    return structured;
  } catch (error) {
    console.error(`❌ 상세 본문 구조화 실패: ${error.message}`);
    return null;
  }
}

if (apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
  throw new Error('GEMINI_API_KEY가 기본값입니다. 실제 키를 입력하세요.');
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
const visionModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
 * 페이지 스크린샷을 Gemini Vision으로 분석
 */
export async function analyzePageScreenshot(imageBase64) {
  const prompt = `
이 교육청 채용 공고 이미지를 분석하여 다음 정보를 JSON으로 추출해주세요.

출력 형식 (JSON만 출력, 다른 텍스트 없이):
{
  "school_name": "학교명 (예: 삼평유치원, 성일정보고등학교)",
  "job_title": "직무명 (예: 보건 기간제교사, 학생보호인력)",
  "job_type": "teacher | contract_teacher | after_school | volunteer",
  "subjects": ["과목1", "과목2"],
  "compensation": "급여 정보 (예: 월 3,500,000원, 일 21,000원, 시급 35,000원)",
  "deadline": "마감일 (YYYY-MM-DD 형식)",
  "application_period": "접수기간 (예: 2025.10.20 ~ 2025.10.25)",
  "work_period": "근무기간 (예: 2025.11 ~ 2026.02)",
  "qualifications": ["자격요건1", "자격요건2"],
  "contact": "담당자 연락처 또는 이메일"
}

중요 규칙:
1. **school_name**: 
   - 이미지 상단의 학교명/유치원명 정확히 추출
   - "○○초등학교", "○○중학교", "○○고등학교", "○○유치원" 형식
   - 없으면 본문에서 검색
   
2. **compensation** (반드시 12자 이내!):
   - 정확한 금액: "월 3,500,000원" (10자), "일 21,000원" (8자)
   - 금액 없으면 초간결: "월급여" (3자), "시급 협의" (5자), "호봉제" (3자)
   - 예시:
     * "공무원보수규정 제8조..." → "월급여"
     * "시간당 강사 수급 기준..." → "시급 협의"
     * "호봉에 따라 산정" → "호봉제"
     * "일 21,000원" → "일 21,000원"
   - **절대 12자 초과 금지**
   
3. **deadline**: "접수마감", "제출기한", "~까지" 등에서 날짜 추출 (YYYY-MM-DD)

4. **job_type**: 
   - "teacher": 정규교원
   - "contract_teacher": 기간제/계약제 교원
   - "after_school": 방과후 강사/시간강사
   - "volunteer": 자원봉사자
   
5. **subjects**: 
   - 담당 과목/직무 키워드 (예: ["보건", "영어", "체육"])
   - **중복 제거 규칙** (반드시 준수):
     * "학생보호인력" = "학교안전지킴이" → "학생보호인력" 1개만
     * "기간제교사" = "계약제교사" → "기간제교사" 1개만
     * 유사한 의미의 태그는 대표 태그 1개만 선택
   - **최대 2개까지** (카드 공간 제약)

6. 정보가 없으면 null 반환

이미지에서 텍스트를 정확히 읽고 JSON으로만 응답하세요.
`;

  try {
    const result = await visionModel.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: imageBase64,
        },
      },
    ]);

    const text = result.response.text();
    
    // JSON 추출 (마크다운 코드블록 제거)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`🤖 이미지 분석 완료: ${parsed.school_name} - ${parsed.job_title}`);
    console.log(`   급여: ${parsed.compensation}`);
    console.log(`   마감: ${parsed.deadline}`);
    
    return parsed;
  } catch (error) {
    console.error(`❌ 이미지 분석 실패: ${error.message}`);
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
3. tags가 비어있으면 직무명에서 추출해서 1-5개 채우기
4. title은 비어있으면 안됨
5. 사소한 오류는 무시하고 is_valid를 true로 설정

출력 형식 (JSON만):
{
  "is_valid": true,
  "corrected_data": { ...수정된 데이터... },
  "errors": []
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

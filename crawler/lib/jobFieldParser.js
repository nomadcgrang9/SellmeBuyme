/**
 * 직무분야(jobField) 파싱 유틸리티
 * 
 * 예시:
 * - "초등 담임" → { schoolLevel: "초등", subject: "담임", requiredLicense: "초등담임" }
 * - "중등 과학" → { schoolLevel: "중등", subject: "과학", requiredLicense: "중등과학" }
 * - "유치원" → { schoolLevel: "유치원", subject: null, requiredLicense: "유치원" }
 */

/**
 * 학교급 추출
 * @param {string} jobField - 직무분야 텍스트
 * @returns {string|null} - '유치원', '초등', '중등', '고등', '특수' 또는 null
 */
export function extractSchoolLevel(jobField) {
  if (!jobField || typeof jobField !== 'string') {
    return null;
  }

  const normalized = jobField.trim().toLowerCase();

  if (normalized.includes('유치원')) {
    return '유치원';
  }
  if (normalized.includes('초등')) {
    return '초등';
  }
  if (normalized.includes('중등') || normalized.includes('중학교')) {
    return '중등';
  }
  if (normalized.includes('고등') || normalized.includes('고등학교')) {
    return '고등';
  }
  if (normalized.includes('특수')) {
    return '특수';
  }

  return null;
}

/**
 * 과목/담당 추출
 * @param {string} jobField - 직무분야 텍스트
 * @returns {string|null} - 과목명 또는 null
 */
export function extractSubject(jobField) {
  if (!jobField || typeof jobField !== 'string') {
    return null;
  }

  const normalized = jobField.trim().toLowerCase();

  // 담임
  if (normalized.includes('담임')) {
    return '담임';
  }

  // 초등 전담 과목
  if (normalized.includes('과학')) {
    return '과학';
  }
  if (normalized.includes('영어')) {
    return '영어';
  }
  if (normalized.includes('체육')) {
    return '체육';
  }
  if (normalized.includes('음악')) {
    return '음악';
  }
  if (normalized.includes('미술')) {
    return '미술';
  }
  if (normalized.includes('실과')) {
    return '실과';
  }

  // 중등 과목
  if (normalized.includes('국어')) {
    return '국어';
  }
  if (normalized.includes('수학')) {
    return '수학';
  }
  if (normalized.includes('사회')) {
    return '사회';
  }
  if (normalized.includes('도덕')) {
    return '도덕';
  }
  if (normalized.includes('기술') || normalized.includes('가정') || normalized.includes('기술가정')) {
    return '기술가정';
  }
  if (normalized.includes('정보')) {
    return '정보';
  }
  if (normalized.includes('역사')) {
    return '역사';
  }
  if (normalized.includes('지리')) {
    return '지리';
  }

  return null;
}

/**
 * 필요 라이센스 생성
 * @param {string} schoolLevel - 학교급
 * @param {string} subject - 과목
 * @returns {string|null} - 라이센스 문자열
 */
export function buildRequiredLicense(schoolLevel, subject) {
  if (!schoolLevel) {
    return null;
  }

  if (schoolLevel === '유치원' || schoolLevel === '특수') {
    return schoolLevel;
  }

  if (!subject) {
    return schoolLevel;
  }

  return `${schoolLevel}${subject}`;
}

/**
 * jobField 전체 파싱
 * @param {string} jobField - 직무분야 텍스트
 * @returns {{schoolLevel: string|null, subject: string|null, requiredLicense: string|null}}
 */
const SCHOOL_LEVEL_PATTERNS = [
  { level: '유치원', regex: /(유치원|유아|kindergarten)/ },
  { level: '특수', regex: /(특수교육|특수학교|특수|장애)/ },
  { level: '초등', regex: /(초등|초등학교|초교|늘봄학교|elementary|초·중|초중등)/ },
  { level: '중등', regex: /(중등|중학교|중학|중고등|middle|중·고)/ },
  { level: '고등', regex: /(고등|고등학교|고교|high\s?school)/ }
];

const SUBJECT_PATTERNS = [
  { subject: '담임', regex: /(담임)/ },
  { subject: '과학', regex: /(과학|물리|화학|생물|지구과학|science|physics|chemistry|biology|천문)/ },
  { subject: '영어', regex: /(영어|english)/ },
  { subject: '체육', regex: /(체육|physical\s?education|pe)/ },
  { subject: '음악', regex: /(음악|music)/ },
  { subject: '미술', regex: /(미술|art)/ },
  { subject: '실과', regex: /(실과)/ },
  { subject: '국어', regex: /(국어|국문|korean)/ },
  { subject: '수학', regex: /(수학|math)/ },
  { subject: '사회', regex: /(사회|역사|지리|history|social\s?studies|civics)/ },
  { subject: '도덕', regex: /(도덕|윤리|ethics)/ },
  { subject: '기술가정', regex: /(기술|가정|technology|home\s?economics)/ },
  { subject: '정보', regex: /(정보|ict|computer|전산)/ },
  { subject: '특수', regex: /(특수교육|특수)/ },
  { subject: '영양', regex: /(영양|nutrition)/ },
  { subject: '보건', regex: /(보건|health)/ },
  { subject: '상담', regex: /(상담|counsel)/ },
  { subject: '사서', regex: /(사서|librarian)/ },
  { subject: '한문', regex: /(한문)/ },
  { subject: '중국어', regex: /(중국어|chinese)/ },
  { subject: '일본어', regex: /(일본어|japanese)/ },
  { subject: '독일어', regex: /(독일어|german)/ },
  { subject: '프랑스어', regex: /(프랑스어|french)/ }
];

function pickMatch(texts, patterns) {
  const lowered = texts
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string') {
        return [value];
      }
      return [];
    })
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (lowered.length === 0) {
    return null;
  }

  const combined = lowered.join(' ');

  for (const { level, regex } of patterns) {
    if (regex.test(combined)) {
      return level;
    }
  }

  return null;
}

function pickSubject(texts) {
  const lowered = texts
    .flatMap((value) => {
      if (Array.isArray(value)) {
        return value;
      }
      if (typeof value === 'string') {
        return [value];
      }
      return [];
    })
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  if (lowered.length === 0) {
    return null;
  }

  const combined = lowered.join(' ');

  for (const { subject, regex } of SUBJECT_PATTERNS) {
    if (regex.test(combined)) {
      if (subject === '기술가정' && /특수/.test(combined)) {
        return '특수';
      }
      if (subject === '과학' && /영양/.test(combined)) {
        continue;
      }
      if (subject === '사회' && /도덕/.test(combined)) {
        continue;
      }
      return subject;
    }
  }

  if (/담임/.test(combined)) {
    return '담임';
  }

  return null;
}

function pickSchoolLevelFromSchoolName(schoolName) {
  if (!schoolName || typeof schoolName !== 'string') {
    return null;
  }
  const normalized = schoolName.toLowerCase();
  
  // 병설유치원, 사립유치원 등
  if (/유치원/.test(normalized)) {
    return '유치원';
  }
  
  // 특수학교, 특수학급
  if (/특수/.test(normalized)) {
    return '특수';
  }
  
  // 초등학교, 초교, 병설초, 공립초등학교 등
  if (/초등학교|초등|초교/.test(normalized)) {
    return '초등';
  }
  
  // 중학교, 중학, 여자중학교, 남자중학교 등
  if (/중학교|중학/.test(normalized)) {
    return '중등';
  }
  
  // 고등학교, 고교, 여자고등학교, 남자고등학교, 여고, 남고 등
  if (/고등학교|고교|여자고|남자고|여고|남고/.test(normalized)) {
    return '고등';
  }
  
  return null;
}

export function parseJobField(jobField) {
  const schoolLevel = extractSchoolLevel(jobField);
  const subject = extractSubject(jobField);
  const requiredLicense = buildRequiredLicense(schoolLevel, subject);

  return {
    schoolLevel,
    subject,
    requiredLicense
  };
}

export function deriveJobAttributes({
  jobField,
  title,
  normalizedTitle,
  schoolName,
  detailContent,
  tags = [],
  correctedTags = []
}) {
  const initial = parseJobField(jobField);

  const limitedDetail = typeof detailContent === 'string' ? detailContent.slice(0, 400) : null;

  const schoolLevel = initial.schoolLevel
    || pickSchoolLevelFromSchoolName(schoolName)
    || pickMatch([jobField, title, normalizedTitle, limitedDetail, tags, correctedTags], SCHOOL_LEVEL_PATTERNS);

  const subject = initial.subject
    || pickSubject([jobField, title, normalizedTitle, limitedDetail, tags, correctedTags]);

  const requiredLicense = buildRequiredLicense(schoolLevel, subject);

  return {
    schoolLevel,
    subject,
    requiredLicense
  };
}

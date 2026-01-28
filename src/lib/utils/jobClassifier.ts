/**
 * 공고 분류 시스템 (v7)
 * 우선순위 기반으로 공고를 8개 1차 카테고리로 분류
 * 2차/3차 필터 매칭 로직 포함
 */

export type PrimaryCategory =
  | '유치원' | '초등담임' | '교과과목' | '비교과'
  | '특수' | '방과후/돌봄' | '행정·교육지원' | '기타';

export interface CascadingFilter {
  primary: PrimaryCategory | null;
  secondary: string | null;
  tertiary: string | null;
}

// 1차 카테고리 목록
export const PRIMARY_CATEGORIES: { key: PrimaryCategory; label: string; mobileLabel: string }[] = [
  { key: '유치원', label: '유치원', mobileLabel: '유' },
  { key: '초등담임', label: '초등담임', mobileLabel: '초담' },
  { key: '교과과목', label: '교과과목', mobileLabel: '교과' },
  { key: '비교과', label: '비교과', mobileLabel: '비교과' },
  { key: '특수', label: '특수', mobileLabel: '특수' },
  { key: '방과후/돌봄', label: '방과후/돌봄', mobileLabel: '방돌' },
  { key: '행정·교육지원', label: '행정·교육지원', mobileLabel: '행정' },
  { key: '기타', label: '기타', mobileLabel: '기타' },
];

// 2차 필터 옵션
export const SECONDARY_OPTIONS: Partial<Record<PrimaryCategory, { key: string; label: string }[]>> = {
  '유치원': [
    { key: '유치원담임', label: '유치원담임' },
    { key: '유치원방과후', label: '유치원방과후' },
  ],
  '교과과목': [
    { key: '국어', label: '국어' },
    { key: '영어', label: '영어' },
    { key: '수학', label: '수학' },
    { key: '과학', label: '과학' },
    { key: '사회', label: '사회' },
    { key: '체육', label: '체육' },
    { key: '음악', label: '음악' },
    { key: '미술', label: '미술' },
    { key: '기술가정', label: '기술가정' },
    { key: '정보', label: '정보' },
    { key: '도덕', label: '도덕' },
    { key: '제2외국어', label: '제2외국어' },
  ],
  '비교과': [
    { key: '보건', label: '보건' },
    { key: '상담', label: '상담' },
    { key: '사서', label: '사서' },
    { key: '영양교사', label: '영양교사' },
  ],
  '방과후/돌봄': [
    { key: '체육', label: '체육' },
    { key: '음악', label: '음악' },
    { key: '미술', label: '미술' },
    { key: '무용', label: '무용' },
    { key: '요리', label: '요리' },
    { key: '외국어', label: '외국어' },
    { key: '코딩/STEM', label: '코딩/STEM' },
    { key: '돌봄/늘봄', label: '돌봄/늘봄' },
    { key: '기타', label: '기타' },
  ],
  '행정·교육지원': [
    { key: '교무실무사', label: '교무실무사' },
    { key: '조리실무사', label: '조리실무사' },
    { key: '시설/환경', label: '시설/환경' },
    { key: '영양사', label: '영양사' },
    { key: '학습튜터/협력강사', label: '학습튜터/협력강사' },
    { key: '자원봉사', label: '자원봉사' },
    { key: '안전지킴이', label: '안전지킴이' },
  ],
};

// 3차 필터 (교과과목 → 과목 선택 후 학교급)
export const TERTIARY_OPTIONS = [
  { key: '초등학교', label: '초등학교' },
  { key: '중학교', label: '중학교' },
  { key: '고등학교', label: '고등학교' },
];

// 1차 카테고리 색상
export const PRIMARY_COLORS: Record<PrimaryCategory, { base: string; light: string; text: string }> = {
  '유치원':       { base: '#8D6E63', light: '#EFEBE9', text: '#3E2723' },
  '초등담임':     { base: '#4CAF50', light: '#E8F5E9', text: '#1B5E20' },
  '교과과목':     { base: '#2196F3', light: '#E3F2FD', text: '#0D47A1' },
  '비교과':       { base: '#009688', light: '#E0F2F1', text: '#004D40' },
  '특수':         { base: '#FF9800', light: '#FFF3E0', text: '#E65100' },
  '방과후/돌봄':  { base: '#7C4DFF', light: '#EDE7F6', text: '#4A148C' },
  '행정·교육지원': { base: '#607D8B', light: '#ECEFF1', text: '#263238' },
  '기타':         { base: '#9E9E9E', light: '#F5F5F5', text: '#424242' },
};

interface JobLike {
  title?: string | null;
  school_level?: string | null;
  organization?: string | null;
  tags?: string[] | null;
}

/**
 * 공고를 1차 카테고리로 분류 (우선순위 기반)
 * v3: tags 기반 특수/비교과 체크 추가, 교과전담 분리
 */
export function classifyJob(job: JobLike): PrimaryCategory {
  const title = job.title || '';
  const tl = title.toLowerCase();
  const sl = (job.school_level || '').toLowerCase();
  const org = (job.organization || '').toLowerCase();
  const combined = `${sl} ${org} ${title}`.toLowerCase();
  // 태그 준비 (모든 우선순위에서 사용)
  const tagsLower = (job.tags || []).map(t => t.toLowerCase()).join(' ');

  // P1: 특수 (타이틀 OR 태그에 '특수' 포함)
  if (tl.includes('특수') || tagsLower.includes('특수')) return '특수';

  // P1.5: 특수학교 판별 (organization이 "XX학교"로만 끝나는 경우)
  // 한국에서 "성은학교", "성심학교" 등 초등/중/고등/대학교가 아닌 "XX학교"는 특수학교
  const orgRaw = (job.organization || '').trim();
  if (
    orgRaw.endsWith('학교') &&
    !orgRaw.endsWith('초등학교') &&
    !orgRaw.endsWith('중학교') &&
    !orgRaw.endsWith('고등학교') &&
    !orgRaw.endsWith('대학교')
  ) {
    return '특수';
  }

  // P2: 비교과 (타이틀 OR 태그 체크)
  // 타이틀 기반
  if (
    (tl.includes('보건') && (tl.includes('교사') || tl.includes('교원'))) ||
    (tl.includes('상담') && (tl.includes('교사') || tl.includes('교원') || tl.includes('전문상담'))) ||
    (tl.includes('사서') && (tl.includes('교사') || tl.includes('교원'))) ||
    (tl.includes('영양') && tl.includes('교사'))
  ) {
    return '비교과';
  }
  // 태그 기반 비교과 (태그에 보건, 상담, 사서, 영양교사 - 단순 "보건" 태그도 포함)
  // 단, 영양사(비교사)는 행정·교육지원이므로 제외
  if (
    tagsLower.includes('보건교사') || tagsLower.includes('보건 교사') ||
    (tagsLower.includes('보건') && !tagsLower.includes('급식') && !tagsLower.includes('영양사')) ||
    tagsLower.includes('상담교사') || tagsLower.includes('전문상담') ||
    tagsLower.includes('사서교사') || tagsLower.includes('사서 교사') ||
    tagsLower.includes('영양교사') || tagsLower.includes('영양 교사')
  ) {
    return '비교과';
  }

  // P3: 유치원
  if (combined.includes('유치')) return '유치원';

  // P4/P6/P7: 초등 분기 (v4: 교과전담 우선 처리)
  const isElementary = combined.includes('초등') || org.endsWith('초');
  if (isElementary) {
    // 교과전담 과목 키워드 (담임이 아닌 전담교사)
    const subjectKeywords = ['과학', '영어', '체육', '음악', '미술', '국어', '수학', '도덕'];
    const isSubjectOnly = subjectKeywords.some(subj =>
      tagsLower.includes(subj) || tl.includes(subj)
    );
    const hasDamim = tl.includes('담임') || tagsLower.includes('담임');
    const hasElemTeacher = tagsLower.includes('초등교사') || tagsLower.includes('초등교원');
    const isGyogwaJeondam = tagsLower.includes('교과전담') || tl.includes('교과전담') || tl.includes('전담교사');

    // 0. 교과전담 명시 → 바로 교과과목 (담임보다 우선)
    if (isGyogwaJeondam && !hasDamim) {
      return '교과과목';
    }

    // 1. 방과후/돌봄 (키워드 확장)
    if (
      tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄') ||
      tl.includes('에듀케어') || tl.includes('외부강사') || tl.includes('개인위탁') ||
      // 추가: 강사(단독), 프로그램, 스포츠 등
      (tl.includes('강사') && !tl.includes('교사') && !tl.includes('교원')) ||
      tl.includes('프로그램') || tl.includes('맞춤형') ||
      tl.includes('스포츠') || tl.includes('운동부') ||
      tl.includes('특기적성') || tl.includes('동아리') ||
      tl.includes('보육') // 보육전담사 등
    ) {
      return '방과후/돌봄';
    }

    // 2. 행정·교육지원 (키워드 확장)
    if (
      tl.includes('실무') || tl.includes('공무직') || tl.includes('봉사') ||
      tl.includes('지킴이') || tl.includes('튜터') || tl.includes('협력강사') ||
      tl.includes('안전') || tl.includes('보조') || tl.includes('영양사') || tl.includes('배움터') ||
      // 추가: 전담사, 당직, 시설, 미화, 경비 등
      tl.includes('전담사') || tl.includes('당직') ||
      tl.includes('미화') || tl.includes('경비') ||
      tl.includes('시설') || tl.includes('관리') ||
      tl.includes('보호인력') || tl.includes('학생보호') ||
      tl.includes('조리') || tl.includes('사서')
    ) {
      return '행정·교육지원';
    }

    // 3. 초등담임 (명시적으로 담임이거나 초등교사 태그)
    if (hasDamim || hasElemTeacher) {
      return '초등담임';
    }

    // 4. 기간제/계약제 교사/교원 체크 (담임 or 교과전담 구분)
    const isGiganje = (tl.includes('기간제') || tl.includes('계약제')) &&
                      (tl.includes('교사') || tl.includes('교원'));
    if (isGiganje) {
      // 특정 과목만 있고 담임 없으면 → 교과과목으로 분류
      if (isSubjectOnly && !hasDamim) {
        return '교과과목';  // 초등 교과전담은 교과과목으로
      }
      // 그 외 기간제/계약제 교원은 초등담임
      return '초등담임';
    }

    // 5. 그 외는 기타
    return '기타';
  }

  // P5: 교과과목 (중/고)
  const isSecondary = combined.includes('중학') || combined.includes('중등') || combined.includes('고등') || combined.includes('고교');
  if (isSecondary) {
    if (tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄')) return '방과후/돌봄';
    if (
      tl.includes('실무') || tl.includes('공무직') || tl.includes('봉사') ||
      tl.includes('지킴이') || tl.includes('안전') || tl.includes('보조') || tl.includes('영양사')
    ) {
      return '행정·교육지원';
    }
    return '교과과목';
  }

  // P6: 방과후/돌봄 (학교급 불명)
  if (
    tl.includes('방과후') || tl.includes('돌봄') || tl.includes('늘봄') ||
    tl.includes('에듀케어') || tl.includes('외부강사') || tl.includes('개인위탁') ||
    (tl.includes('예체능') && tl.includes('강사'))
  ) {
    return '방과후/돌봄';
  }

  // P7: 행정·교육지원
  if (
    tl.includes('실무') || tl.includes('공무직') || tl.includes('봉사') ||
    tl.includes('지킴이') || tl.includes('튜터') || tl.includes('협력강사') ||
    tl.includes('안전') || tl.includes('보조') || tl.includes('영양사') || tl.includes('배움터')
  ) {
    return '행정·교육지원';
  }

  // P8: 기타
  return '기타';
}

/**
 * 공고가 현재 캐스케이딩 필터에 매칭되는지 확인
 * v8: tags 필드도 함께 검색 (title OR tags 매칭)
 */
export function matchesCascadingFilter(job: JobLike, filter: CascadingFilter): boolean {
  if (!filter.primary) return true;

  const category = classifyJob(job);
  if (category !== filter.primary) return false;

  if (!filter.secondary) return true;

  const tl = (job.title || '').toLowerCase();
  const sl = (job.school_level || '').toLowerCase();
  const org = (job.organization || '').toLowerCase();
  const combined = `${sl} ${org} ${job.title || ''}`.toLowerCase();
  // 태그 배열을 소문자로 변환
  const tagsLower = (job.tags || []).map(t => t.toLowerCase());

  switch (filter.primary) {
    case '유치원':
      if (filter.secondary === '유치원담임') {
        return tl.includes('기간제') || tl.includes('계약제') || tl.includes('담임') || tl.includes('교사') || tl.includes('교원');
      }
      if (filter.secondary === '유치원방과후') {
        return tl.includes('방과후') || tl.includes('특성화') || tl.includes('돌봄') || tl.includes('늘봄') || tl.includes('강사');
      }
      break;

    case '교과과목':
      if (!matchesSubject(tl, tagsLower, filter.secondary)) return false;
      if (filter.tertiary) {
        return matchesSchoolLevel(combined, filter.tertiary);
      }
      return true;

    case '비교과':
      return matchesBigyogwa(tl, tagsLower, filter.secondary);

    case '방과후/돌봄':
      return matchesAfterSchool(tl, tagsLower, filter.secondary);

    case '행정·교육지원':
      return matchesAdmin(tl, tagsLower, filter.secondary);
  }

  return true;
}

// 교과과목 과목 매칭 (title OR tags)
function matchesSubject(titleLower: string, tagsLower: string[], subject: string): boolean {
  const keywords: Record<string, string[]> = {
    '국어': ['국어', '문학'],
    '영어': ['영어', 'english'],
    '수학': ['수학'],
    '과학': ['과학', '물리', '화학', '생물', '지구과학', '생명과학', '통합과학'],
    '사회': ['사회', '역사', '지리', '윤리', '경제', '정치'],
    '체육': ['체육'],
    '음악': ['음악'],
    '미술': ['미술'],
    '기술가정': ['기술', '가정', '기술가정'],
    '정보': ['정보', '컴퓨터', 'sw', '코딩', '정보컴퓨터', '정보.컴퓨터'],
    '도덕': ['도덕'],
    '제2외국어': ['일본어', '중국어', '프랑스어', '독일어', '스페인어', '제2외국어', '한문'],
  };
  const kws = keywords[subject] || [subject.toLowerCase()];
  // title에서 매칭
  if (kws.some(kw => titleLower.includes(kw))) return true;
  // tags에서 매칭 (태그가 키워드를 포함하거나, 키워드가 태그를 포함하는 경우)
  return tagsLower.some(tag =>
    kws.some(kw => tag.includes(kw) || kw.includes(tag))
  );
}

// 학교급 매칭
function matchesSchoolLevel(combinedLower: string, schoolLevel: string): boolean {
  switch (schoolLevel) {
    case '초등학교': return combinedLower.includes('초등');
    case '중학교': return combinedLower.includes('중학') || combinedLower.includes('중등');
    case '고등학교': return combinedLower.includes('고등') || combinedLower.includes('고교');
    default: return true;
  }
}

// 비교과 세부 매칭 (title OR tags)
function matchesBigyogwa(titleLower: string, tagsLower: string[], category: string): boolean {
  const keywords: Record<string, string[]> = {
    '보건': ['보건'],
    '상담': ['상담'],
    '사서': ['사서'],
    '영양교사': ['영양교사', '영양 교사'],
  };
  const kws = keywords[category] || [category.toLowerCase()];
  // title에서 매칭
  if (kws.some(kw => titleLower.includes(kw))) return true;
  // tags에서 매칭
  return tagsLower.some(tag =>
    kws.some(kw => tag.includes(kw) || kw.includes(tag))
  );
}

// 방과후/돌봄 세부 매칭 (title OR tags)
function matchesAfterSchool(titleLower: string, tagsLower: string[], subject: string): boolean {
  const keywords: Record<string, string[]> = {
    '체육': ['체육', '스포츠', '축구', '농구', '배드민턴', '태권도', '수영'],
    '음악': ['음악', '피아노', '바이올린', '기타연주', '합창', '밴드', '우쿨렐레'],
    '미술': ['미술', '그림', '도예', '공예', '드로잉'],
    '무용': ['무용', '발레', '댄스'],
    '요리': ['요리', '조리', '베이킹', '제과', '제빵'],
    '외국어': ['영어', '중국어', '일본어', '외국어'],
    '코딩/STEM': ['코딩', 'sw', '로봇', '드론', 'stem', '3d', '과학실험', '프로그래밍'],
    '돌봄/늘봄': ['돌봄', '늘봄', '에듀케어', '방과후과정', '방과후'],
    '기타': [],
  };
  if (subject === '기타') return true;
  const kws = keywords[subject] || [];
  // title에서 매칭
  if (kws.some(kw => titleLower.includes(kw))) return true;
  // tags에서 매칭
  return tagsLower.some(tag =>
    kws.some(kw => tag.includes(kw) || kw.includes(tag))
  );
}

// 행정·교육지원 세부 매칭 (title OR tags)
function matchesAdmin(titleLower: string, tagsLower: string[], category: string): boolean {
  const keywords: Record<string, string[]> = {
    '교무실무사': ['교무실무', '교무행정'],
    '조리실무사': ['조리실무', '조리사'],
    '시설/환경': ['시설', '환경', '관리원'],
    '영양사': ['영양사'],
    '학습튜터/협력강사': ['튜터', '협력강사', '학습지원', '찬찬'],
    '자원봉사': ['봉사', '자원봉사'],
    '안전지킴이': ['지킴이', '안전', '교통'],
  };
  const kws = keywords[category] || [category.toLowerCase()];
  // title에서 매칭
  if (kws.some(kw => titleLower.includes(kw))) return true;
  // tags에서 매칭
  return tagsLower.some(tag =>
    kws.some(kw => tag.includes(kw) || kw.includes(tag))
  );
}

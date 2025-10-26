import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ??
  Deno.env.get('PROJECT_URL') ??
  Deno.env.get('SB_URL') ??
  '';

const anonKey =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('ANON_KEY') ??
  Deno.env.get('SB_ANON_KEY') ??
  '';

if (!supabaseUrl || !anonKey) {
  throw new Error('SUPABASE_URL 또는 SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다.');
}

async function aiFilterWithGemini(profile: UserProfileRow, scored: ScoredCard[]): Promise<Set<string> | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) return null;

  // 상위 20개 → 40개로 확대 (커버리지 2배)
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map((s) => ({
      id: s.card.id,
      type: s.card.type,
      title: (s.card as any).title ?? (s.card as any).name ?? '',
      tags: (s.card as any).tags ?? [],
      location: (s.card as any).location ?? '',
      specialty: (s.card as any).specialty ?? undefined
    }));

  const prompt = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              'You are filtering job and talent cards for a Korean education platform. Keep only the top 6 items that best match the user profile. Prefer regions in interest_regions, match roles and subjects implied by tags/title, prefer recent items and avoid expired. Return JSON with an array keep_ids.'
          },
          { text: 'user_profile: ' + JSON.stringify(profile) },
          { text: 'candidates: ' + JSON.stringify(top) }
        ]
      }
    ]
  };

  try {
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const keep: string[] = Array.isArray(parsed.keep_ids) ? parsed.keep_ids : [];
    return new Set(keep);
  } catch (_) {
    return null;
  }
}

/**
 * ==================== Option 1: Hybrid Approach ====================
 * Rule-based card selection (accurate) + AI comment generation (natural)
 */

/**
 * 코멘트 길이 검증 함수
 */
function validateCommentLength(
  headline: string,
  description: string
): { valid: boolean; reason?: string } {
  const headlineLength = headline.length;
  const descriptionLength = description.length;

  if (headlineLength > 30) {
    return {
      valid: false,
      reason: `Headline 너무 김 (${headlineLength}자 > 30자)`
    };
  }

  if (descriptionLength > 80) {
    return {
      valid: false,
      reason: `Description 너무 김 (${descriptionLength}자 > 80자)`
    };
  }

  return { valid: true };
}

/**
 * Gemini AI를 사용한 코멘트 ONLY 생성 (카드 선택은 하지 않음)
 * 이미 선택된 카드를 기반으로 짧고 정확한 코멘트만 생성합니다.
 */
async function generateCommentWithGemini(
  profile: UserProfileRow,
  selectedCards: ScoredCard[]
): Promise<{ headline: string; description: string } | null> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.log('[AI Comment] Gemini API key 없음 - fallback 사용');
    return null;
  }

  const displayName = profile.display_name ?? '선생님';
  const capableSubjects = profile.capable_subjects ?? [];
  const interestRegions = profile.interest_regions ?? [];

  // 선택된 카드 정보 요약 (간결하게)
  const cardSummaries = selectedCards.map((s, idx) => {
    const card = s.card as any;
    return {
      번호: idx + 1,
      조직: card.organization || card.name || '',
      지역: card.location || '',
      과목: card.subject || card.specialty || '',
      마감: card.deadline || '',
      생성일: card.created_at || ''
    };
  });

  const promptText = `당신은 이미 선택된 추천 카드에 대한 **짧은 코멘트**만 작성합니다.

**중요한 제약조건:**
- headline: **최대 30자 이내** (필수!)
- description: **최대 80자 이내** (필수!)
- 콜론(:) 사용 금지
- 친근하고 자연스러운 말투 사용

**사용자 정보:**
- 이름: ${displayName}
- 담당 가능 과목: ${capableSubjects.join(', ') || '미설정'}
- 관심 지역: ${interestRegions.join(', ') || '미설정'}

**선택된 카드 정보:**
${JSON.stringify(cardSummaries, null, 2)}

**작성 예시:**
\`\`\`json
{
  "headline": "화성·광주 초등 공고 6건",
  "description": "이번 주 최신 공고예요. 마감 임박한 것부터 확인하세요!"
}
\`\`\`

**반드시 JSON 형식으로만 응답하세요:**`;

  const prompt = {
    contents: [
      {
        role: 'user',
        parts: [{ text: promptText }]
      }
    ]
  };

  try {
    console.log('[AI Comment] Gemini API 호출 (코멘트 전용)...');
    const resp = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=' + apiKey,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompt)
      }
    );

    if (!resp.ok) {
      console.error('[AI Comment] Gemini API 응답 실패:', resp.status);
      return null;
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    console.log('[AI Comment] Gemini 응답:', text.substring(0, 150) + '...');

    // JSON 추출
    let jsonText = text;
    const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      jsonText = codeBlockMatch[1];
    } else {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }

    const parsed = JSON.parse(jsonText);
    const headline: string = parsed.headline ?? '';
    const description: string = parsed.description ?? '';

    if (!headline || !description) {
      console.error('[AI Comment] Gemini 응답 형식 오류 - headline/description 누락');
      return null;
    }

    // 길이 검증
    const validation = validateCommentLength(headline, description);
    if (!validation.valid) {
      console.warn('[AI Comment] 길이 검증 실패:', validation.reason);
      console.warn('[AI Comment] Gemini 응답:', { headline, description });
      return null; // 길이 초과 시 fallback으로 전환
    }

    console.log('[AI Comment] Gemini 코멘트 생성 성공 ✅', {
      headline: `${headline} (${headline.length}자)`,
      description: `${description} (${description.length}자)`
    });

    return { headline, description };
  } catch (err) {
    console.error('[AI Comment] Gemini API 호출 오류:', err);
    return null;
  }
}

/**
 * ==================== AI 코멘트 검증 함수 ====================
 * AI가 생성한 코멘트가 실제 선택된 카드와 일치하는지 검증합니다.
 */
function validateAiComment(
  headline: string,
  description: string,
  selectedCards: ScoredCard[],
  profile: UserProfileRow
): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const fullText = (headline + ' ' + description).toLowerCase();

  // 1. "마감 임박" 검증
  if (fullText.includes('마감') || fullText.includes('서둘') || fullText.includes('급해') || fullText.includes('임박')) {
    const now = new Date();
    const hasUrgent = selectedCards.some(s => {
      if (s.card.type === 'job') {
        const job = s.card as any;
        const deadline = job.deadline;
        if (deadline) {
          try {
            const deadlineDate = new Date(deadline);
            const daysLeft = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return daysLeft < 3; // 3일 이내
          } catch (_) {
            return false;
          }
        }
      }
      return false;
    });

    if (!hasUrgent) {
      warnings.push('⚠️  "마감 임박" 언급했지만 실제로 3일 이내 마감인 카드가 없음');
    }
  }

  // 2. "오늘 올라온" / "24시간" 검증
  if (fullText.includes('오늘') || fullText.includes('24시간') || fullText.includes('방금') || fullText.includes('따끈')) {
    const now = new Date();
    const hasFresh = selectedCards.some(s => {
      const createdAt = (s.card as any).created_at;
      if (createdAt) {
        try {
          const created = new Date(createdAt);
          const hoursAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
          return hoursAgo <= 24;
        } catch (_) {
          return false;
        }
      }
      return false;
    });

    if (!hasFresh) {
      warnings.push('⚠️  "오늘 올라온" 언급했지만 실제로 24시간 이내 카드가 없음');
    }
  }

  // 3. 지역 검증 (관심 지역 언급 시)
  const interestRegions = profile.interest_regions ?? [];
  if (interestRegions.length > 0) {
    const mentionedRegion = interestRegions.some(region => fullText.includes(region.toLowerCase()));

    if (mentionedRegion) {
      const hasMatchingRegion = selectedCards.some(s => {
        const location = (s.card as any).location ?? '';
        return interestRegions.some(region =>
          location.toLowerCase().includes(region.toLowerCase())
        );
      });

      if (!hasMatchingRegion) {
        warnings.push(`⚠️  관심 지역(${interestRegions.join(', ')}) 언급했지만 실제 카드에 해당 지역 없음`);
      }
    }
  }

  // 4. 과목 검증 (담당 가능 과목 언급 시)
  const capableSubjects = profile.capable_subjects ?? [];
  if (capableSubjects.length > 0) {
    const mentionedSubject = capableSubjects.some(subject => {
      const cleanSubject = subject.replace(/초등|중등|유치원|특수/g, '').trim();
      return fullText.includes(cleanSubject.toLowerCase());
    });

    if (mentionedSubject) {
      const hasMatchingSubject = selectedCards.some(s => {
        if (s.card.type === 'job') {
          const job = s.card as any;
          const jobSubject = job.subject ?? '';
          const jobTags = job.tags ?? [];

          return capableSubjects.some(subject => {
            const cleanSubject = subject.replace(/초등|중등|유치원|특수/g, '').trim();
            return jobSubject.toLowerCase().includes(cleanSubject.toLowerCase()) ||
                   jobTags.some((tag: string) => tag.toLowerCase().includes(cleanSubject.toLowerCase()));
          });
        }
        return false;
      });

      if (!hasMatchingSubject) {
        warnings.push(`⚠️  과목(${capableSubjects.join(', ')}) 언급했지만 실제 카드에 해당 과목 없음`);
      }
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  phone: string | null;
  roles: string[] | null;
  primary_region: string | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  receive_notifications: boolean | null;
  intro: string | null;
  agree_terms: boolean | null;
  agree_privacy: boolean | null;
  agree_marketing: boolean | null;
  capable_subjects: string[] | null;
  teacher_level: string | null;
  preferred_job_types: string[] | null;
  preferred_subjects: string[] | null;
  updated_at: string;
};

type JobPostingRow = {
  id: string;
  organization: string;
  title: string;
  tags: string[] | null;
  location: string;
  compensation: string | null;
  deadline: string | null;
  is_urgent: boolean | null;
  created_at: string;
  school_level: string | null;
  subject: string | null;
  required_license: string | null;
};

type TalentRow = {
  id: string;
  name: string;
  specialty: string;
  tags: string[] | null;
  location: string[] | null;
  experience_years: number | null;
  rating: number | null;
  review_count: number | null;
  is_verified: boolean | null;
  created_at: string;
};

type ScoredCard = {
  card: Record<string, unknown> & { id: string; type: 'job' | 'talent' };
  score: number;
};

const SUPPORT_KEYWORDS = ['조리', '급식', '행정', '실무사', '교무행정', '교육공무직원', '행정실', '사무직', '돌봄전담', '돌봄교실'];
const VOLUNTEER_KEYWORDS = ['자원봉사', '봉사자', '봉사활동', '돌봄봉사'];
const TEACHING_KEYWORDS = ['교사', '담임', '수업', '전담', '강사', '지도', '방과후'];

function toLowerSet(values: (string | null | undefined)[]): Set<string> {
  return new Set(values.filter((v): v is string => Boolean(v)).map((v) => v.trim().toLowerCase()));
}

const ADJACENT_REGIONS: Record<string, string[]> = {
  '서울': ['고양', '광명', '구리', '과천', '성남', '부천'],
  '고양': ['서울', '파주', '김포', '양주'],
  '수원': ['용인', '화성', '의왕', '오산'],
  '용인': ['수원', '화성', '이천', '광주'],
  '화성': ['수원', '용인', '오산', '평택'],
  '시흥': ['안산', '부천', '광명', '인천'],
  '부천': ['서울', '시흥', '김포', '광명'],
  '인천': ['시흥', '김포', '부천', '안산'],
  '김포': ['고양', '인천', '부천'],
  '안산': ['시흥', '인천', '화성'],
  '의정부': ['서울', '양주', '포천'],
  '성남': ['서울', '용인', '하남', '광주'],
  '하남': ['서울', '성남', '남양주'],
  '남양주': ['구리', '하남', '양평'],
  '평택': ['화성', '안성', '천안'],
  '안양': ['의왕', '군포', '과천'],
  '군포': ['안양', '의왕', '안산'],
  '의왕': ['수원', '안양', '군포'],
  '오산': ['수원', '화성', '평택'],
  '광주': ['성남', '용인', '이천'],
  '이천': ['용인', '광주', '여주'],
  '여주': ['이천', '양평'],
  '양평': ['여주', '남양주'],
  '춘천': ['원주', '홍천'],
  '원주': ['이천', '춘천', '제천'],
  '청주': ['세종', '대전', '천안'],
  '대전': ['청주', '세종', '논산'],
  '천안': ['평택', '청주', '아산']
};

const REGION_FALLBACKS = ['경기도', '서울', '인천'];

// 광역 지역 목록 (시/군과 구분)
const WIDE_REGIONS = new Set(['경기도', '서울', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원도', '충청북도', '충청남도', '전라북도', '전라남도', '경상북도', '경상남도', '제주도']);

function buildRegionFilter(interestRegions: string[] | null | undefined): string[] {
  const result = new Set<string>();

  if (!interestRegions || interestRegions.length === 0) {
    REGION_FALLBACKS.forEach((region) => result.add(region));
    return Array.from(result);
  }

  interestRegions.forEach((region) => {
    if (!region) return;
    const trimmed = region.trim();
    if (!trimmed) return;
    result.add(trimmed);

    const adjacent = ADJACENT_REGIONS[trimmed];
    if (adjacent) {
      adjacent.forEach((adjRegion) => result.add(adjRegion));
    }
  });

  if (result.size < 3) {
    REGION_FALLBACKS.forEach((region) => result.add(region));
  }

  return Array.from(result);
}

function classifyJobCategory(job: JobPostingRow): 'teaching' | 'support' | 'volunteer' | 'general' {
  const texts: string[] = [];
  if (job.title) texts.push(job.title);
  if (job.organization) texts.push(job.organization);
  if (job.required_license) texts.push(job.required_license);
  if (job.subject) texts.push(job.subject);
  if (Array.isArray(job.tags)) texts.push(...job.tags);
  const combined = texts.join(' ').toLowerCase();

  const hasKeyword = (keywords: string[]) => keywords.some((keyword) => combined.includes(keyword));

  if (hasKeyword(VOLUNTEER_KEYWORDS)) {
    return 'volunteer';
  }

  if (hasKeyword(SUPPORT_KEYWORDS)) {
    return 'support';
  }

  if (job.subject || job.school_level) {
    return 'teaching';
  }

  if (hasKeyword(TEACHING_KEYWORDS)) {
    return 'teaching';
  }

  return 'general';
}

function matchesPreferredRegion(location: string, regionSet: Set<string>): boolean {
  if (!location) return false;
  const normalizedLocation = location.toLowerCase();
  for (const region of regionSet) {
    if (normalizedLocation.includes(region)) {
      return true;
    }
  }
  return false;
}

/**
 * 교과 담당 가능 여부 검사
 * @param capableSubjects - 사용자 프로필의 capable_subjects
 * @param jobSchoolLevel - 공고의 school_level
 * @param jobSubject - 공고의 subject
 * @returns boolean - 담당 가능하면 true, 불가능하면 false
 */
function isCapableOfTeaching(
  capableSubjects: string[] | null | undefined,
  jobSchoolLevel: string | null | undefined,
  jobSubject: string | null | undefined,
  profileTeacherLevel: string | null | undefined
): boolean {
  // 공고에 학교급 정보가 없으면 포함(호환성 검사 불가)
  if (!jobSchoolLevel) return true;
  
  // 프로필에 capable_subjects가 없으면 teacher_level 기준으로 필터링
  if (!capableSubjects || capableSubjects.length === 0) {
    // teacher_level이 있으면 이를 기준으로 필터링
    if (profileTeacherLevel) {
      const profileLevel = profileTeacherLevel.toLowerCase().trim();
      const jobLevel = jobSchoolLevel.toLowerCase().trim();
      
      // 유치원: 유치원만 가능
      if (profileLevel === '유치원') {
        return jobLevel === '유치원';
      }
      
      // 초등: 초등만 가능 (담임이므로 모든 초등 과목 가능)
      if (profileLevel === '초등') {
        return jobLevel === '초등';
      }
      
      // 중등: capable_subjects 없으면 제외 (과목 정보 필수)
      if (profileLevel === '중등') {
        return false;
      }
      
      // 특수: 특수만 가능
      if (profileLevel === '특수') {
        return jobLevel === '특수';
      }
      
      // 정확히 일치해야만 통과
      return profileLevel === jobLevel;
    }
    
    // teacher_level도 없으면 제외 (안전 우선)
    return false;
  }

  // capable_subjects를 배열로 변환
  const subjects = Array.isArray(capableSubjects) ? capableSubjects : [capableSubjects];
  const normalizedSubjects = subjects.map(s => s?.toLowerCase().trim()).filter(Boolean);

  // 공고 학교급 정규화
  const jobLevel = jobSchoolLevel.toLowerCase().trim();
  const jobSubj = jobSubject?.toLowerCase().trim();

  // 호환성 매트릭스
  for (const profileSubject of normalizedSubjects) {
    // 초등 담임 프로필
    if (profileSubject.includes('초등') && profileSubject.includes('담임')) {
      // 초등 담임, 초등 모든 과목 가능
      if (jobLevel === '초등') return true;
    }
    
    // 초등 과목 전담 프로필 (예: 초등 과학, 초등 영어)
    if (profileSubject.includes('초등')) {
      // 초등 공고만 가능
      if (jobLevel === '초등') {
        // 과목이 일치하거나 공고에 과목 정보가 없으면 포함
        if (!jobSubj) return true;
        if (profileSubject.includes('과학') && jobSubj === '과학') return true;
        if (profileSubject.includes('영어') && jobSubj === '영어') return true;
        if (profileSubject.includes('체육') && jobSubj === '체육') return true;
        if (profileSubject.includes('음악') && jobSubj === '음악') return true;
        if (profileSubject.includes('미술') && jobSubj === '미술') return true;
        if (profileSubject.includes('실과') && jobSubj === '실과') return true;
      }
    }
    
    // 중등 과목 프로필 (예: 중등 국어, 중등 물리, 중등 한문)
    if (profileSubject.includes('중등')) {
      // 중등 공고는 항상 가능
      if (jobLevel === '중등') {
        if (!jobSubj) return true;

        // 과학 세분화 과목: 물리/화학/생물/지구과학 → "과학" 공고 포함
        const scienceSubjects = ['물리', '화학', '생물', '지구과학'];
        const hasScienceSubject = scienceSubjects.some(sci => profileSubject.includes(sci));
        if (hasScienceSubject && jobSubj === '과학') return true;

        // 정확 매칭
        if (profileSubject.includes('물리') && jobSubj === '물리') return true;
        if (profileSubject.includes('화학') && jobSubj === '화학') return true;
        if (profileSubject.includes('생물') && jobSubj === '생물') return true;
        if (profileSubject.includes('지구과학') && jobSubj === '지구과학') return true;
        if (profileSubject.includes('영어') && jobSubj === '영어') return true;
        if (profileSubject.includes('체육') && jobSubj === '체육') return true;
        if (profileSubject.includes('음악') && jobSubj === '음악') return true;
        if (profileSubject.includes('미술') && jobSubj === '미술') return true;
        if (profileSubject.includes('국어') && jobSubj === '국어') return true;
        if (profileSubject.includes('수학') && jobSubj === '수학') return true;
        if (profileSubject.includes('사회') && jobSubj === '사회') return true;
        if (profileSubject.includes('윤리') && (jobSubj === '윤리' || jobSubj === '도덕')) return true;
        if (profileSubject.includes('상담') && (jobSubj === '상담' || jobSubj === '생활지도')) return true;
        if (profileSubject.includes('진로') && jobSubj === '진로') return true;
        if (profileSubject.includes('역사') && jobSubj === '역사') return true;

        // 기타 직접 입력 과목 (예: 중등 한문, 중등 일본어)
        const subjectName = profileSubject.replace('중등', '').trim();
        if (jobSubj && jobSubj.includes(subjectName.toLowerCase())) return true;
      }
      // 중등 과목 교사는 초등 해당 과목 전담 가능 (상향식 호환)
      if (jobLevel === '초등') {
        if (!jobSubj) return false;

        // 과학 세분화 과목도 초등 과학 전담 가능
        const scienceSubjects = ['물리', '화학', '생물', '지구과학', '과학'];
        const hasScienceSubject = scienceSubjects.some(sci => profileSubject.includes(sci));
        if (hasScienceSubject && jobSubj === '과학') return true;

        if (profileSubject.includes('영어') && jobSubj === '영어') return true;
        if (profileSubject.includes('체육') && jobSubj === '체육') return true;
        if (profileSubject.includes('음악') && jobSubj === '음악') return true;
        if (profileSubject.includes('미술') && jobSubj === '미술') return true;
      }
    }
    
    // 유치원 프로필
    if (profileSubject.includes('유치원')) {
      if (jobLevel === '유치원') return true;
    }
    
    // 특수 프로필
    if (profileSubject.includes('특수')) {
      if (jobLevel === '특수') return true;
    }
  }

  // 공고에 학교급 정보가 있지만 호환 안 됨 -> 제외
  return false;
}

function getRegionKey(location: string | null | undefined): string {
  if (!location) return '기타';
  // 예: "경기도 성남시 분당구" → "성남"
  const lowered = location.toLowerCase();
  const tokens = lowered.replace(/\s+/g, ' ').split(' ');
  // 시/군 이름 추출 우선
  const candidates = ['서울','성남','수원','용인','화성','시흥','부천','인천','고양','광명','구리','과천','김포','안산','의정부','하남','남양주','평택','안양','군포','의왕','오산','광주','이천','여주','양평','춘천','원주','청주','대전','천안'];
  for (const t of tokens) {
    const tnorm = t.replace(/시|군|구/g, '');
    if (candidates.some((c) => tnorm.includes(c))) {
      return tnorm.replace(/시|군|구/g, '').replace('경기도','').trim() || '기타';
    }
  }
  // 첫 토큰 폴백
  return tokens[0] ?? '기타';
}

function scoreJobCard(profile: UserProfileRow, job: JobPostingRow, preferredRegions: Set<string>): ScoredCard {
  const interestRegions = profile.interest_regions ?? [];
  const roles = profile.roles ?? [];

  let score = 0;

  const category = classifyJobCategory(job);

  // 지역 점수 (단순화 - 관심지역 일치 시 강화)
  if (job.location && matchesPreferredRegion(job.location, preferredRegions)) {
    score += 8;
  }

  const roleSet = toLowerSet(roles);
  const isAdminRole = roleSet.has('기타');

  // 학교행정 역할('기타')은 support/volunteer 공고만 추천
  if (isAdminRole) {
    if (category !== 'support' && category !== 'volunteer') {
      return {
        score: -999,
        card: {
          id: job.id,
          type: 'job',
          organization: job.organization,
          title: job.title,
          tags: job.tags ?? [],
          location: job.location,
          compensation: job.compensation ?? '',
          deadline: job.deadline,
          isUrgent: Boolean(job.is_urgent)
        }
      };
    }
  } else {
    // 교과 담당 가능 여부 검사 (불가능 시 즉시 제외) - 교사/강사 역할만
    if (!isCapableOfTeaching(profile.capable_subjects, job.school_level, job.subject, profile.teacher_level)) {
      return {
        score: -999,
        card: {
          id: job.id,
          type: 'job',
          organization: job.organization,
          title: job.title,
          tags: job.tags ?? [],
          location: job.location,
          compensation: job.compensation ?? '',
          deadline: job.deadline,
          isUrgent: Boolean(job.is_urgent)
        }
      };
    }
  }

  // 과목 매칭 (호환성 통과한 경우 추가 가점)
  if (profile.capable_subjects && profile.capable_subjects.length > 0) {
    const capableSet = toLowerSet(profile.capable_subjects);
    const jobSubj = job.subject?.toLowerCase();
    if (jobSubj && capableSet.has(jobSubj)) {
      score += 10; // 교과 정확 일치 시 강한 가점
    }
  }

  if (Array.isArray(job.tags) && job.tags.length > 0 && roles.length > 0) {
    const jobTags = toLowerSet(job.tags);
    const profileRoles = toLowerSet(roles);
    for (const role of profileRoles) {
      if (jobTags.has(role)) {
        score += 2;
      }
    }
  }

  if (roleSet.has('교사')) {
    if (category === 'teaching') score += 25;
    if (category === 'support') score -= 40;
    if (category === 'volunteer') score -= 45;
    if (category === 'general') score -= 10;
  }

  if (roleSet.has('강사')) {
    if (category === 'teaching') score += 12;
    if (category === 'support') score -= 15;
    if (category === 'volunteer') score -= 20;
  }

  if (roleSet.has('기타')) {
    if (category === 'support') score += 28;
    if (category === 'volunteer') score += 26;
    if (category === 'teaching') score -= 12;
  }

  if (roleSet.has('업체')) {
    if (category === 'support') score += 8;
  }

  // 마감 임박 및 긴급 공고 가중치 (최우선)
  const now = new Date();
  let isDeadlineNear = false;

  if (job.deadline) {
    try {
      const deadline = new Date(job.deadline);
      const todayStart = new Date(now.toDateString());

      // 마감 지난 공고는 강한 패널티(사실상 제외)
      if (!isNaN(deadline.getTime()) && deadline.getTime() < todayStart.getTime()) {
        score -= 100;
      } else if (deadline.getTime() >= todayStart.getTime()) {
        // 마감 임박 공고 우선순위 대폭 상향
        const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDeadline <= 1) {
          // 내일까지 마감: 최고 우선순위
          score += 50;
          isDeadlineNear = true;
        } else if (daysUntilDeadline <= 2) {
          // 2일 내 마감: 매우 높은 우선순위
          score += 35;
          isDeadlineNear = true;
        } else if (daysUntilDeadline <= 3) {
          // 3일 내 마감: 높은 우선순위
          score += 20;
        } else if (daysUntilDeadline <= 7) {
          // 일주일 내 마감: 중간 우선순위
          score += 8;
        }
      }
    } catch(_) {}
  }

  // is_urgent 플래그 가중치 (마감일 임박과 함께 있으면 더 강화)
  if (job.is_urgent) {
    score += isDeadlineNear ? 25 : 15;
  }

  // 최신성 가중치: 점진적 감점으로 변경 (1~2주 공고도 추천 가능하도록)
  try {
    const created = new Date(job.created_at);
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (!isNaN(days)) {
      if (days <= 3) {
        score += 3;  // 3일 이내: 보너스
      } else if (days <= 7) {
        score += 1;  // 1주 이내: 약간 보너스
      } else if (days <= 14) {
        score -= 5;  // 2주 이내: 약한 패널티 (교사는 -5, 기타는 여전히 가능)
      } else {
        score -= isAdminRole ? -18 : -30;  // 2주 초과: 강한 패널티 (-100 → -30으로 완화)
      }
    }
  } catch(_) {}

  return {
    score,
    card: {
      id: job.id,
      type: 'job',
      organization: job.organization,
      title: job.title,
      tags: job.tags ?? [],
      location: job.location,
      compensation: job.compensation ?? '',
      deadline: job.deadline,
      isUrgent: Boolean(job.is_urgent)
    }
  };
}

function scoreTalentCard(profile: UserProfileRow, talent: TalentRow, preferredRegions: Set<string>): ScoredCard {
  const interestRegions = profile.interest_regions ?? [];
  const roles = profile.roles ?? [];

  const talentLocations = (talent.location ?? []).map((loc) => loc?.trim()).filter((loc): loc is string => Boolean(loc));
  const talentTags = toLowerSet(talent.tags ?? []);
  const profileRoles = toLowerSet(roles);

  let score = 0;

  // 지역 점수 (단순화)
  if (talentLocations.some((loc) => matchesPreferredRegion(loc, preferredRegions))) {
    score += 8;
  } else if (interestRegions.some((region) => region && talentLocations.includes(region.trim()))) {
    score += 4;
  }

  for (const role of profileRoles) {
    if (talentTags.has(role) || talent.specialty?.toLowerCase().includes(role)) {
      score += 3;
    }
  }

  if (profileRoles.has('교사')) {
    score -= 15;
  }

  if (profileRoles.has('기타')) {
    score -= 40;
  }

  if ((talent.rating ?? 0) >= 4.5) {
    score += 1;
  }

  return {
    score,
    card: {
      id: talent.id,
      type: 'talent',
      isVerified: Boolean(talent.is_verified),
      name: talent.name,
      specialty: talent.specialty,
      tags: talent.tags ?? [],
      location: talentLocations.join(', '),
      experience: talent.experience_years ? `${talent.experience_years}년 이상` : '경력 정보 없음',
      rating: talent.rating ?? 0,
      reviewCount: talent.review_count ?? 0
    }
  };
}

function selectWithRegionMix(
  scoredCards: ScoredCard[],
  interestRegions: string[]
): { selected: ScoredCard[]; discarded: ScoredCard[] } {
  const MIN_SCORE = 0; // 너무 빈 결과 방지
  const filtered = scoredCards.filter((s) => s.score >= MIN_SCORE);
  const sorted = filtered.sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id));

  // 버킷: 지역별 상위 카드 정렬
  const buckets = new Map<string, ScoredCard[]>();
  for (const item of sorted) {
    const key = getRegionKey((item.card as any).location ?? null);
    const arr = buckets.get(key) ?? [];
    arr.push(item);
    buckets.set(key, arr);
  }

  // 선호 지역 순서 우선, 그 다음 기타 지역
  const normalizedInterest = (interestRegions ?? []).map((r) => getRegionKey(r));
  const otherRegions = Array.from(buckets.keys()).filter((k) => !normalizedInterest.includes(k));
  const regionOrder = [...normalizedInterest, ...otherRegions];

  const selected: ScoredCard[] = [];
  const perRegionCap = 2; // 동일 지역 최대 2개
  const regionCount = new Map<string, number>();

  // 라운드 로빈으로 지역을 섞어가며 선별
  while (selected.length < 6) {
    let progressed = false;
    for (const region of regionOrder) {
      if (selected.length >= 6) break;
      const cap = regionCount.get(region) ?? 0;
      if (cap >= perRegionCap) continue;
      const bucket = buckets.get(region);
      if (bucket && bucket.length > 0) {
        selected.push(bucket.shift()!);
        regionCount.set(region, cap + 1);
        progressed = true;
      }
    }
    if (!progressed) break; // 더 이상 뽑을 카드가 없음
  }

  // 모자라면 점수순으로 남은 카드 채우기
  if (selected.length < 6) {
    for (const item of sorted) {
      if (selected.length >= 6) break;
      if (!selected.some((s) => s.card.id === item.card.id)) {
        selected.push(item);
      }
    }
  }

  const selectedIds = new Set(selected.map((s) => s.card.id));
  const discarded = scoredCards.filter((s) => !selectedIds.has(s.card.id));
  return { selected, discarded };
}

// ==================== AI 코멘트 개선: 메타데이터 분석 함수 ====================

/**
 * 1. 지역 매칭 상태 분석
 */
function analyzeRegionMatching(
  selected: ScoredCard[],
  interestRegions: string[] | null | undefined
): {
  exactMatch: number;
  adjacentMatch: number;
  expandedMatch: number;
  regions: string[];
  userSpecificRegions: string[]; // 사용자가 선택한 구체적 시/군 (광역 지역 제외)
} {
  // 사용자가 선택한 구체적인 시/군만 추출 (광역 지역 제외)
  const userSpecificRegions = (interestRegions ?? [])
    .filter(region => !WIDE_REGIONS.has(region))
    .map(r => r.toLowerCase());

  const regionCounts = new Map<string, number>();

  let exactMatch = 0;
  let adjacentMatch = 0;
  let expandedMatch = 0;

  for (const item of selected) {
    if (item.card.type !== 'job') continue;
    const location = (item.card as any).location ?? '';
    const regionKey = getRegionKey(location).toLowerCase();

    regionCounts.set(regionKey, (regionCounts.get(regionKey) ?? 0) + 1);

    // 정확 일치 확인 (광역 지역 제외한 구체적 시/군 기준)
    if (userSpecificRegions.some(ur => regionKey.includes(ur) || ur.includes(regionKey))) {
      exactMatch++;
    } else {
      // 인접 지역 확인
      const isAdjacent = userSpecificRegions.some(userRegion => {
        const adjacentList = ADJACENT_REGIONS[userRegion] ?? [];
        return adjacentList.some(adj => regionKey.includes(adj.toLowerCase()) || adj.toLowerCase().includes(regionKey));
      });

      if (isAdjacent) {
        adjacentMatch++;
      } else {
        expandedMatch++;
      }
    }
  }

  const regions = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 4);

  return { exactMatch, adjacentMatch, expandedMatch, regions, userSpecificRegions };
}

/**
 * 2. 시간 긴급도 분석
 */
function analyzeUrgency(selected: ScoredCard[]): {
  urgent: number;
  within24h: number;
  within3days: number;
  deadlineNear: number;
  deadlineSoon: Array<{ organization: string; deadline: string }>;
} {
  let urgent = 0;
  let within24h = 0;
  let within3days = 0;
  let deadlineNear = 0;
  const deadlineSoon: Array<{ organization: string; deadline: string }> = [];

  const now = new Date();
  const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  for (const item of selected) {
    if (item.card.type !== 'job') continue;

    const jobCard = item.card as any;

    // 긴급 공고
    if (jobCard.isUrgent) {
      urgent++;
    }

    // 생성일 기준 분석
    try {
      const createdAt = new Date(jobCard.created_at ?? '');
      if (!isNaN(createdAt.getTime())) {
        const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        if (hoursDiff <= 24) within24h++;
        else if (hoursDiff <= 72) within3days++;
      }
    } catch (_) {}

    // 마감일 임박 분석
    if (jobCard.deadline) {
      try {
        const deadline = new Date(jobCard.deadline);
        if (!isNaN(deadline.getTime()) && deadline.getTime() > now.getTime()) {
          if (deadline.getTime() <= twoDaysLater.getTime()) {
            deadlineNear++;
            deadlineSoon.push({
              organization: jobCard.organization ?? '학교',
              deadline: jobCard.deadline
            });
          }
        }
      } catch (_) {}
    }
  }

  return { urgent, within24h, within3days, deadlineNear, deadlineSoon };
}

/**
 * 3. 교과 호환성 분석
 */
function analyzeSubjectCompatibility(
  selected: ScoredCard[],
  capableSubjects: string[] | null | undefined,
  teacherLevel: string | null | undefined
): {
  exactMatch: number;
  upwardCompatible: number;
  general: number;
} {
  let exactMatch = 0;
  let upwardCompatible = 0;
  let general = 0;

  const capableSet = toLowerSet(capableSubjects ?? []);
  const levelLower = teacherLevel?.toLowerCase().trim();

  for (const item of selected) {
    if (item.card.type !== 'job') continue;

    const jobCard = item.card as any;
    const jobLevel = (jobCard.school_level ?? '').toLowerCase().trim();
    const jobSubj = (jobCard.subject ?? '').toLowerCase().trim();

    if (!jobLevel) {
      general++;
      continue;
    }

    // 교과 정확 일치
    let matched = false;
    if (capableSet.size > 0 && jobSubj) {
      if (capableSet.has(jobSubj)) {
        exactMatch++;
        matched = true;
        continue;
      }
    }

    // 상향식 호환 (중등 → 초등)
    if (!matched && levelLower === '중등' && jobLevel === '초등' && jobSubj) {
      // 중등 과학 → 초등 과학 등
      const hasSameSubject = Array.from(capableSet).some(cap => cap.includes(jobSubj));
      if (hasSameSubject) {
        upwardCompatible++;
        matched = true;
        continue;
      }
    }

    if (!matched) {
      general++;
    }
  }

  return { exactMatch, upwardCompatible, general };
}

/**
 * 4. 지역 분포 분석
 */
function analyzeRegionDistribution(selected: ScoredCard[]): {
  isDiverse: boolean;
  topRegion: string;
  regionCounts: Map<string, number>;
} {
  const regionCounts = new Map<string, number>();

  for (const item of selected) {
    const location = (item.card as any).location ?? '';
    const regionKey = getRegionKey(location);
    regionCounts.set(regionKey, (regionCounts.get(regionKey) ?? 0) + 1);
  }

  const sortedRegions = Array.from(regionCounts.entries()).sort((a, b) => b[1] - a[1]);
  const topRegion = sortedRegions[0]?.[0] ?? '기타';
  const topCount = sortedRegions[0]?.[1] ?? 0;
  const totalCount = selected.length;

  // 상위 지역이 전체의 60% 이하면 다양하다고 판단
  const isDiverse = totalCount > 0 && topCount / totalCount <= 0.6;

  return { isDiverse, topRegion, regionCounts };
}

/**
 * 5. 종합 상황 판단
 */
function determineScenario(
  regionAnalysis: ReturnType<typeof analyzeRegionMatching>,
  urgencyAnalysis: ReturnType<typeof analyzeUrgency>,
  subjectAnalysis: ReturnType<typeof analyzeSubjectCompatibility>,
  distributionAnalysis: ReturnType<typeof analyzeRegionDistribution>,
  selectedCount: number
): 'perfect_match' | 'region_expanded' | 'upward_compatible' | 'urgent' | 'fresh' | 'diverse' | 'default' {
  // 우선순위 1: 긴급/마감 임박
  if (urgencyAnalysis.deadlineNear >= 2 || urgencyAnalysis.urgent >= 2) {
    return 'urgent';
  }

  // 우선순위 2: 최신 공고 (24시간 내)
  if (urgencyAnalysis.within24h >= 3) {
    return 'fresh';
  }

  // 우선순위 3: 상향식 호환 (중등→초등)
  if (subjectAnalysis.upwardCompatible >= 2 && selectedCount >= 4) {
    return 'upward_compatible';
  }

  // 우선순위 4: 완벽 매칭 (정확 일치 많음)
  if (regionAnalysis.exactMatch >= 4 && subjectAnalysis.exactMatch >= 3) {
    return 'perfect_match';
  }

  // 우선순위 5: 지역 다양성
  if (distributionAnalysis.isDiverse && regionAnalysis.regions.length >= 3) {
    return 'diverse';
  }

  // 우선순위 6: 지역 확대
  if (regionAnalysis.adjacentMatch >= 2 || regionAnalysis.expandedMatch >= 2) {
    return 'region_expanded';
  }

  // 기본
  return 'default';
}

/**
 * 6. 시나리오별 AI 코멘트 템플릿
 */
const AI_COMMENT_TEMPLATES = {
  perfect_match: {
    headlines: [
      '{name}님 딱 맞춤! {region} {subject} 공고예요',
      '선생님이 찾던 조건 그대로예요',
      '정확히 일치하는 공고만 골랐어요'
    ],
    descriptions: [
      '선생님이 찾던 조건 그대로예요. {region} 지역 {subject} 공고 {count}건, 모두 일주일 내 올라온 거라 경쟁률도 낮을 거예요.',
      '어제오늘 올라온 따끈한 공고들이에요. {region} {subject}만 골라놨으니 하나씩 확인해보세요.',
      '선생님 프로필 보니까 {subject} 찾으시는군요! 마침 {region}에 {count}건이나 있네요. 다 최근 공고라 아직 지원자도 많이 없을 거예요.'
    ]
  },

  region_expanded: {
    headlines: [
      '{primaryRegion}은 좀 적어서... {adjacentRegions} 같이 봤어요',
      '{primaryRegion} 외 인근 지역도 함께 살펴봤어요',
      '출퇴근 가능한 범위로 넓혀봤어요'
    ],
    descriptions: [
      '{primaryRegion}에 신규 공고가 적어서 걱정하실까봐 인근 {adjacentRegions}도 포함했어요. 다 차로 30분 거리예요.',
      '이번 주 {primaryRegion} 공고가 별로 안 올라왔더라고요. 그래서 가까운 {adjacentRegions}까지 넓혀봤어요. 요즘 인근 지역에 교사 수요가 많아서 조건도 괜찮은 것 같아요.',
      '{primaryRegion}만 보기엔 선택지가 좁을까봐, 출퇴근 가능한 인접 지역도 함께 정리했어요. {count}건 중에 마음에 드는 학교 있으시면 좋겠네요!'
    ]
  },

  upward_compatible: {
    headlines: [
      '중등 {subject} 자격증? 초등 전담도 지원 가능해요!',
      '중등 자격증으로 초등 공고도 지원할 수 있어요',
      '초등 전담 공고도 함께 추천드려요'
    ],
    descriptions: [
      '혹시 모르셨을 수도 있는데, 선생님 중등 {subject} 자격증으로 초등 {subject} 전담도 할 수 있어요. 초등이 근무 환경이 더 편하다는 분들도 많더라고요!',
      '중등 {subject} 자격 갖고 계시니까 초등 {subject} 전담 공고도 함께 추천드려요. 실제로 중등 출신 선생님들이 초등에서 만족도 높게 근무하시는 경우 많아요.',
      '선생님 프로필 보니 중등 {subject}이시네요. 그럼 초등 {subject} 전담도 가능한 거 아시죠? 요즘 초등에서 전문성 있는 선생님 많이 찾고 있어요.'
    ]
  },

  urgent: {
    headlines: [
      '서둘러요! 내일까지 마감인 공고 {deadlineCount}건 있어요',
      '시간이 없어요! 곧 마감되는 공고부터 봐요',
      '마감 임박 공고 먼저 확인하세요'
    ],
    descriptions: [
      '아이고, 이거 급해요! {urgentList} 빨리 확인하세요. 조건도 좋은데 시간이 촉박하네요. 서류는 미리 준비되셨죠?',
      '마감 임박 공고부터 보여드릴게요. 48시간 내 마감이 {deadlineCount}건이에요. 특히 첫 번째 카드는 선생님 조건이랑 정확히 맞아서 놓치면 아까울 것 같아요.',
      '시간이 없어요! 선생님 조건에 맞는 공고 중에 곧 마감되는 게 있어서 먼저 정리했어요. 오늘 중으로 지원서 넣으시는 게 좋겠어요.'
    ]
  },

  fresh: {
    headlines: [
      '오늘 아침 올라온 따끈따끈한 공고부터!',
      '신선한 공고만 골라봤어요',
      '24시간 내 신규 공고 {freshCount}건이에요'
    ],
    descriptions: [
      '방금 전 확인했는데 오늘 새벽에 올라온 공고가 {freshCount}건이나 있네요! 아직 지원자가 거의 없을 거예요. 먼저 보시는 분이 임자죠.',
      '24시간 내 새로 올라온 공고만 정리했어요. 신규 공고는 경쟁률이 낮아서 합격 확률이 높거든요. {region} 지역 {count}건 모두 최신이에요.',
      '이번 주 월·화에 올라온 최신 공고들이에요. 주말에 올라온 건 이미 지원자가 몰렸을 수 있어서 제외했어요. 신선한 공고만 골랐으니 서두르세요!'
    ]
  },

  diverse: {
    headlines: [
      '{region1}만? 아니에요! {region2}·{region3}도 골고루 섞었어요',
      '여러 지역 골고루 섞어봤어요',
      '지역별로 균형있게 추천드려요'
    ],
    descriptions: [
      '한 지역만 보면 선택의 폭이 좁잖아요. {regionList} 골고루 섞어서 추천드려요. 이 중에 마음에 드는 학교 있으시면 좋겠네요!',
      '지역별로 다양하게 보실 수 있도록 균형있게 골랐어요. 각 지역마다 학교 분위기가 다르니까 비교해보시고 선택하세요. 개인적으론 {topRegion} 쪽이 처우가 좋더라고요.',
      '{primaryRegion}에만 매달리지 마시고 옵션을 넓혀보세요. {otherRegions}도 괜찮은 공고 많아요. 특히 신설 학교가 많아서 시설이 정말 좋대요!'
    ]
  },

  default: {
    headlines: [
      '{name}님 프로필에 맞춰 추천했어요',
      '최신 공고 위주로 정리했어요',
      '관심 조건에 맞는 공고들이에요'
    ],
    descriptions: [
      '{region} 지역 기준으로 최근 올라온 공고 {count}건을 정리했어요. 하나씩 확인해보세요.',
      '선생님 조건에 맞는 공고를 우선순위로 정렬했어요. 최신순이고 마감 임박한 것부터 배치했습니다.',
      '프로필 정보를 더 채워주시면 더 정확한 맞춤 추천이 가능해요. 담당 가능 과목이랑 선호 지역만 알려주시면 딱 맞는 공고를 찾아드릴 수 있어요.'
    ]
  }
};

// ==================== 새로운 AI 코멘트 함수 (개선됨) ====================

function generateAiComment(profile: UserProfileRow, selected: ScoredCard[], discardedCount: number) {
  const displayName = profile.display_name ?? '선생님';
  const interestRegions = profile.interest_regions ?? [];

  // 빈 결과 처리
  if (selected.length === 0) {
    return {
      headline: '추천을 준비 중이에요',
      description: '아직 조건에 꼭 맞는 추천 카드가 부족해요. 프로필 정보를 더 채워주시면 맞춤 공고를 찾아드릴 수 있어요.',
      diagnostics: {
        scenario: 'empty',
        selectedCount: 0,
        discardedCount
      }
    };
  }

  // 1. 메타데이터 분석
  const regionAnalysis = analyzeRegionMatching(selected, interestRegions);
  const urgencyAnalysis = analyzeUrgency(selected);
  const subjectAnalysis = analyzeSubjectCompatibility(
    selected,
    profile.capable_subjects,
    profile.teacher_level
  );
  const distributionAnalysis = analyzeRegionDistribution(selected);

  // 2. 시나리오 판단
  const scenario = determineScenario(
    regionAnalysis,
    urgencyAnalysis,
    subjectAnalysis,
    distributionAnalysis,
    selected.length
  );

  // 3. 템플릿 선택 (랜덤)
  const template = AI_COMMENT_TEMPLATES[scenario];
  const headlineIndex = Math.floor(Math.random() * template.headlines.length);
  const descIndex = Math.floor(Math.random() * template.descriptions.length);

  // 4. 플레이스홀더 치환을 위한 변수 준비
  const primaryRegion = interestRegions[0] || '경기도';
  const regions = regionAnalysis.regions.length > 0 ? regionAnalysis.regions : [primaryRegion];
  const adjacentRegions = regions.slice(1, 3).join('·') || '인근 지역';
  const subject = profile.capable_subjects?.[0] || '과목';
  const subjectClean = subject.replace(/초등|중등|유치원|특수/g, '').trim() || '과목';

  const urgentList = urgencyAnalysis.deadlineSoon
    .slice(0, 2)
    .map(item => item.organization)
    .join(', ') || '마감 임박 공고';

  const regionList = regions.slice(0, 3).join('·');
  const otherRegions = regions.slice(1).join('·') || '인근 지역';

  const variables: Record<string, string | number> = {
    name: displayName,
    region: regions[0] || primaryRegion,
    region1: regions[0] || primaryRegion,
    region2: regions[1] || '',
    region3: regions[2] || '',
    subject: subjectClean,
    count: selected.length,
    primaryRegion,
    adjacentRegions,
    urgentList,
    deadlineCount: urgencyAnalysis.deadlineNear,
    freshCount: urgencyAnalysis.within24h,
    regionList,
    otherRegions,
    topRegion: distributionAnalysis.topRegion
  };

  // 5. 플레이스홀더 치환
  let headline = template.headlines[headlineIndex];
  let description = template.descriptions[descIndex];

  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    headline = headline.replace(regex, String(value));
    description = description.replace(regex, String(value));
  });

  // 6. 결과 반환
  return {
    headline,
    description,
    diagnostics: {
      scenario,
      selectedCount: selected.length,
      discardedCount,
      regionAnalysis,
      urgencyAnalysis,
      subjectAnalysis,
      distributionAnalysis
    }
  };
}

async function fetchProfile(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error} = await client
    .from('user_profiles')
    .select('user_id, display_name, roles, interest_regions, experience_years, intro, capable_subjects, teacher_level, updated_at')
    .eq('user_id', userId)
    .maybeSingle<UserProfileRow>();

  if (error) {
    console.error('[profile-recommendations] 프로필 조회 실패', error);
    throw new Response(JSON.stringify({ message: '프로필을 불러오지 못했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!data) {
    throw new Response(JSON.stringify({ message: '프로필이 아직 등록되지 않았습니다.' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return data;
}

async function fetchJobCandidates(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from('job_postings')
    .select('id, organization, title, tags, location, compensation, deadline, is_urgent, created_at, school_level, subject, required_license')
    .order('is_urgent', { ascending: false })
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100);  // 60개 → 100개로 확대 (더 다양한 후보 풀)

  if (error) {
    console.error('[profile-recommendations] 공고 후보 조회 실패', error);
    throw new Response(JSON.stringify({ message: '추천 공고를 불러오지 못했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return (data ?? []) as JobPostingRow[];
}

async function fetchTalentCandidates(client: ReturnType<typeof createClient>) {
  const { data, error } = await client
    .from('talents')
    .select('id, name, specialty, tags, location, experience_years, rating, review_count, is_verified, created_at')
    .order('is_verified', { ascending: false })
    .order('rating', { ascending: false })
    .limit(40);

  if (error) {
    console.error('[profile-recommendations] 인재 후보 조회 실패', error);
    throw new Response(JSON.stringify({ message: '추천 인재를 불러오지 못했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return (data ?? []) as TalentRow[];
}

async function upsertRecommendations(
  client: ReturnType<typeof createClient>,
  payload: {
    user_id: string;
    cards: unknown[];
    ai_comment: Record<string, unknown>;
    profile_snapshot: Record<string, unknown>;
  }
) {
  const { error } = await client
    .from('recommendations_cache')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    console.error('[profile-recommendations] 추천 캐시 저장 실패', error);
    throw new Response(JSON.stringify({ message: '추천 결과를 저장하지 못했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  const authHeader = req.headers.get('Authorization');

  if (!authHeader) {
    return new Response(JSON.stringify({ message: '인증 토큰이 필요합니다.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const client = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader }
    }
  });

  const {
    data: { user },
    error: authError
  } = await client.auth.getUser();

  if (authError || !user) {
    console.error('[profile-recommendations] 사용자 인증 실패', authError);
    return new Response(JSON.stringify({ message: '사용자를 확인할 수 없습니다.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    console.log('[Phase 1] 추천 생성 시작 - user_id:', user.id);
    const profile = await fetchProfile(client, user.id);
    console.log('[Phase 1] 프로필 조회 완료:', {
      display_name: profile.display_name,
      roles: profile.roles,
      interest_regions: profile.interest_regions,
      capable_subjects: profile.capable_subjects,
      teacher_level: profile.teacher_level
    });

    const preferredRegions = buildRegionFilter(profile.interest_regions);
    const preferredRegionSet = new Set(preferredRegions.map((region) => region.toLowerCase()));
    console.log('[Phase 1] 지역 필터 생성:', preferredRegions);

    const [jobCandidates, talentCandidates] = await Promise.all([
      fetchJobCandidates(client),
      fetchTalentCandidates(client)
    ]);
    console.log('[Phase 1] 후보 조회 완료 - jobs:', jobCandidates.length, 'talents:', talentCandidates.length);

    const prioritizedJobCandidates = jobCandidates.filter((job) => job.location && matchesPreferredRegion(job.location, preferredRegionSet));
    const fallbackJobCandidates = jobCandidates.filter((job) => !prioritizedJobCandidates.includes(job));
    const orderedJobCandidates = [...prioritizedJobCandidates, ...fallbackJobCandidates];

    const prioritizedTalentCandidates = talentCandidates.filter((talent) =>
      (talent.location ?? []).some((loc) => loc && matchesPreferredRegion(loc, preferredRegionSet))
    );
    const fallbackTalentCandidates = talentCandidates.filter((talent) => !prioritizedTalentCandidates.includes(talent));
    const orderedTalentCandidates = [...prioritizedTalentCandidates, ...fallbackTalentCandidates];

    const scoredJobs = orderedJobCandidates.map((job) => scoreJobCard(profile, job, preferredRegionSet));
    const scoredTalents = orderedTalentCandidates.map((talent) => scoreTalentCard(profile, talent, preferredRegionSet));
    const scoredAll = [...scoredJobs, ...scoredTalents];
    console.log('[Phase 1] 점수 계산 완료:', {
      총_후보: scoredAll.length,
      job_후보: scoredJobs.length,
      talent_후보: scoredTalents.length,
      상위_5개_점수: scoredAll.slice(0, 5).map(s => ({ id: s.card.id, title: s.card.title, score: s.score }))
    });

    // ==================== Phase 3: AI 카드 선정 + 하드코딩 코멘트 ====================
    // Step 1: AI-powered card selection
    console.log('[Phase 3] AI 카드 선정 시작...');
    const keepIds = await aiFilterWithGemini(profile, scoredAll);
    const refined = keepIds ? scoredAll.filter((s) => keepIds.has(s.card.id)) : scoredAll;
    const { selected, discarded } = selectWithRegionMix(refined, preferredRegions);
    console.log('[Phase 3] AI 선정 완료 - 선택된 카드:', selected.length);

    // Step 2: 하드코딩 코멘트 (안정성 100%)
    const aiComment = {
      headline: '셀바 AI 추천',
      description: '선생님 프로필에 맞춘 맞춤 공고를 준비했어요.',
      diagnostics: {
        scenario: 'hardcoded',
        selectedCount: selected.length,
        discardedCount: discarded.length,
        comment_source: 'static'
      }
    };
    console.log('[Phase 3] 하드코딩 코멘트 적용 완료');

    console.log('[Phase 3] 최종 완료:', {
      선택된_카드: selected.length,
      코멘트_소스: 'Hardcoded',
      헤드라인: aiComment.headline,
      선택된_카드_목록: selected.map(s => ({
        id: s.card.id,
        type: s.card.type,
        title: (s.card as any).title || (s.card as any).name,
        score: s.score
      }))
    });

    const cardsForCache = selected.map((item) => item.card);
    console.log('[Phase 1] 캐시 저장 시작:', {
      user_id: user.id,
      저장할_카드_개수: cardsForCache.length,
      AI_코멘트_포함됨: !!aiComment
    });

    await upsertRecommendations(client, {
      user_id: user.id,
      cards: cardsForCache,
      ai_comment: aiComment,
      profile_snapshot: {
        display_name: profile.display_name,
        roles: profile.roles ?? [],
        interest_regions: profile.interest_regions ?? [],
        capable_subjects: profile.capable_subjects ?? [],
        teacher_level: profile.teacher_level,
        generated_from: profile.updated_at
      }
    });
    console.log('[Phase 1] 캐시 저장 완료 - 응답 반환');

    return new Response(
      JSON.stringify({
        cards: cardsForCache,
        ai_comment: aiComment
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }

    console.error('[profile-recommendations] 처리 중 예기치 못한 오류', error);
    return new Response(JSON.stringify({ message: '추천 생성 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

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

  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  roles: string[] | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  intro: string | null;
  capable_subjects: string[] | null;
  teacher_level: string | null;
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
    
    // 중등 과목 프로필 (예: 중등 과학, 중등 국어)
    if (profileSubject.includes('중등')) {
      // 중등 공고는 항상 가능
      if (jobLevel === '중등') {
        if (!jobSubj) return true;
        if (profileSubject.includes('과학') && jobSubj === '과학') return true;
        if (profileSubject.includes('영어') && jobSubj === '영어') return true;
        if (profileSubject.includes('체육') && jobSubj === '체육') return true;
        if (profileSubject.includes('음악') && jobSubj === '음악') return true;
        if (profileSubject.includes('미술') && jobSubj === '미술') return true;
        if (profileSubject.includes('국어') && jobSubj === '국어') return true;
        if (profileSubject.includes('수학') && jobSubj === '수학') return true;
        if (profileSubject.includes('사회') && jobSubj === '사회') return true;
        if (profileSubject.includes('도덕') && jobSubj === '도덕') return true;
      }
      // 중등 과목 교사는 초등 해당 과목 전담 가능 (상향식 호환)
      if (jobLevel === '초등') {
        if (!jobSubj) return false;
        if (profileSubject.includes('과학') && jobSubj === '과학') return true;
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

  if (job.is_urgent) {
    score += isAdminRole ? 4 : 1;
  }

  // 최신성 가중치: 최근 3일 +3, 최근 7일 +1, 3일 초과는 강한 패널티
  try {
    const created = new Date(job.created_at);
    const now = new Date();
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (!isNaN(days)) {
      if (days <= 3) {
        score += 3;
      } else if (days <= 7) {
        score += 1;
      } else {
        score += isAdminRole ? -18 : -100;
      }
    }
  } catch(_) {}

  // 마감 지난 공고는 강한 패널티(사실상 제외)
  if (job.deadline) {
    try {
      const d = new Date(job.deadline);
      const today = new Date();
      if (!isNaN(d.getTime()) && d.getTime() < new Date(today.toDateString()).getTime()) {
        score -= 100;
      }
    } catch(_) {}
  }

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

function generateAiComment(profile: UserProfileRow, selected: ScoredCard[], discardedCount: number) {
  const displayName = profile.display_name ?? '회원님';
  const roles = profile.roles ?? [];
  const interestRegions = profile.interest_regions ?? [];

  const roleText = roles.length > 0 ? roles.join(', ') : '관심 역할';
  const regionFallback = interestRegions.length > 0 ? interestRegions[0] : '관심 지역';

  // 선택된 카드로부터 지역 상위 2~3개 추출
  const regionCounts = new Map<string, number>();
  for (const item of selected) {
    const loc = typeof item.card.location === 'string' ? getRegionKey(item.card.location) : null;
    if (!loc) continue;
    regionCounts.set(loc, (regionCounts.get(loc) ?? 0) + 1);
  }
  const topRegions = Array.from(regionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 3);
  const regionPhrase = topRegions.length > 0 ? topRegions.join('·') : regionFallback;
  const headline = `${displayName}님 프로필에 맞춰 ${regionPhrase} 인근 추천을 준비했어요`;

  if (selected.length === 0) {
    return {
      headline,
      description: '아직 조건에 꼭 맞는 추천 카드가 부족해요. 다른 지역이나 역할도 곧 준비할게요.',
      diagnostics: {
        selectedCount: 0,
        discardedCount
      }
    };
  }

  const jobCount = selected.filter((item) => item.card.type === 'job').length;
  const talentCount = selected.filter((item) => item.card.type === 'talent').length;
  const locations = new Set<string>();
  for (const item of selected) {
    const location = typeof item.card.location === 'string' ? item.card.location : undefined;
    if (location) {
      locations.add(location);
    }
  }

  const locationText = topRegions.length > 0 ? topRegions.join(', ') : (locations.size > 0 ? Array.from(locations).slice(0, 3).join(', ') : regionFallback);
  const countsText = [`역할: ${roleText}`, `지역: ${locationText}`];
  if (jobCount > 0) countsText.push(`공고 ${jobCount}건`);
  if (talentCount > 0) countsText.push(`인재 ${talentCount}명`);

  // 프로필 소개 요약(있으면 짧게 붙임)
  const intro = (profile.intro ?? '').trim();
  const introSnippet = intro ? ` 소개 반영: ${intro.slice(0, 28)}${intro.length > 28 ? '…' : ''}` : '';

  return {
    headline,
    description: `${countsText.join(' · ')} 기준으로 최근 업데이트된 카드 중 맥락에 맞는 것만 골라 정리했어요.${introSnippet ? ' ' + introSnippet : ''} 불필요한 ${discardedCount}건은 제외했습니다.`,
    diagnostics: {
      selectedCount: selected.length,
      discardedCount,
      jobCount,
      talentCount
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
    .limit(60);

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
    const profile = await fetchProfile(client, user.id);
    const preferredRegions = buildRegionFilter(profile.interest_regions);
    const preferredRegionSet = new Set(preferredRegions.map((region) => region.toLowerCase()));
    const [jobCandidates, talentCandidates] = await Promise.all([
      fetchJobCandidates(client),
      fetchTalentCandidates(client)
    ]);

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

    // Gemini AI 필터링(Optional)
    const keepIds = await aiFilterWithGemini(profile, scoredAll);
    const refined = keepIds ? scoredAll.filter((s) => keepIds.has(s.card.id)) : scoredAll;
    
    const { selected, discarded } = selectWithRegionMix(refined, preferredRegions);
    const aiComment = generateAiComment(profile, selected, discarded.length);

    const cardsForCache = selected.map((item) => item.card);

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

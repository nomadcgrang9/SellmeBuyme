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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

type UserProfileRow = {
  user_id: string;
  display_name: string | null;
  roles: string[] | null;
  primary_region: string | null;
  interest_regions: string[] | null;
  experience_years: number | null;
  intro: string | null;
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

function toLowerSet(values: (string | null | undefined)[]): Set<string> {
  return new Set(values.filter((v): v is string => Boolean(v)).map((v) => v.trim().toLowerCase()));
}

function scoreJobCard(profile: UserProfileRow, job: JobPostingRow): ScoredCard {
  const profilePrimary = profile.primary_region?.trim();
  const interestRegions = profile.interest_regions ?? [];
  const roles = profile.roles ?? [];

  let score = 0;

  if (profilePrimary && job.location && job.location.trim() === profilePrimary) {
    score += 5;
  }

  if (interestRegions.some((region) => region && region.trim() === job.location?.trim())) {
    score += 3;
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

  if (job.is_urgent) {
    score += 1;
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

function scoreTalentCard(profile: UserProfileRow, talent: TalentRow): ScoredCard {
  const profilePrimary = profile.primary_region?.trim();
  const interestRegions = profile.interest_regions ?? [];
  const roles = profile.roles ?? [];

  const talentLocations = (talent.location ?? []).map((loc) => loc?.trim()).filter((loc): loc is string => Boolean(loc));
  const talentTags = toLowerSet(talent.tags ?? []);
  const profileRoles = toLowerSet(roles);

  let score = 0;

  if (profilePrimary && talentLocations.includes(profilePrimary)) {
    score += 4;
  } else if (interestRegions.some((region) => region && talentLocations.includes(region.trim()))) {
    score += 2;
  }

  for (const role of profileRoles) {
    if (talentTags.has(role) || talent.specialty?.toLowerCase().includes(role)) {
      score += 3;
    }
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

function filterAndSelectCards(scoredCards: ScoredCard[]): { selected: ScoredCard[]; discarded: ScoredCard[] } {
  const MIN_SCORE = 3;
  const filtered = scoredCards.filter((item) => item.score >= MIN_SCORE);
  const sorted = filtered.sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id));
  const selected = sorted.slice(0, 6);

  if (selected.length > 0) {
    const selectedIds = new Set(selected.map((item) => item.card.id));
    const discarded = scoredCards.filter((item) => !selectedIds.has(item.card.id));
    return { selected, discarded };
  }

  const fallback = scoredCards
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id))
    .slice(0, 4);

  const fallbackIds = new Set(fallback.map((item) => item.card.id));
  const discarded = scoredCards.filter((item) => !fallbackIds.has(item.card.id));
  return { selected: fallback, discarded };
}

function generateAiComment(profile: UserProfileRow, selected: ScoredCard[], discardedCount: number) {
  const displayName = profile.display_name ?? '회원님';
  const primaryRegion = profile.primary_region ?? '관심 지역';
  const roles = profile.roles ?? [];

  const roleText = roles.length > 0 ? roles.join(', ') : '관심 역할';
  const headline = `${displayName}님 프로필에 맞춰 ${primaryRegion} 인근 추천을 준비했어요`;

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

  const locationText = locations.size > 0 ? Array.from(locations).slice(0, 3).join(', ') : primaryRegion;
  const countsText = [`역할: ${roleText}`, `지역: ${locationText}`];
  if (jobCount > 0) countsText.push(`공고 ${jobCount}건`);
  if (talentCount > 0) countsText.push(`인재 ${talentCount}명`);

  return {
    headline,
    description: `${countsText.join(' · ')} 기준으로 최근 업데이트된 카드 중 맥락에 맞는 것만 골라 정리했어요. 불필요한 ${discardedCount}건은 제외했습니다.`,
    diagnostics: {
      selectedCount: selected.length,
      discardedCount,
      jobCount,
      talentCount
    }
  };
}

async function fetchProfile(client: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await client
    .from('user_profiles')
    .select('user_id, display_name, roles, primary_region, interest_regions, experience_years, intro, updated_at')
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
    .select('id, organization, title, tags, location, compensation, deadline, is_urgent, created_at')
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
    const [jobCandidates, talentCandidates] = await Promise.all([
      fetchJobCandidates(client),
      fetchTalentCandidates(client)
    ]);

    const scoredJobs = jobCandidates.map((job) => scoreJobCard(profile, job));
    const scoredTalents = talentCandidates.map((talent) => scoreTalentCard(profile, talent));
    const scoredAll = [...scoredJobs, ...scoredTalents];

    const { selected, discarded } = filterAndSelectCards(scoredAll);
    const aiComment = generateAiComment(profile, selected, discarded.length);

    const cardsForCache = selected.map((item) => item.card);

    await upsertRecommendations(client, {
      user_id: user.id,
      cards: cardsForCache,
      ai_comment: aiComment,
      profile_snapshot: {
        display_name: profile.display_name,
        roles: profile.roles ?? [],
        primary_region: profile.primary_region,
        interest_regions: profile.interest_regions ?? [],
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

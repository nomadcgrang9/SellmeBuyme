/**
 * 와글와글 AI 자동답변 Edge Function
 *
 * 역할:
 *  1. seed-personas    — AI 페르소나 계정 일괄 생성 (1회성)
 *  2. generate         — 미답변 쓰레드 분류 → 답변 생성 → 예약
 *  3. post-scheduled   — 예약된 답변 중 시각 도래분 실제 INSERT
 *  4. generate-threads — AI 페르소나 명의 원글 자동생성 (관리자 수동 트리거)
 *
 * 호출: POST /wagle-ai-reply  { "action": "generate" | "post-scheduled" | "seed-personas" | "generate-threads" }
 * 인증: service_role 키 또는 관리자 JWT
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// ━━━ 환경변수 ━━━
const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ??
  Deno.env.get('PROJECT_URL') ??
  '';

const serviceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  Deno.env.get('SERVICE_ROLE_KEY') ??
  '';

const geminiApiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ━━━ service_role 클라이언트 (RLS 우회) ━━━
function getAdminClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL 또는 SERVICE_ROLE_KEY 미설정');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ━━━ 안전 분류 키워드 (1차 필터 — Gemini 호출 전 사전 차단) ━━━
const UNSAFE_KEYWORDS = [
  '급구', '대타', '구합니다', '구해요', '구함',
  '가능하신 분', '지원 가능', '선생님 계세요', '계실까요',
  '쪽지', 'DM', '연락처', '전화번호', '카톡', '카카오톡',
  '채용', '합격발표', '면접 일정', '지원서',
  '시급', '일당', '월급', '보수', '결제',
];

function isKeywordUnsafe(content: string, hashtags: string[]): boolean {
  const text = (content + ' ' + hashtags.join(' ')).toLowerCase();
  return UNSAFE_KEYWORDS.some((kw) => text.includes(kw));
}

// ━━━ Gemini API 호출 헬퍼 ━━━
async function callGemini(prompt: string, model = 'gemini-2.0-flash', maxTokens = 300): Promise<string> {
  if (!geminiApiKey) throw new Error('GEMINI_API_KEY 미설정');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.9, maxOutputTokens: maxTokens },
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini API 오류 (${resp.status}): ${body}`);
  }

  const json = await resp.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

// ━━━ 설정 조회 ━━━
interface AiConfig {
  enabled: boolean;
  maxRepliesPerRun: number;
  maxRepliesPerDay: number;
  minDelayMin: number;
  maxDelayMin: number;
  activeHours: { start: number; end: number };
  replyProbability: number;
}

async function loadConfig(db: ReturnType<typeof createClient>): Promise<AiConfig> {
  const { data } = await db.from('wagle_ai_config').select('key, value');
  const map = new Map((data ?? []).map((r: { key: string; value: unknown }) => [r.key, r.value]));

  return {
    enabled: map.get('enabled') === true || map.get('enabled') === 'true',
    maxRepliesPerRun: Number(map.get('max_replies_per_run') ?? 5),
    maxRepliesPerDay: Number(map.get('max_replies_per_day') ?? 10),
    minDelayMin: Number(map.get('min_delay_minutes') ?? 30),
    maxDelayMin: Number(map.get('max_delay_minutes') ?? 360),
    activeHours: (map.get('active_hours') as { start: number; end: number }) ?? { start: 7, end: 23 },
    replyProbability: Number(map.get('reply_probability') ?? 0.4),
  };
}

// ━━━ 활동 시간 체크 (KST) ━━━
function isActiveHour(hours: { start: number; end: number }): boolean {
  const kstHour = new Date(Date.now() + 9 * 3600_000).getUTCHours();
  return kstHour >= hours.start && kstHour < hours.end;
}

// ━━━ 오늘 AI 답변 수 확인 ━━━
async function getTodayReplyCount(db: ReturnType<typeof createClient>): Promise<number> {
  const todayStart = new Date();
  todayStart.setUTCHours(todayStart.getUTCHours() + 9); // KST 기준
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayStartISO = new Date(todayStart.getTime() - 9 * 3600_000).toISOString();

  const { count } = await db
    .from('wagle_ai_reply_log')
    .select('id', { count: 'exact', head: true })
    .in('status', ['posted', 'pending'])
    .gte('created_at', todayStartISO);

  return count ?? 0;
}

// ━━━ 미답변 쓰레드 수집 ━━━
interface ThreadCandidate {
  id: string;
  content: string;
  hashtags: string[];
  reply_count: number;
  created_at: string;
  author_id: string;
}

async function getCandidateThreads(db: ReturnType<typeof createClient>): Promise<ThreadCandidate[]> {
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();

  // 최근 24시간 쓰레드 중 삭제되지 않고 댓글 5개 미만
  const { data: threads } = await db
    .from('wagle_threads')
    .select('id, content, hashtags, reply_count, created_at, author_id')
    .eq('is_deleted', false)
    .gte('created_at', since)
    .lt('reply_count', 5)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!threads || threads.length === 0) return [];

  // 이미 AI 로그에 있는 쓰레드 제외
  const threadIds = threads.map((t: ThreadCandidate) => t.id);
  const { data: logged } = await db
    .from('wagle_ai_reply_log')
    .select('thread_id')
    .in('thread_id', threadIds);

  const loggedSet = new Set((logged ?? []).map((r: { thread_id: string }) => r.thread_id));
  return threads.filter((t: ThreadCandidate) => !loggedSet.has(t.id));
}

// ━━━ Gemini 콘텐츠 안전 분류 (배치) ━━━
interface ClassifiedThread {
  thread: ThreadCandidate;
  classification: 'safe' | 'unsafe';
  reason: string;
}

async function classifyThreads(threads: ThreadCandidate[]): Promise<ClassifiedThread[]> {
  const results: ClassifiedThread[] = [];

  // 1차: 키워드 필터
  const needsAi: ThreadCandidate[] = [];
  for (const t of threads) {
    if (isKeywordUnsafe(t.content, t.hashtags)) {
      results.push({ thread: t, classification: 'unsafe', reason: '키워드 필터' });
    } else {
      needsAi.push(t);
    }
  }

  if (needsAi.length === 0) return results;

  // 2차: Gemini 배치 분류
  const threadList = needsAi.map((t, i) =>
    `[${i + 1}] 해시태그: ${t.hashtags.join(', ')} | 본문: ${t.content.slice(0, 200)}`
  ).join('\n');

  const prompt = `당신은 교육 커뮤니티 글의 안전성을 분류하는 시스템입니다.

아래 글들이 각각 SAFE(답변 가능) / UNSAFE(답변 금지) 인지 판단하세요.

[UNSAFE - 답변 금지 기준]
- 특정인을 구하거나 대타/급구 요청하는 글
- 직접 연락(쪽지, DM, 전화번호, 카톡)을 기대하는 글
- 구체적인 채용/면접 일정/합격 여부를 논하는 글
- 금전(시급/보수) 협상이 포함된 글
- "가능하신 분 계세요?" 같이 실제 매칭을 기대하는 글

[SAFE - 답변 가능 기준]
- 수업 팁/노하우/교재 추천 요청
- 감정 토로(걱정, 불안, 기쁨, 좌절)
- 일반적 제도/자격 질문
- 업무 범위 고민
- 경험담 나눔 요청

글 목록:
${threadList}

응답: 각 번호에 대해 한 줄씩 "번호|safe 또는 unsafe|사유" 형식으로만 답하세요.
예시:
1|safe|수업팁 공유 요청
2|unsafe|특정 지역 강사 구인`;

  try {
    const raw = await callGemini(prompt);
    const lines = raw.split('\n').filter((l: string) => l.trim());

    for (const line of lines) {
      const parts = line.split('|').map((p: string) => p.trim());
      const idx = parseInt(parts[0]) - 1;
      if (idx >= 0 && idx < needsAi.length) {
        const cls = parts[1]?.toLowerCase() === 'unsafe' ? 'unsafe' : 'safe';
        results.push({
          thread: needsAi[idx],
          classification: cls,
          reason: parts[2] || 'Gemini 분류',
        });
      }
    }

    // Gemini가 누락한 항목은 safe로 처리
    for (let i = 0; i < needsAi.length; i++) {
      if (!results.some((r) => r.thread.id === needsAi[i].id)) {
        results.push({ thread: needsAi[i], classification: 'safe', reason: 'Gemini 미응답 - 기본 safe' });
      }
    }
  } catch (err) {
    console.error('[classifyThreads] Gemini 분류 실패:', err);
    // Gemini 실패 시 전부 safe로 처리 (키워드 필터 이미 통과)
    for (const t of needsAi) {
      results.push({ thread: t, classification: 'safe', reason: 'Gemini 오류 - 키워드 통과 safe' });
    }
  }

  return results;
}

// ━━━ 페르소나 선택 ━━━
interface Persona {
  id: string;
  auth_user_id: string;
  display_name: string;
  persona_background: {
    role?: string;
    experience_years?: number;
    tone?: string;
    specialties?: string[];
  };
  last_used_at: string | null;
  total_replies: number;
}

async function selectPersona(
  db: ReturnType<typeof createClient>,
  thread: ThreadCandidate,
  excludeAuthorId: string
): Promise<Persona | null> {
  const { data: personas } = await db
    .from('wagle_ai_personas')
    .select('id, auth_user_id, display_name, persona_background, last_used_at, total_replies')
    .eq('is_active', true)
    .neq('auth_user_id', excludeAuthorId) // 글쓴이와 동일 페르소나 방지
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(10);

  if (!personas || personas.length === 0) return null;

  // 전문 분야 매칭 시도
  const text = (thread.content + ' ' + thread.hashtags.join(' ')).toLowerCase();
  const matched = personas.filter((p: Persona) => {
    const specs = p.persona_background?.specialties ?? [];
    return specs.some((s: string) => text.includes(s));
  });

  // 매칭된 페르소나가 있으면 그 중 랜덤, 없으면 가장 오래 안 쓴 페르소나
  const pool = matched.length > 0 ? matched : personas;
  return pool[Math.floor(Math.random() * Math.min(pool.length, 3))];
}

// ━━━ 답변 생성 ━━━
async function generateReply(
  thread: ThreadCandidate,
  persona: Persona,
  existingReplies: string[]
): Promise<string> {
  const bg = persona.persona_background;

  const existingContext = existingReplies.length > 0
    ? `\n\n[이미 달린 답변들 (중복 금지)]\n${existingReplies.map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : '';

  const prompt = `당신은 교육 커뮤니티 "${persona.display_name}" 입니다.
배경: ${bg.role ?? '교육강사'}, 경력 ${bg.experience_years ?? 3}년, 어투: ${bg.tone ?? '친근한'}

아래 커뮤니티 글에 자연스러운 답변 1개를 작성하세요.

[원글]
해시태그: ${thread.hashtags.join(', ')}
${thread.content}
${existingContext}

[규칙]
1. 진짜 사람처럼 자연스럽게 (완벽한 문장 X, 구어체 O)
2. 당신의 경험에 기반한 답변
3. 50~150자 (너무 짧거나 길지 않게)
4. 페르소나 어투에 맞게 이모티콘/줄임말 적절히 사용
5. 100% 정확하지 않아도 됨 (경험 기반 의견)
6. 절대 연락처, URL, 구체적 기관명 언급 금지
7. "AI", "인공지능", "챗봇" 단어 절대 금지
8. 기존 답변과 중복되지 않는 새로운 관점 제시
9. 따옴표나 부가 설명 없이 답변 본문만 출력

답변:`;

  return await callGemini(prompt);
}

// ━━━ 기존 답변 목록 조회 ━━━
async function getExistingReplies(db: ReturnType<typeof createClient>, threadId: string): Promise<string[]> {
  const { data } = await db
    .from('wagle_replies')
    .select('content')
    .eq('thread_id', threadId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(10);

  return (data ?? []).map((r: { content: string }) => r.content);
}

// ━━━ 랜덤 딜레이 계산 ━━━
function randomDelay(minMin: number, maxMin: number): number {
  return minMin + Math.floor(Math.random() * (maxMin - minMin));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTION: generate — 답변 생성 & 예약
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleGenerate(db: ReturnType<typeof createClient>) {
  const config = await loadConfig(db);
  console.log('[generate] 설정:', config);

  if (!config.enabled) {
    return { message: 'AI 답변 비활성화 상태', generated: 0 };
  }

  if (!isActiveHour(config.activeHours)) {
    return { message: '활동 시간 외 (KST 기준)', generated: 0 };
  }

  const todayCount = await getTodayReplyCount(db);
  if (todayCount >= config.maxRepliesPerDay) {
    return { message: `일일 한도 초과 (${todayCount}/${config.maxRepliesPerDay})`, generated: 0 };
  }

  const remaining = config.maxRepliesPerDay - todayCount;
  const maxThisRun = Math.min(config.maxRepliesPerRun, remaining);

  // 1. 후보 쓰레드 수집
  const candidates = await getCandidateThreads(db);
  console.log('[generate] 후보 쓰레드:', candidates.length);

  if (candidates.length === 0) {
    return { message: '답변할 쓰레드 없음', generated: 0 };
  }

  // 2. 콘텐츠 분류
  const classified = await classifyThreads(candidates);
  const safeThreads = classified.filter((c) => c.classification === 'safe');
  console.log('[generate] 안전 분류 결과:', {
    total: classified.length,
    safe: safeThreads.length,
    unsafe: classified.length - safeThreads.length,
  });

  // unsafe 로그 기록
  for (const item of classified.filter((c) => c.classification === 'unsafe')) {
    // unsafe 쓰레드도 로그에 기록 (재처리 방지)
    const dummyPersona = await db
      .from('wagle_ai_personas')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (dummyPersona.data) {
      await db.from('wagle_ai_reply_log').insert({
        thread_id: item.thread.id,
        persona_id: dummyPersona.data.id,
        classification: 'unsafe',
        classification_reason: item.reason,
        status: 'cancelled',
      });
    }
  }

  // 3. 확률 기반 필터 + 수량 제한
  const eligible = safeThreads.filter(() => Math.random() < config.replyProbability);
  const selected = eligible.slice(0, maxThisRun);
  console.log('[generate] 선별:', { eligible: eligible.length, selected: selected.length });

  // 4. 답변 생성 및 예약
  let generated = 0;
  for (const item of selected) {
    try {
      const persona = await selectPersona(db, item.thread, item.thread.author_id);
      if (!persona) {
        console.log('[generate] 사용 가능한 페르소나 없음 - 스킵');
        continue;
      }

      const existingReplies = await getExistingReplies(db, item.thread.id);
      const content = await generateReply(item.thread, persona, existingReplies);

      if (!content || content.length < 10) {
        console.log('[generate] 생성된 답변이 너무 짧음 - 스킵:', content);
        continue;
      }

      // 예약 시각 계산
      const delayMin = randomDelay(config.minDelayMin, config.maxDelayMin);
      const scheduledAt = new Date(Date.now() + delayMin * 60_000).toISOString();

      // 로그 기록 (status: pending)
      await db.from('wagle_ai_reply_log').insert({
        thread_id: item.thread.id,
        persona_id: persona.id,
        classification: 'safe',
        classification_reason: item.reason,
        generated_content: content,
        gemini_model: 'gemini-2.0-flash',
        scheduled_at: scheduledAt,
        status: 'pending',
      });

      // 페르소나 last_used_at 갱신
      await db
        .from('wagle_ai_personas')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', persona.id);

      console.log(`[generate] 예약 완료: thread=${item.thread.id}, persona=${persona.display_name}, delay=${delayMin}분`);
      generated++;
    } catch (err) {
      console.error(`[generate] 쓰레드 ${item.thread.id} 처리 실패:`, err);
    }
  }

  return { message: `${generated}건 예약 완료`, generated, todayTotal: todayCount + generated };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTION: post-scheduled — 예약된 답변 실제 발송
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handlePostScheduled(db: ReturnType<typeof createClient>) {
  const config = await loadConfig(db);
  if (!config.enabled) {
    return { message: 'AI 답변 비활성화 상태', posted: 0 };
  }

  const now = new Date().toISOString();

  // 예약 시각이 지난 pending 로그 조회
  const { data: pending } = await db
    .from('wagle_ai_reply_log')
    .select('id, thread_id, persona_id, generated_content')
    .eq('status', 'pending')
    .not('generated_content', 'is', null)
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(10);

  if (!pending || pending.length === 0) {
    return { message: '발송 대기 건 없음', posted: 0 };
  }

  let posted = 0;
  for (const log of pending) {
    try {
      // 페르소나의 auth_user_id 조회
      const { data: persona } = await db
        .from('wagle_ai_personas')
        .select('auth_user_id')
        .eq('id', log.persona_id)
        .single();

      if (!persona) {
        await db.from('wagle_ai_reply_log')
          .update({ status: 'error', error_message: '페르소나 미발견' })
          .eq('id', log.id);
        continue;
      }

      // 쓰레드가 아직 존재하는지 확인
      const { data: thread } = await db
        .from('wagle_threads')
        .select('id')
        .eq('id', log.thread_id)
        .eq('is_deleted', false)
        .single();

      if (!thread) {
        await db.from('wagle_ai_reply_log')
          .update({ status: 'cancelled', error_message: '쓰레드 삭제됨' })
          .eq('id', log.id);
        continue;
      }

      // wagle_replies에 INSERT (service_role이므로 RLS 우회)
      const { data: reply, error: replyErr } = await db
        .from('wagle_replies')
        .insert({
          thread_id: log.thread_id,
          author_id: persona.auth_user_id,
          content: log.generated_content,
          depth: 1,
          parent_id: null,
          mention_user_id: null,
        })
        .select('id')
        .single();

      if (replyErr) {
        console.error(`[post-scheduled] 답변 INSERT 실패:`, replyErr);
        await db.from('wagle_ai_reply_log')
          .update({ status: 'error', error_message: replyErr.message })
          .eq('id', log.id);
        continue;
      }

      // 로그 업데이트
      await db.from('wagle_ai_reply_log')
        .update({
          reply_id: reply.id,
          status: 'posted',
          posted_at: new Date().toISOString(),
        })
        .eq('id', log.id);

      // 페르소나 통계 업데이트 (수동 +1)
      const { data: pData } = await db
        .from('wagle_ai_personas')
        .select('total_replies')
        .eq('id', log.persona_id)
        .single();
      if (pData) {
        await db
          .from('wagle_ai_personas')
          .update({
            total_replies: (pData.total_replies ?? 0) + 1,
            last_used_at: new Date().toISOString(),
          })
          .eq('id', log.persona_id);
      }

      console.log(`[post-scheduled] 발송 완료: log=${log.id}, reply=${reply.id}`);
      posted++;
    } catch (err) {
      console.error(`[post-scheduled] log=${log.id} 처리 실패:`, err);
      await db.from('wagle_ai_reply_log')
        .update({ status: 'error', error_message: String(err) })
        .eq('id', log.id);
    }
  }

  return { message: `${posted}건 발송 완료`, posted };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTION: generate-threads — AI 대화묶음 자동생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── 대화 패턴 8종 (가중치 랜덤 선택) ──

interface ConversationPattern {
  id: string;
  weight: number;
  personaCount: number;
  label: string;
  promptGuide: string;
}

const PATTERNS: ConversationPattern[] = [
  {
    id: 'question-answer', weight: 20, personaCount: 3,
    label: '질문→답변형',
    promptGuide: '글쓴이(A)가 교육 현장 고민이나 궁금한 점을 질문합니다. 답글자(B)와 답글자(C)가 각자 경험을 바탕으로 답변합니다.',
  },
  {
    id: 'question-followup', weight: 10, personaCount: 2,
    label: '질문→답변→꼬리질문형',
    promptGuide: '글쓴이(A)가 질문합니다. 답글자(B)가 답변합니다. 그 후 글쓴이(A)가 B의 답변에 대해 꼬리질문을 합니다 (depth=2 대댓글, @B 멘션).',
  },
  {
    id: 'experience-empathy', weight: 20, personaCount: 3,
    label: '경험공유→공감형',
    promptGuide: '글쓴이(A)가 교육 현장 경험담이나 후기를 공유합니다. 답글자(B)와 답글자(C)가 공감하거나 비슷한 경험을 나눕니다.',
  },
  {
    id: 'info-thanks', weight: 10, personaCount: 2,
    label: '정보공유→감사형',
    promptGuide: '글쓴이(A)가 유용한 정보나 팁을 공유합니다. 답글자(B)가 감사하거나 추가 정보를 보완합니다.',
  },
  {
    id: 'vent-comfort', weight: 15, personaCount: 3,
    label: '넋두리→위로형',
    promptGuide: '글쓴이(A)가 교육 현장에서 겪은 힘든 일이나 고충을 토로합니다. 답글자(B)가 위로/공감하고, 답글자(C)가 응원하거나 비슷한 경험을 나눕니다.',
  },
  {
    id: 'solo', weight: 10, personaCount: 1,
    label: '단독 글 (답글 없음)',
    promptGuide: '짧은 감상, 일상, 소소한 이야기를 공유합니다. 답글은 없습니다.',
  },
  {
    id: 'debate', weight: 5, personaCount: 3,
    label: '토론형',
    promptGuide: '글쓴이(A)가 교육 방법론에 대한 의견을 제시하며 다른 분들 생각을 물어봅니다. 답글자(B)가 동의+보충하고, 답글자(C)가 살짝 다른 의견을 제시합니다.',
  },
  {
    id: 'recommend-request', weight: 10, personaCount: 3,
    label: '추천요청→추천형',
    promptGuide: '글쓴이(A)가 교재, 자료, 도구 등의 추천을 요청합니다. 답글자(B)와 답글자(C)가 각자 다른 것을 추천합니다.',
  },
];

function pickPattern(): ConversationPattern {
  const totalWeight = PATTERNS.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * totalWeight;
  for (const p of PATTERNS) {
    rand -= p.weight;
    if (rand <= 0) return p;
  }
  return PATTERNS[0];
}

/** 활성 페르소나 중 N명 랜덤 선택 */
async function getRandomPersonas(db: ReturnType<typeof createClient>, count: number): Promise<Persona[]> {
  const { data: personas } = await db
    .from('wagle_ai_personas')
    .select('id, auth_user_id, display_name, persona_background, last_used_at, total_replies')
    .eq('is_active', true)
    .order('last_used_at', { ascending: true, nullsFirst: true })
    .limit(count * 2);

  if (!personas || personas.length === 0) return [];

  const shuffled = personas.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** 최근 글 N개의 내용 조회 (주제 중복 방지용) */
async function getRecentThreadContents(db: ReturnType<typeof createClient>, limit: number): Promise<string[]> {
  const { data } = await db
    .from('wagle_threads')
    .select('content')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []).map((r: { content: string }) => r.content);
}

/** Gemini JSON 응답 파싱 (코드블록 감싸기 대응) */
function parseGeminiJson(raw: string): unknown {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

/** 본문에 포함된 해시태그 제거 (DB hashtags 배열과 중복 방지) */
function stripHashtagsFromContent(content: string): string {
  return content.replace(/#[가-힣a-zA-Z0-9_]+/g, '').replace(/\s{2,}/g, ' ').trim();
}

/** 랜덤 과거 시각 생성 (minHoursAgo ~ maxHoursAgo 범위) */
function randomPastTime(minHoursAgo: number, maxHoursAgo: number): string {
  const now = Date.now();
  const minMs = minHoursAgo * 60 * 60 * 1000;
  const maxMs = maxHoursAgo * 60 * 60 * 1000;
  const offsetMs = minMs + Math.random() * (maxMs - minMs);
  return new Date(now - offsetMs).toISOString();
}

/** 기준 시각 이후 랜덤 시각 (답글용: minMin ~ maxMin 분 뒤) */
function randomTimeAfter(baseIso: string, minMin: number, maxMin: number): string {
  const base = new Date(baseIso).getTime();
  const offsetMs = (minMin + Math.random() * (maxMin - minMin)) * 60 * 1000;
  return new Date(base + offsetMs).toISOString();
}

/** 페르소나 정보를 프롬프트용 문자열로 변환 */
function personaToPrompt(persona: Persona, role: string): string {
  const bg = persona.persona_background;
  return `- ${role}: ${persona.display_name} (${bg.role ?? '교육강사'}, 경력 ${bg.experience_years ?? 3}년, 어투: ${bg.tone ?? '친근한'}, 전문분야: ${(bg.specialties ?? []).join('/')})`;
}

// ── 대화묶음 생성 (패턴별) ──

interface ConversationReply {
  persona_index: number;
  content: string;
  depth: number;
  parent_index: number | null;
  mention_persona_index?: number;
}

interface ConversationScenario {
  thread: { content: string; hashtags: string[] };
  replies: ConversationReply[];
}

/** 패턴6: 단독 글 (답글 없음) 전용 생성 */
async function generateSoloThread(
  persona: Persona,
  recentContents: string[]
): Promise<{ content: string; hashtags: string[] }> {
  const bg = persona.persona_background;

  const recentContext = recentContents.length > 0
    ? `\n[최근 커뮤니티 글 (주제 중복 금지)]\n${recentContents.map((c, i) => `${i + 1}. ${c.slice(0, 80)}`).join('\n')}`
    : '';

  const prompt = `당신은 교육 커뮤니티 "와글와글"에 글을 쓰는 "${persona.display_name}" 입니다.
${personaToPrompt(persona, '글쓴이')}

짧고 소소한 일상 글이나 감상을 1개 작성하세요.
예: "봄이라 그런지 아이들이 들떠있네요~", "오늘 수업 너무 잘 돼서 기분 좋다ㅎㅎ"
${recentContext}

[절대 규칙]
1. 존댓말 또는 부드러운 반말 (커뮤니티 분위기에 맞게)
2. 1~2문장, 30~80자 이내
3. 해시태그 1~2개 (본문에 절대 포함하지 말 것, 별도 배열로만)
4. 연락처, URL, 기관명, 구인구직, AI 관련 단어 절대 금지
5. 이전 글과 주제가 겹치지 않게

[출력 형식 — JSON만 출력]
{"content": "본문", "hashtags": ["태그1"]}`;

  const raw = await callGemini(prompt);
  try {
    const parsed = parseGeminiJson(raw) as { content: string; hashtags: string[] };
    return { content: parsed.content || '', hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [] };
  } catch {
    console.warn('[generate-threads] solo JSON 파싱 실패:', raw);
    return { content: raw.slice(0, 100), hashtags: [] };
  }
}

/** 대화묶음 생성 (패턴 1~5, 7~8) — Gemini 1회 호출 */
async function generateConversation(
  personas: Persona[],
  pattern: ConversationPattern,
  recentContents: string[]
): Promise<ConversationScenario> {
  const personaLines = personas.map((p, i) => {
    const role = i === 0 ? '글쓴이(A)' : i === 1 ? '답글자(B)' : '답글자(C)';
    return personaToPrompt(p, role);
  }).join('\n');

  const recentContext = recentContents.length > 0
    ? `\n[최근 커뮤니티 글 (주제 중복 금지)]\n${recentContents.map((c, i) => `${i + 1}. ${c.slice(0, 80)}`).join('\n')}`
    : '';

  // 패턴별 답글 구조 가이드
  let replyStructureGuide = '';
  if (pattern.id === 'question-followup') {
    replyStructureGuide = `replies 배열 구성:
1. persona_index=1(B)의 답글 (depth=1, parent_index=null)
2. persona_index=0(A)의 꼬리질문 대댓글 (depth=2, parent_index=0, mention_persona_index=1)`;
  } else if (pattern.personaCount === 2) {
    replyStructureGuide = `replies 배열 구성:
1. persona_index=1(B)의 답글 (depth=1, parent_index=null)`;
  } else {
    replyStructureGuide = `replies 배열 구성:
1. persona_index=1(B)의 답글 (depth=1, parent_index=null)
2. persona_index=2(C)의 답글 (depth=1, parent_index=null)`;
  }

  const prompt = `당신은 교육 커뮤니티 "와글와글"의 대화 시나리오 작가입니다.
아래 페르소나들이 자연스럽게 대화하는 시나리오를 작성하세요.

[참여 페르소나]
${personaLines}

[대화 유형: ${pattern.label}]
${pattern.promptGuide}

[${replyStructureGuide}]
${recentContext}

[절대 규칙]
1. 모든 글은 존댓말 (커뮤니티 예의)
2. 원글: 2~3문장, 80~150자 이내
3. 답글: 1~2문장, 30~100자 이내
4. 대댓글(depth=2): 1문장, 20~50자 이내 (가벼운 반응)
5. 해시태그는 원글에만, 2~3개, 본문에 절대 포함하지 말 것 (hashtags 배열에만)
6. "~인데요", "~거든요", "~같아요" 등 구어체 종결어미 자연스럽게 사용
7. 연락처, URL, 기관명, 구인구직, AI 관련 단어 절대 금지
8. 답글은 원글 주제에 대한 실제 경험/정보 기반으로 작성
9. 이전 글과 주제가 겹치지 않게
10. 느낌표는 최대 1개까지만 사용

[출력 형식 — JSON만 출력, 다른 텍스트 절대 금지]
{
  "thread": { "content": "원글 본문", "hashtags": ["태그1", "태그2"] },
  "replies": [
    { "persona_index": 1, "content": "답글 내용", "depth": 1, "parent_index": null },
    { "persona_index": 2, "content": "답글 내용", "depth": 1, "parent_index": null }
  ]
}

persona_index: 0=글쓴이(A), 1=답글자(B), 2=답글자(C)
대댓글이 있으면 parent_index로 부모 답글의 인덱스(0부터)를 지정하고, mention_persona_index로 @멘션 대상을 지정하세요.`;

  const raw = await callGemini(prompt, 'gemini-2.0-flash', 800);
  try {
    const parsed = parseGeminiJson(raw) as ConversationScenario;
    return {
      thread: {
        content: parsed.thread?.content || '',
        hashtags: Array.isArray(parsed.thread?.hashtags) ? parsed.thread.hashtags : [],
      },
      replies: Array.isArray(parsed.replies) ? parsed.replies : [],
    };
  } catch {
    console.error('[generate-threads] conversation JSON 파싱 실패:', raw);
    throw new Error('Gemini 응답 JSON 파싱 실패');
  }
}

async function handleGenerateThreads(db: ReturnType<typeof createClient>, count: number) {
  console.log(`[generate-threads] ${count}건 대화묶음 생성 시작`);

  // 최근 글 10개 조회 (주제 중복 방지)
  const recentContents = await getRecentThreadContents(db, 10);

  const results: Array<{ pattern: string; persona: string; threadId: string; replyCount: number }> = [];
  const errors: Array<{ pattern: string; error: string }> = [];

  for (let i = 0; i < count; i++) {
    const pattern = pickPattern();
    console.log(`[generate-threads] ${i + 1}/${count} 패턴: ${pattern.label} (${pattern.personaCount}명)`);

    try {
      // 1. 필요한 페르소나 수만큼 선택
      const personas = await getRandomPersonas(db, pattern.personaCount);
      if (personas.length === 0) {
        errors.push({ pattern: pattern.label, error: '활성 페르소나 없음' });
        continue;
      }

      let threadContent: string;
      let threadHashtags: string[];
      let replies: ConversationReply[] = [];

      // 2. 패턴별 Gemini 호출
      if (pattern.id === 'solo') {
        // 단독 글: 답글 없음
        const solo = await generateSoloThread(personas[0], recentContents);
        threadContent = solo.content;
        threadHashtags = solo.hashtags;
      } else {
        // 대화묶음: 원글 + 답글
        const scenario = await generateConversation(personas, pattern, recentContents);
        threadContent = scenario.thread.content;
        threadHashtags = scenario.thread.hashtags;
        replies = scenario.replies;
      }

      // 해시태그 후처리: 본문에서 #태그 제거 (DB hashtags 배열과 중복 방지)
      threadContent = stripHashtagsFromContent(threadContent);

      if (!threadContent || threadContent.length < 10) {
        errors.push({ pattern: pattern.label, error: '생성된 글이 너무 짧음' });
        continue;
      }

      // 3. 원글 INSERT (과거 1~48시간 사이 랜덤 시각)
      const threadCreatedAt = randomPastTime(1, 48);
      const { data: threadData, error: threadErr } = await db
        .from('wagle_threads')
        .insert({
          author_id: personas[0].auth_user_id,
          content: threadContent,
          hashtags: threadHashtags,
          is_ai_generated: true,
          ai_persona_id: personas[0].id,
          created_at: threadCreatedAt,
        })
        .select('id')
        .single();

      if (threadErr || !threadData) {
        errors.push({ pattern: pattern.label, error: threadErr?.message || 'INSERT 실패' });
        continue;
      }

      const threadId = threadData.id;

      // 4. 답글 순차 INSERT (parent_id, mention_user_id 매핑, 시간 분산)
      const replyIds: string[] = [];
      const replyCreatedAts: string[] = [];
      let insertedReplies = 0;

      for (let ri = 0; ri < replies.length; ri++) {
        const reply = replies[ri];
        try {
          const replyPersona = personas[reply.persona_index];
          if (!replyPersona) continue;

          const parentId = reply.parent_index !== null && reply.parent_index !== undefined
            ? replyIds[reply.parent_index] ?? null
            : null;
          const mentionUserId = reply.mention_persona_index !== undefined
            ? personas[reply.mention_persona_index]?.auth_user_id ?? null
            : null;

          // 답글 시각: 부모 기준 10분~3시간 뒤 (대댓글은 부모 답글 기준)
          const baseTime = reply.parent_index !== null && reply.parent_index !== undefined
            ? (replyCreatedAts[reply.parent_index] ?? threadCreatedAt)
            : threadCreatedAt;
          const replyCreatedAt = randomTimeAfter(baseTime, 10, 180);

          // 답글 본문에서도 해시태그 제거
          const cleanContent = stripHashtagsFromContent(reply.content);

          const { data: replyData, error: replyErr } = await db
            .from('wagle_replies')
            .insert({
              thread_id: threadId,
              author_id: replyPersona.auth_user_id,
              content: cleanContent,
              depth: reply.depth || 1,
              parent_id: parentId,
              mention_user_id: mentionUserId,
              created_at: replyCreatedAt,
            })
            .select('id')
            .single();

          if (replyErr || !replyData) {
            console.warn(`[generate-threads] 답글 INSERT 실패:`, replyErr);
            replyIds.push(''); // placeholder
            replyCreatedAts.push(threadCreatedAt);
            continue;
          }

          replyIds.push(replyData.id);
          replyCreatedAts.push(replyCreatedAt);
          insertedReplies++;
        } catch (replyError) {
          console.warn(`[generate-threads] 답글 처리 실패:`, replyError);
          replyIds.push('');
          replyCreatedAts.push(threadCreatedAt);
        }
      }

      // 5. reply_count 갱신
      if (insertedReplies > 0) {
        await db.from('wagle_threads')
          .update({ reply_count: insertedReplies })
          .eq('id', threadId);
      }

      // 6. 사용된 페르소나 last_used_at 갱신
      const usedPersonaIds = [...new Set([personas[0].id, ...replies.map((r) => personas[r.persona_index]?.id).filter(Boolean)])];
      for (const pid of usedPersonaIds) {
        await db.from('wagle_ai_personas')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', pid);
      }

      // 주제 중복 방지용 최근 목록에 추가
      recentContents.unshift(threadContent);

      results.push({
        pattern: pattern.label,
        persona: personas[0].display_name,
        threadId,
        replyCount: insertedReplies,
      });
      console.log(`[generate-threads] 완료: ${pattern.label}, 글쓴이=${personas[0].display_name}, 답글=${insertedReplies}건`);

    } catch (err) {
      console.error(`[generate-threads] ${pattern.label} 처리 실패:`, err);
      errors.push({ pattern: pattern.label, error: String(err) });
    }
  }

  const totalReplies = results.reduce((sum, r) => sum + r.replyCount, 0);
  return {
    message: `${results.length}건 대화묶음 생성 (원글 ${results.length}, 답글 ${totalReplies})${errors.length > 0 ? `, ${errors.length}건 실패` : ''}`,
    threads: results,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ACTION: seed-personas — AI 페르소나 일괄 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const PERSONA_SEED = [
  {
    email: 'ai-solbi@sellmebuyme.internal',
    display_name: '따뜻한 솔비',
    background: { role: '초등 방과후 미술강사', experience_years: 3, tone: '다정한, 이모티콘 사용', specialties: ['미술', '돌봄', '유아', '방과후', '돌봄교실'] },
  },
  {
    email: 'ai-jiwoo@sellmebuyme.internal',
    display_name: '열정적인 지우',
    background: { role: '중등 체육 기간제 교사', experience_years: 5, tone: '활발한, 직설적', specialties: ['체육', '기간제', '면접', '자격증'] },
  },
  {
    email: 'ai-hayul@sellmebuyme.internal',
    display_name: '꼼꼼한 하율',
    background: { role: '초등 수학 강사', experience_years: 2, tone: '차분한, 정보전달형', specialties: ['수학', '교재', '커리큘럼', '초등'] },
  },
  {
    email: 'ai-doyun@sellmebuyme.internal',
    display_name: '씩씩한 도윤',
    background: { role: '코딩 방과후 강사', experience_years: 4, tone: '친근한, 줄임말 사용', specialties: ['코딩', 'IT', '디지털', '엔트리', '스크래치', '파이썬'] },
  },
  {
    email: 'ai-seoa@sellmebuyme.internal',
    display_name: '밝은 서아',
    background: { role: '영어 방과후 강사', experience_years: 3, tone: '밝은, 추천 잘하는', specialties: ['영어', '파닉스', '교재추천', '방과후'] },
  },
  {
    email: 'ai-junhyuk@sellmebuyme.internal',
    display_name: '든든한 준혁',
    background: { role: '과학 실험 강사', experience_years: 6, tone: '진지한, 안전 강조', specialties: ['과학', '실험', '안전교육', '실험실'] },
  },
  {
    email: 'ai-nayeon@sellmebuyme.internal',
    display_name: '유쾌한 나연',
    background: { role: '음악 강사', experience_years: 4, tone: '유머러스, 공감적', specialties: ['음악', '악기', '강사업무', '업무범위'] },
  },
  {
    email: 'ai-sihyun@sellmebuyme.internal',
    display_name: '차분한 시현',
    background: { role: '특수교육 보조교사', experience_years: 2, tone: '조용한, 공감적', specialties: ['특수교육', '돌봄', '보조교사', '자격요건'] },
  },
  {
    email: 'ai-eunwoo@sellmebuyme.internal',
    display_name: '다정한 은우',
    background: { role: '유치원 방과후 강사', experience_years: 3, tone: '따뜻한, 경험 공유', specialties: ['유치원', '유아', '수업팁', '5세'] },
  },
  {
    email: 'ai-taerin@sellmebuyme.internal',
    display_name: '현실적인 태린',
    background: { role: '초등 국어 기간제 교사', experience_years: 7, tone: '실용적, 선배 톤', specialties: ['국어', '기간제', '인수인계', '행정', '교무실'] },
  },
];

async function handleSeedPersonas(db: ReturnType<typeof createClient>) {
  const results: Array<{ name: string; status: string; userId?: string }> = [];

  for (const persona of PERSONA_SEED) {
    try {
      // 이미 존재하는지 확인
      const { data: existing } = await db
        .from('wagle_ai_personas')
        .select('id, auth_user_id')
        .eq('display_name', persona.display_name)
        .maybeSingle();

      if (existing) {
        results.push({ name: persona.display_name, status: '이미 존재', userId: existing.auth_user_id });
        continue;
      }

      // Supabase Auth Admin API로 유저 생성
      const { data: authUser, error: authErr } = await db.auth.admin.createUser({
        email: persona.email,
        password: crypto.randomUUID() + crypto.randomUUID(), // 랜덤 비번 (로그인 불필요)
        email_confirm: true,
        user_metadata: {
          full_name: persona.display_name,
          avatar_url: null,
        },
      });

      if (authErr || !authUser?.user) {
        results.push({ name: persona.display_name, status: `Auth 실패: ${authErr?.message}` });
        continue;
      }

      const userId = authUser.user.id;

      // user_profiles 등록
      await db.from('user_profiles').upsert({
        user_id: userId,
        display_name: persona.display_name,
        roles: [persona.background.role.includes('강사') ? '강사' : '교사'],
      }, { onConflict: 'user_id' });

      // wagle_ai_personas 등록
      await db.from('wagle_ai_personas').insert({
        auth_user_id: userId,
        display_name: persona.display_name,
        persona_background: persona.background,
      });

      results.push({ name: persona.display_name, status: '생성 완료', userId });
    } catch (err) {
      results.push({ name: persona.display_name, status: `오류: ${err}` });
    }
  }

  return { message: '페르소나 시딩 완료', results };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Deno.serve 엔트리포인트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? 'generate';

    // 인증 확인: Supabase 게이트웨이가 anon/service_role 키를 이미 검증함
    // 추가로 Authorization 헤더 존재 여부만 확인 (함수 URL + API키 조합이 보안 역할)
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(JSON.stringify({ message: '인증 필요' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const db = getAdminClient();
    let result: unknown;

    switch (action) {
      case 'generate':
        result = await handleGenerate(db);
        break;
      case 'post-scheduled':
        result = await handlePostScheduled(db);
        break;
      case 'seed-personas':
        result = await handleSeedPersonas(db);
        break;
      case 'generate-threads':
        result = await handleGenerateThreads(db, body.count ?? 3);
        break;
      default:
        return new Response(JSON.stringify({ message: `알 수 없는 action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log(`[wagle-ai-reply] action=${action} 완료:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[wagle-ai-reply] 오류:', err);
    return new Response(JSON.stringify({ message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 AI 관리자 전용 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { supabase } from './client';
import type {
  WagleThreadRow,
  AdminAiReplyLog,
  AdminAiPersona,
  WagleAiConfig,
} from '@/types/wagle';

// ━━━ AI 글 관리 쿼리 ━━━

/** AI 생성 글 목록 + 페르소나 이름 조인 */
export async function getAiThreads(): Promise<{
  data: (WagleThreadRow & { persona_name: string })[];
  error: Error | null;
}> {
  try {
    const { data: rows, error } = await supabase
      .from('wagle_threads')
      .select('*')
      .eq('is_ai_generated', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!rows || rows.length === 0) return { data: [], error: null };

    // 페르소나 이름 조인
    const personaIds = [...new Set(rows.map((r: WagleThreadRow) => r.ai_persona_id).filter(Boolean))] as string[];
    let personaMap = new Map<string, string>();
    if (personaIds.length > 0) {
      const { data: personas } = await supabase
        .from('wagle_ai_personas')
        .select('id, display_name')
        .in('id', personaIds);
      personaMap = new Map((personas || []).map((p) => [p.id, p.display_name]));
    }

    const result = rows.map((row: WagleThreadRow) => ({
      ...row,
      persona_name: row.ai_persona_id ? personaMap.get(row.ai_persona_id) || '알 수 없음' : '알 수 없음',
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error('[wagleAdmin] getAiThreads error:', err);
    return { data: [], error: err as Error };
  }
}

/** 일반 글 개수 (is_ai_generated = false) */
export async function getGeneralThreadCount(): Promise<number> {
  const { count } = await supabase
    .from('wagle_threads')
    .select('id', { count: 'exact', head: true })
    .eq('is_ai_generated', false);
  return count ?? 0;
}

/** AI 글 개수 (is_ai_generated = true) */
export async function getAiThreadCount(): Promise<number> {
  const { count } = await supabase
    .from('wagle_threads')
    .select('id', { count: 'exact', head: true })
    .eq('is_ai_generated', true);
  return count ?? 0;
}

/** AI 글 생성 Edge Function 호출 */
export async function generateAiThreads(count = 5): Promise<{
  data: { message: string; threads?: Array<{ persona: string; threadId: string }> } | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('wagle-ai-reply', {
      body: { action: 'generate-threads', count },
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('[wagleAdmin] generateAiThreads error:', err);
    return { data: null, error: err as Error };
  }
}

// ━━━ AI 답변 로그 쿼리 ━━━

/** AI 답변 로그 목록 */
export async function getAiReplyLogs(statusFilter?: string): Promise<{
  data: AdminAiReplyLog[];
  error: Error | null;
}> {
  try {
    let query = supabase
      .from('wagle_ai_reply_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return { data: [], error: null };

    // 페르소나 이름 조인
    const personaIds = [...new Set(rows.map((r: any) => r.persona_id))];
    let personaMap = new Map<string, string>();
    if (personaIds.length > 0) {
      const { data: personas } = await supabase
        .from('wagle_ai_personas')
        .select('id, display_name')
        .in('id', personaIds);
      personaMap = new Map((personas || []).map((p) => [p.id, p.display_name]));
    }

    // 쓰레드 미리보기 조인
    const threadIds = [...new Set(rows.map((r: any) => r.thread_id))];
    let threadMap = new Map<string, string>();
    if (threadIds.length > 0) {
      const { data: threads } = await supabase
        .from('wagle_threads')
        .select('id, content')
        .in('id', threadIds);
      threadMap = new Map((threads || []).map((t) => [t.id, t.content.substring(0, 50)]));
    }

    const result: AdminAiReplyLog[] = rows.map((row: any) => ({
      ...row,
      persona_name: personaMap.get(row.persona_id) || '알 수 없음',
      thread_preview: threadMap.get(row.thread_id) || '(삭제된 글)',
    }));

    return { data: result, error: null };
  } catch (err) {
    console.error('[wagleAdmin] getAiReplyLogs error:', err);
    return { data: [], error: err as Error };
  }
}

/** 답변 로그 취소 (pending → cancelled) */
export async function cancelAiReply(logId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('wagle_ai_reply_log')
      .update({ status: 'cancelled' })
      .eq('id', logId)
      .eq('status', 'pending');

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

/** 발송된 AI 답변 삭제 (wagle_replies DELETE + 로그 cancelled) */
export async function deletePostedAiReply(logId: string, replyId: string): Promise<{ error: Error | null }> {
  try {
    // 답변 삭제
    await supabase.from('wagle_replies').delete().eq('id', replyId);

    // 로그 상태 변경
    const { error } = await supabase
      .from('wagle_ai_reply_log')
      .update({ status: 'cancelled' })
      .eq('id', logId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

// ━━━ AI 페르소나 쿼리 ━━━

/** 페르소나 목록 */
export async function getAiPersonas(): Promise<{
  data: AdminAiPersona[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('wagle_ai_personas')
      .select('*')
      .order('display_name');

    if (error) throw error;
    return { data: (data || []) as AdminAiPersona[], error: null };
  } catch (err) {
    return { data: [], error: err as Error };
  }
}

// ━━━ AI 설정 쿼리 ━━━

/** AI 설정 로드 (key-value → 객체 변환) */
export async function loadAiConfig(): Promise<{
  data: WagleAiConfig | null;
  error: Error | null;
}> {
  try {
    const { data: rows, error } = await supabase
      .from('wagle_ai_config')
      .select('key, value');

    if (error) throw error;
    if (!rows || rows.length === 0) return { data: null, error: null };

    const map = new Map(rows.map((r: { key: string; value: unknown }) => [r.key, r.value]));

    const config: WagleAiConfig = {
      enabled: map.get('enabled') === true || map.get('enabled') === 'true',
      max_replies_per_run: Number(map.get('max_replies_per_run') ?? 5),
      max_replies_per_day: Number(map.get('max_replies_per_day') ?? 10),
      min_delay_minutes: Number(map.get('min_delay_minutes') ?? 30),
      max_delay_minutes: Number(map.get('max_delay_minutes') ?? 360),
      active_hours: (map.get('active_hours') as { start: number; end: number }) ?? { start: 7, end: 23 },
      reply_probability: Number(map.get('reply_probability') ?? 0.4),
    };

    return { data: config, error: null };
  } catch (err) {
    return { data: null, error: err as Error };
  }
}

/** AI 설정 저장 (각 key별 개별 UPDATE) */
export async function saveAiConfig(config: WagleAiConfig): Promise<{ error: Error | null }> {
  try {
    const entries: Array<{ key: string; value: unknown }> = [
      { key: 'enabled', value: config.enabled },
      { key: 'max_replies_per_run', value: config.max_replies_per_run },
      { key: 'max_replies_per_day', value: config.max_replies_per_day },
      { key: 'min_delay_minutes', value: config.min_delay_minutes },
      { key: 'max_delay_minutes', value: config.max_delay_minutes },
      { key: 'active_hours', value: config.active_hours },
      { key: 'reply_probability', value: config.reply_probability },
    ];

    for (const entry of entries) {
      const { error } = await supabase
        .from('wagle_ai_config')
        .update({ value: entry.value, updated_at: new Date().toISOString() })
        .eq('key', entry.key);

      if (error) throw error;
    }

    return { error: null };
  } catch (err) {
    return { error: err as Error };
  }
}

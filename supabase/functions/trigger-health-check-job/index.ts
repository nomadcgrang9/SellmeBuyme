/**
 * Trigger Health Check Job Edge Function
 * 두 가지 모드:
 * 1. mode: 'trigger' - GitHub Actions 워크플로우 트리거 (수동 점검)
 * 2. mode: 'get' - 저장된 결과 조회 (기본)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const mode = body.mode || 'get';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 모드 1: 저장된 결과 조회
    if (mode === 'get') {
      console.log('[trigger-health-check-job] Getting stored results');

      const { data, error } = await supabase
        .from('crawler_health_results')
        .select('*')
        .order('region_code');

      if (error) {
        throw new Error(`Failed to get results: ${error.message}`);
      }

      return new Response(
        JSON.stringify({ results: data || [] }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // 모드 2: GitHub Actions 워크플로우 트리거
    if (mode === 'trigger') {
      const githubToken = Deno.env.get('GITHUB_TOKEN');
      const githubRepo = Deno.env.get('GITHUB_REPO') || 'nomadcgrang9/SellmeBuyme';

      if (!githubToken) {
        // GitHub 토큰이 없으면 폴백: Job 테이블에 기록 (기존 방식)
        console.log('[trigger-health-check-job] No GitHub token, falling back to job queue');

        const regionCodes = body.regionCodes || [
          'seoul', 'busan', 'daegu', 'incheon', 'gwangju', 'daejeon', 'ulsan',
          'sejong', 'gyeonggi', 'gangwon', 'chungbuk', 'chungnam',
          'jeonbuk', 'jeonnam', 'gyeongbuk', 'gyeongnam', 'jeju'
        ];

        const jobIds: string[] = [];

        for (const regionCode of regionCodes) {
          const { data, error } = await supabase
            .from('crawler_health_jobs')
            .insert({
              region_code: regionCode,
              status: 'pending'
            })
            .select('id')
            .single();

          if (!error && data) {
            jobIds.push(data.id);
          }
        }

        return new Response(
          JSON.stringify({
            triggered: false,
            fallback: true,
            jobIds,
            message: 'Jobs created in queue. Run worker locally: npm run crawler:health-worker'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      // GitHub Actions 워크플로우 트리거
      console.log('[trigger-health-check-job] Triggering GitHub Actions workflow');

      const response = await fetch(
        `https://api.github.com/repos/${githubRepo}/dispatches`,
        {
          method: 'POST',
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `Bearer ${githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event_type: 'health-check',
            client_payload: {
              regions: body.regionCodes || [],
              triggered_at: new Date().toISOString()
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error: ${response.status} ${errorText}`);
      }

      console.log('[trigger-health-check-job] GitHub Actions workflow triggered');

      return new Response(
        JSON.stringify({
          triggered: true,
          message: 'Health check workflow triggered. Results will be available in ~5 minutes.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid mode. Use "get" or "trigger"' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );

  } catch (error) {
    console.error('[trigger-health-check-job] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

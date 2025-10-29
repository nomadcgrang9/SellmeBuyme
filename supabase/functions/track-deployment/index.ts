// track-deployment - Cloudflare Pages Deploy Hook
// 배포 완료 시 자동으로 호출되어 github_deployments 테이블에 기록

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CloudflareDeployment {
  id: string;
  short_id: string;
  project_id: string;
  project_name: string;
  environment: string;
  url: string;
  created_on: string;
  modified_on: string;
  latest_stage: {
    name: string;
    status: string;
    started_on: string | null;
    ended_on: string | null;
  };
  deployment_trigger: {
    type: string;
    metadata: {
      branch: string;
      commit_hash: string;
      commit_message: string;
    };
  };
  stages: Array<{
    name: string;
    status: string;
  }>;
  build_config: {
    build_command: string;
  };
  source: {
    type: string;
    config: {
      owner: string;
      repo_name: string;
    };
  };
  production_branch: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Supabase 클라이언트 생성
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Cloudflare Deploy Hook에서 전송한 데이터 파싱
    const deployment: CloudflareDeployment = await req.json();

    console.log('📦 Deployment received:', {
      id: deployment.id,
      status: deployment.latest_stage?.status,
      branch: deployment.deployment_trigger?.metadata?.branch,
    });

    // 배포 상태 매핑
    const status =
      deployment.latest_stage?.status === 'success'
        ? 'success'
        : deployment.latest_stage?.status === 'failure'
        ? 'failure'
        : 'pending';

    // 배포 정보 삽입
    const { data, error } = await supabase
      .from('github_deployments')
      .insert({
        commit_sha: deployment.deployment_trigger?.metadata?.commit_hash || 'unknown',
        commit_message: deployment.deployment_trigger?.metadata?.commit_message || '',
        branch: deployment.deployment_trigger?.metadata?.branch || 'unknown',
        author: 'unknown', // Cloudflare에서 제공하지 않음
        status: status,
        workflow_run_id: deployment.id,
        deployed_at: deployment.modified_on || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Database insert failed:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Deployment tracked successfully:', data.id);

    return new Response(
      JSON.stringify({ success: true, deployment: data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Get Health Check Status Edge Function
 * Polls status of health check jobs
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
    const { jobIds } = await req.json() as { jobIds: string[] };

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return new Response(
        JSON.stringify({ error: 'jobIds array is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('crawler_health_jobs')
      .select('*')
      .in('id', jobIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[get-health-check-status] Database error:', error);
      throw error;
    }

    console.log(`[get-health-check-status] Retrieved ${data.length} jobs`);

    return new Response(
      JSON.stringify({ jobs: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[get-health-check-status] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

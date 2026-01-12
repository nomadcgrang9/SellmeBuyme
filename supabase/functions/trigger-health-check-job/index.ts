/**
 * Trigger Health Check Job Edge Function
 * Creates background job records for health checks
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
    const { regionCodes } = await req.json() as { regionCodes: string[] };

    if (!regionCodes || !Array.isArray(regionCodes) || regionCodes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'regionCodes array is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[trigger-health-check-job] Creating jobs for ${regionCodes.length} regions`);

    // Create job records for each region
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

      if (error) {
        console.error(`[trigger-health-check-job] Failed to create job for ${regionCode}:`, error);
        continue;
      }

      jobIds.push(data.id);
      console.log(`[trigger-health-check-job] Created job ${data.id} for ${regionCode}`);
    }

    console.log(`[trigger-health-check-job] Created ${jobIds.length} jobs successfully`);

    return new Response(
      JSON.stringify({ jobIds }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
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

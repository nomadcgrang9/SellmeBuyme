/**
 * Edge Function: generate-crawler
 *
 * 역할:
 * 1. GitHub Actions 트리거 (GH_PAT 사용 - 브라우저 노출 방지)
 * 2. dev_board_submissions 승인 처리
 *
 * 주의: 크롤러 코드 생성 및 DB 저장은 GitHub Actions가 처리합니다!
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"

interface GenerateCrawlerRequest {
  submissionId: string
  boardName: string
  boardUrl: string
  adminUserId: string
  region?: string
  isLocalGovernment?: boolean
}

interface GenerateCrawlerResponse {
  success: boolean
  message: string
  error?: string
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...JSON_HEADERS,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    })
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "POST requests only." }), {
      status: 405,
      headers: JSON_HEADERS,
    })
  }

  try {
    const payload = (await req.json()) as GenerateCrawlerRequest

    if (!payload.submissionId || !payload.boardName || !payload.boardUrl || !payload.adminUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "submissionId, boardName, boardUrl, adminUserId are required.",
        }),
        {
          status: 400,
          headers: JSON_HEADERS,
        }
      )
    }

    console.log("[generate-crawler] Request received:", {
      submissionId: payload.submissionId,
      boardName: payload.boardName,
      boardUrl: payload.boardUrl,
      adminUserId: payload.adminUserId,
      region: payload.region,
      isLocalGovernment: payload.isLocalGovernment,
    })

    // 1. Submission 승인 처리
    // SUPABASE_ 접두어 변수는 Reserved라서 수정 불가 → 일반 변수명 사용
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || Deno.env.get("PROJECT_URL")
    const supabaseServiceKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL/PROJECT_URL or SERVICE_ROLE_KEY is not set.")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { error: submissionError } = await supabase
      .from("dev_board_submissions")
      .update({
        status: "processing",
        approved_by: payload.adminUserId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", payload.submissionId)

    if (submissionError) {
      console.warn("[generate-crawler] Submission update warning:", submissionError)
    } else {
      console.log("[generate-crawler] Submission marked as processing")
    }

    // 2. GitHub Actions 트리거 (GH_PAT 사용)
    const githubToken = Deno.env.get("GH_PAT")
    if (!githubToken) {
      throw new Error("GH_PAT environment variable is not set. Cannot trigger GitHub Actions.")
    }

    console.log("[generate-crawler] Triggering GitHub Actions...")

    const githubResponse = await fetch(
      "https://api.github.com/repos/nomadcgrang9/SellmeBuyme/dispatches",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_type: "generate_crawler",
          client_payload: {
            submission_id: payload.submissionId,
            board_name: payload.boardName,
            board_url: payload.boardUrl,
            admin_user_id: payload.adminUserId,
            region: payload.region || null,
            is_local_government: payload.isLocalGovernment || false,
          },
        }),
      }
    )

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text()
      throw new Error(`GitHub Actions trigger failed: ${errorText}`)
    }

    console.log("[generate-crawler] GitHub Actions triggered successfully!")
    console.log("[generate-crawler] Full AI crawler will be generated in background (1-2 minutes)")

    const responseBody: GenerateCrawlerResponse = {
      success: true,
      message: "GitHub Actions triggered. AI crawler generation in progress.",
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    console.error("[generate-crawler] Error:", error)

    const responseBody: GenerateCrawlerResponse = {
      success: false,
      message: "Failed to trigger crawler generation.",
      error: error instanceof Error ? error.message : String(error),
    }

    return new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
})

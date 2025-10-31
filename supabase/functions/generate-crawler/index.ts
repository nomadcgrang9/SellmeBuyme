import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4"
import { generateCrawlerCode } from "../_shared/ai-crawler.ts"

interface GenerateCrawlerRequest {
  submissionId: string
  boardName: string
  boardUrl: string
  adminUserId: string
}

interface GenerateCrawlerResponse {
  success: boolean
  crawlerId?: string
  crawlerCode?: string
  crawlBoardId?: string
  message: string
  error?: string
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...JSON_HEADERS,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

    console.log("[generate-crawler] request payload:", payload)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set.")
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const adminMetaUserId = await resolveAdminUserId(supabase, payload.adminUserId)
    const timestamp = new Date().toISOString()

    const crawlerId = payload.boardName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")

    let crawlerCode: string
    try {
      crawlerCode = await generateCrawlerCode(payload.boardName, payload.boardUrl)
      console.log("[generate-crawler] AI pipeline generated crawler code successfully.")
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn("[generate-crawler] AI pipeline failed, falling back to sample code:", message)
      crawlerCode = generateSampleCrawler(payload.boardName, payload.boardUrl)
    }
    console.log('[generate-crawler] crawler code length:', crawlerCode.length)

    const insertPayload: Record<string, unknown> = {
      name: payload.boardName,
      board_url: payload.boardUrl,
      category: "job",
      description: `AI generated crawler - ${payload.boardName}`,
      is_active: true,
      status: "active",
      crawl_batch_size: 10,
      crawler_source_code: crawlerCode,
      approved_at: timestamp,
    }

    if (adminMetaUserId) {
      insertPayload.created_by = adminMetaUserId
      insertPayload.approved_by = adminMetaUserId
    } else {
      console.warn("[generate-crawler] admin user not found, skipping created_by/approved_by metadata.")
    }

    let crawlBoardId: string

    const { data: insertedBoard, error: insertError } = await supabase
      .from("crawl_boards")
      .insert([insertPayload])
      .select("id")
      .maybeSingle()

    if (insertError) {
      const message = insertError.message ?? ""
      if (message.includes("duplicate key value") || message.includes("idx_crawl_boards_board_url")) {
        console.log("[generate-crawler] board already exists, updating existing record")

        const updatePayload: Record<string, unknown> = {
          category: "job",
          description: `AI generated crawler - ${payload.boardName}`,
          is_active: true,
          status: "active",
          crawl_batch_size: 10,
          crawler_source_code: crawlerCode,
        }

        if (adminMetaUserId) {
          updatePayload.approved_by = adminMetaUserId
          updatePayload.approved_at = timestamp
        }

        const { data: updatedBoard, error: updateError } = await supabase
          .from("crawl_boards")
          .update(updatePayload)
          .eq("board_url", payload.boardUrl)
          .select("id")
          .maybeSingle()

        if (updateError || !updatedBoard) {
          throw new Error(`Failed to update crawl_boards: ${updateError?.message ?? "not found"}`)
        }

        crawlBoardId = updatedBoard.id
      } else {
        throw new Error(`Failed to insert into crawl_boards: ${message}`)
      }
    } else {
      if (!insertedBoard?.id) {
        throw new Error("crawl_boards insert succeeded but no id was returned.")
      }
      crawlBoardId = insertedBoard.id
    }

    const submissionUpdatePayload: Record<string, unknown> = {
      status: "approved",
      crawl_board_id: crawlBoardId,
      approved_at: timestamp,
    }

    if (adminMetaUserId) {
      submissionUpdatePayload.approved_by = adminMetaUserId
    }

    const { error: submissionUpdateError } = await supabase
      .from("dev_board_submissions")
      .update(submissionUpdatePayload)
      .eq("id", payload.submissionId)

    if (submissionUpdateError) {
      console.warn("[generate-crawler] dev_board_submissions update warning:", submissionUpdateError)
    }

    const githubToken = Deno.env.get("GITHUB_TOKEN")
    if (githubToken) {
      console.log("[generate-crawler] attempting to trigger GitHub Actions")
      try {
        const githubResponse = await fetch(
          "https://api.github.com/repos/nomadcgrang9/SellmeBuyme/actions/workflows/run-crawler.yml/dispatches",
          {
            method: "POST",
            headers: {
              Authorization: `token ${githubToken}`,
              Accept: "application/vnd.github.v3+json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ref: "main",
              inputs: {
                board_id: crawlBoardId,
                crawl_mode: "run",
              },
            }),
          }
        )

        if (githubResponse.ok) {
          console.log("[generate-crawler] GitHub Actions dispatch succeeded")
        } else {
          const errorText = await githubResponse.text()
          console.warn("[generate-crawler] GitHub Actions dispatch failed:", errorText)
        }
      } catch (error) {
        console.warn("[generate-crawler] GitHub Actions dispatch error:", error)
      }
    } else {
      console.warn("[generate-crawler] GITHUB_TOKEN not set, skipping automatic run")
    }

    const responseBody: GenerateCrawlerResponse = {
      success: true,
      crawlerId,
      crawlerCode,
      crawlBoardId,
      message: `Crawler ready for ${payload.boardName}`,
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: JSON_HEADERS,
    })
  } catch (error) {
    console.error("[generate-crawler] error:", error)

    const responseBody: GenerateCrawlerResponse = {
      success: false,
      message: "Failed to generate crawler.",
      error: error instanceof Error ? error.message : String(error),
    }

    return new Response(JSON.stringify(responseBody), {
      status: 500,
      headers: JSON_HEADERS,
    })
  }
})

async function resolveAdminUserId(client: SupabaseClient, adminUserId: string): Promise<string | null> {
  if (!adminUserId) return null

  try {
    const { data, error } = await client.auth.admin.getUserById(adminUserId)
    if (error) {
      console.warn("[generate-crawler] failed to resolve admin user id:", error.message)
      return null
    }

    if (!data?.user) {
      console.warn("[generate-crawler] admin user not found for id:", adminUserId)
      return null
    }

    return data.user.id
  } catch (error) {
    console.warn("[generate-crawler] admin user lookup error:", error)
    return null
  }
}

function generateSampleCrawler(boardName: string, boardUrl: string): string {
  const sanitized = boardName.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")
  const timestamp = new Date().toISOString()

  return `/**
 * ${boardName} crawler (fallback)
 * Generated at ${timestamp}
 */

export async function crawl${sanitized}(page, config) {
  console.log(\`¢º ${boardName} crawl start\`)

  const jobs = []

  try {
    await page.goto(config.url ?? '${boardUrl}', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const selectors = [
      'table tbody tr',
      '.board-list tbody tr',
      '.tbl_list tbody tr',
      'table tr',
      '.list-item'
    ]

    let rows = []
    for (const selector of selectors) {
      rows = await page.locator(selector).all()
      if (rows.length > 0) {
        console.log(\`? selector "${selector}" yielded ${rows.length} rows\`)
        break
      }
    }

    if (rows.length === 0) {
      console.warn('?? no rows detected with fallback selectors')
      return jobs
    }

    const maxCount = Math.min(rows.length, config.crawlBatchSize || 10)
    for (let i = 0; i < maxCount; i++) {
      try {
        const row = rows[i]

        const linkElement = await row.locator('a').first()
        const title = (await linkElement.textContent())?.trim()
        let href = await linkElement.getAttribute('href')

        if (!title || !href) continue

        if (!href.startsWith('http')) {
          const baseUrl = new URL(config.url ?? '${boardUrl}')
          href = new URL(href, baseUrl.origin).href
        }

        let postedDate = new Date().toISOString().split('T')[0]
        try {
          const dateText = (await row.locator('td').nth(2).textContent())?.trim()
          if (dateText && /\d{4}/.test(dateText)) {
            postedDate = dateText.replace(/\./g, '-')
          }
        } catch {
          // ignore date parsing issues
        }

        jobs.push({
          title,
          url: href,
          organization: config.name,
          location: 'unknown',
          postedDate,
          detailContent: '',
          attachmentUrl: null,
        })

        console.log(\`  ? ${title}\`)
      } catch (rowError) {
        console.warn('  ?? row processing error:', rowError instanceof Error ? rowError.message : rowError)
      }
    }

    console.log(\`collected ${jobs.length} items\`)
    return jobs
  } catch (error) {
    console.error('fallback crawler error:', error)
    return jobs
  }
}
`
}



type Analysis = {
  pageUrl: string
  rowSelectors: string[]
  titleSelectors: string[]
  dateSelectors: string[]
  attachmentSelectors: string[]
  paginationSelectors: string[]
  usesTable: boolean
}

export type SandboxResult = {
  ok: boolean
  diagnostics: string[]
  durationMs: number
}

const DEFAULT_ROW_SELECTORS = [
  'table tbody tr',
  '.board-list tbody tr',
  '.tbl_list tbody tr',
  'table tr',
  'ul li',
  '.list-item',
]

const DEFAULT_TITLE_SELECTORS = [
  'a.subject',
  '.subject a',
  '.title a',
  'a.title',
  'a[href]',
]

const DEFAULT_DATE_SELECTORS = ['td:nth-of-type(3)', '.date', '.reg-date', '.day']
const DEFAULT_ATTACHMENT_SELECTORS = ['a[href*="download"]', 'a[href*="attach"]', 'a[href*="file"]']
const DEFAULT_PAGINATION_SELECTORS = ['.pagination a.next', '.paginate a.next', 'a.next', '.pagination a[rel="next"]']

const DATE_KEYWORDS = ['날짜', '등록일', '작성일', '일자', '게시일', 'date']
const DATE_PATTERN = /(\d{4}[.\/-]\d{1,2}[.\/-]\d{1,2})/
const PAGE_LABEL_PATTERN = /(다음|next|more|?|≫)/i

const HELPER_SNIPPET = `async function firstMatchingText(row, selectors) {
  for (const selector of selectors) {
    const locator = row.locator(selector).first()
    if (await locator.count()) {
      const text = (await locator.textContent())?.trim()
      if (text) {
        return { value: text, selector }
      }
    }
  }
  return { value: null, selector: null }
}

async function firstMatchingHref(row, selectors) {
  for (const selector of selectors) {
    const locator = row.locator(selector).first()
    if (await locator.count()) {
      const href = await locator.getAttribute('href')
      if (href) {
        return { value: href, selector }
      }
    }
  }
  const link = row.locator('a').first()
  if (await link.count()) {
    const href = await link.getAttribute('href')
    if (href) {
      return { value: href, selector: 'a' }
    }
  }
  return { value: null, selector: null }
}

function normalizeUrl(href, baseUrl) {
  if (!href) return href
  if (href.startsWith('http')) return href
  try {
    const base = new URL(baseUrl)
    return new URL(href, base.origin).href
  } catch {
    return href
  }
}

async function followPagination(page, selectors, logger) {
  for (const selector of selectors) {
    const nextButton = page.locator(selector).first()
    if (await nextButton.count()) {
      logger('[INFO] pagination selector ' + selector + ' detected')
      return selector
    }
  }
  return null
}
`

export async function analyzeBoard(boardUrl: string): Promise<Analysis> {
  const html = await fetchHtml(boardUrl)
  if (!html) {
    return {
      pageUrl: boardUrl,
      rowSelectors: [...DEFAULT_ROW_SELECTORS],
      titleSelectors: [...DEFAULT_TITLE_SELECTORS],
      dateSelectors: [...DEFAULT_DATE_SELECTORS],
      attachmentSelectors: [...DEFAULT_ATTACHMENT_SELECTORS],
      paginationSelectors: [...DEFAULT_PAGINATION_SELECTORS],
      usesTable: false,
    }
  }

  const analysis = collectSelectorsFromHtml(html)
  analysis.pageUrl = boardUrl

  if (!analysis.rowSelectors.length) analysis.rowSelectors = [...DEFAULT_ROW_SELECTORS]
  if (!analysis.titleSelectors.length) analysis.titleSelectors = [...DEFAULT_TITLE_SELECTORS]
  if (!analysis.dateSelectors.length) analysis.dateSelectors = [...DEFAULT_DATE_SELECTORS]
  if (!analysis.attachmentSelectors.length) analysis.attachmentSelectors = [...DEFAULT_ATTACHMENT_SELECTORS]
  if (!analysis.paginationSelectors.length) analysis.paginationSelectors = [...DEFAULT_PAGINATION_SELECTORS]

  return analysis
}

export async function codeGenerator(boardName: string, boardUrl: string, analysis: Analysis): Promise<string> {
  const fnSuffix = boardName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '') || 'Crawler'
  const timestamp = new Date().toISOString()

  const rowSelectorsLiteral = JSON.stringify(analysis.rowSelectors)
  const titleSelectorsLiteral = JSON.stringify(analysis.titleSelectors)
  const dateSelectorsLiteral = JSON.stringify(analysis.dateSelectors)
  const attachmentSelectorsLiteral = JSON.stringify(analysis.attachmentSelectors)
  const paginationSelectorsLiteral = JSON.stringify(analysis.paginationSelectors)
  const baseUrlLiteral = JSON.stringify(boardUrl)
  const boardNameLiteral = JSON.stringify(boardName)

  const lines: string[] = []
  lines.push('/**')
  lines.push(' * ' + boardName + ' crawler (AI pipeline v2)')
  lines.push(' * Generated at ' + timestamp)
  lines.push(' */')
  lines.push('')
  lines.push('export async function crawl' + fnSuffix + '(page, config) {')
  lines.push("  console.log('[INFO] crawl start: ' + " + boardNameLiteral + ')')
  lines.push('  const jobs: any[] = []')
  lines.push('  const rowSelectors = ' + rowSelectorsLiteral)
  lines.push('  const titleSelectors = ' + titleSelectorsLiteral)
  lines.push('  const dateSelectors = ' + dateSelectorsLiteral)
  lines.push('  const attachmentSelectors = ' + attachmentSelectorsLiteral)
  lines.push('  const paginationSelectors = ' + paginationSelectorsLiteral)
  lines.push('  const baseUrl = config.url ?? ' + baseUrlLiteral)
  lines.push('')
  lines.push('  try {')
  lines.push("    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })")
  lines.push('    await page.waitForTimeout(1500)')
  lines.push('')
  lines.push('    let rows = []')
  lines.push('    let usedRowSelector: string | null = null')
  lines.push('    for (const selector of rowSelectors) {')
  lines.push('      rows = await page.locator(selector).all()')
  lines.push('      if (rows.length > 0) {')
  lines.push('        usedRowSelector = selector')
  lines.push("        console.log('[INFO] row selector ' + selector + ' matched ' + rows.length + ' elements')")
  lines.push('        break')
  lines.push('      }')
  lines.push('    }')
  lines.push('')
  lines.push('    if (!rows.length) {')
  lines.push("      console.warn('[WARN] no rows found with known selectors')")
  lines.push('      return jobs')
  lines.push('    }')
  lines.push('')
  lines.push('    const maxCount = Math.min(rows.length, config.crawlBatchSize || 10)')
  lines.push('')
  lines.push('    for (let i = 0; i < maxCount; i++) {')
  lines.push('      try {')
  lines.push('        const row = rows[i]')
  lines.push('')
  lines.push('        const titleResult = await firstMatchingText(row, titleSelectors)')
  lines.push('        const linkResult = await firstMatchingHref(row, titleSelectors)')
  lines.push('        if (!titleResult.value || !linkResult.value) { continue }')
  lines.push('')
  lines.push('        const dateResult = await firstMatchingText(row, dateSelectors)')
  lines.push('        const attachmentResult = await firstMatchingHref(row, attachmentSelectors)')
  lines.push('')
  lines.push('        jobs.push({')
  lines.push('          title: titleResult.value,')
  lines.push('          url: normalizeUrl(linkResult.value, baseUrl),')
  lines.push("          organization: config.name,")
  lines.push("          location: config.location ?? 'unknown',")
  lines.push("          postedDate: dateResult.value ?? new Date().toISOString().split('T')[0],")
  lines.push("          detailContent: '',")
  lines.push('          attachmentUrl: attachmentResult.value ? normalizeUrl(attachmentResult.value, baseUrl) : null,')
  lines.push('          meta: {')
  lines.push('            rowSelector: usedRowSelector,')
  lines.push('            titleSelector: titleResult.selector,')
  lines.push('            dateSelector: dateResult.selector,')
  lines.push('            attachmentSelector: attachmentResult.selector,')
  lines.push('          },')
  lines.push('        })')
  lines.push('      } catch (rowError) {')
  lines.push("        console.warn('[WARN] row processing error:', rowError instanceof Error ? rowError.message : rowError)")
  lines.push('      }')
  lines.push('    }')
  lines.push('')
  lines.push('    const paginationSelector = await followPagination(page, paginationSelectors, console.log)')
  lines.push('    if (paginationSelector) {')
  lines.push("      console.log('[INFO] pagination selector ' + paginationSelector + ' detected')")
  lines.push('    }')
  lines.push('')
  lines.push("    console.log('[INFO] collected ' + jobs.length + ' items')")
  lines.push('    return jobs')
  lines.push('  } catch (error) {')
  lines.push("    console.error('[ERROR] crawl failure:', error)")
  lines.push('    return jobs')
  lines.push('  }')
  lines.push('}')

  return lines.concat(HELPER_SNIPPET.trim()).join('\n')
}

export async function sandbox(source: string): Promise<SandboxResult> {
  const start = now()
  try {
    const emitResult = await Deno.emit('/sandbox.ts', {
      sources: { '/sandbox.ts': source },
      compilerOptions: {
        target: 'ES2020',
        module: 'esnext',
        lib: ['esnext'],
        skipLibCheck: true,
        strict: false,
      },
    })

    const diagnostics = (emitResult.diagnostics ?? []).map(formatDiagnostic)
    return {
      ok: diagnostics.length === 0,
      diagnostics,
      durationMs: now() - start,
    }
  } catch (error) {
    return {
      ok: false,
      diagnostics: [error instanceof Error ? error.message : String(error)],
      durationMs: now() - start,
    }
  }
}

export async function selfCorrect(analysis: Analysis): Promise<Analysis> {
  const rotate = (values: string[]) => {
    if (values.length <= 1) return values
    const [head, ...rest] = values
    return [...rest, head]
  }

  return {
    ...analysis,
    rowSelectors: rotate(analysis.rowSelectors),
    titleSelectors: rotate(analysis.titleSelectors),
    dateSelectors: rotate(analysis.dateSelectors),
  }
}

export async function generateCrawlerCode(boardName: string, boardUrl: string): Promise<string> {
  let analysis = await analyzeBoard(boardUrl)
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = await codeGenerator(boardName, boardUrl, analysis)
    const sandboxResult = await sandbox(code)
    if (sandboxResult.ok) {
      return code
    }

    console.warn(
      `[ai-crawler] sandbox diagnostics (attempt ${attempt + 1}):`,
      sandboxResult.diagnostics.join(' | '),
    )

  summary truncated due to 1024 limit

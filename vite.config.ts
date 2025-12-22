import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// API 미들웨어
function apiMiddleware() {
  return {
    name: 'api-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/generate-crawler', (req: any, res: any) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
          res.writeHead(200)
          res.end()
          return
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        let body = ''
        req.on('data', (chunk: any) => {
          body += chunk.toString()
        })

        req.on('end', () => {
          try {
            const { submissionId, boardName, boardUrl, adminUserId } = JSON.parse(body)

            if (!submissionId || !boardName || !boardUrl || !adminUserId) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({
                success: false,
                message: '필수 필드가 누락되었습니다',
              }))
              return
            }

            console.log('[generate-crawler] 요청 수신:', {
              submissionId,
              boardName,
              boardUrl,
            })

            const crawlerId = boardName
              .toLowerCase()
              .replace(/\s+/g, '_')
              .replace(/[^a-z0-9_]/g, '')

            const crawlerCode = `/**
 * ${boardName} 크롤러
 * AI 자동 생성 (Phase 5)
 * 생성일: ${new Date().toISOString()}
 */

export async function crawl${boardName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}(page, config) {
  console.log(\`📍 \${config.name} 크롤링 시작\`);
  const jobs = [];
  try {
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });
    const rows = await page.locator('table tbody tr').all();
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      try {
        const titleElement = await row.locator('a').first();
        const title = await titleElement.textContent();
        const href = await titleElement.getAttribute('href');
        if (title && href) {
          jobs.push({
            title: title.trim(),
            url: href.startsWith('http') ? href : new URL(href, config.url).href,
            organization: config.name,
            location: '지역 미상',
            postedDate: new Date().toISOString().split('T')[0],
            source: 'crawled',
          });
        }
      } catch (e) {}
    }
    return jobs;
  } catch (error) {
    console.error('크롤링 오류:', error);
    return jobs;
  }
}`

            res.setHeader('Access-Control-Allow-Origin', '*')
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(200)
            res.end(JSON.stringify({
              success: true,
              crawlerId,
              crawlerCode,
              message: `크롤러 생성 완료: ${boardName}`,
            }))
          } catch (error) {
            console.error('[generate-crawler] 오류:', error)
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(500)
            res.end(JSON.stringify({
              success: false,
              message: '크롤러 생성 중 오류 발생',
              error: error instanceof Error ? error.message : String(error),
            }))
          }
        })
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    apiMiddleware(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/**', 'pwa-icons/**', 'picture/**'],
      manifest: {
        name: '셀바 개발자노트',
        short_name: '개발자노트',
        description: '셀미바이미 개발팀 협업 도구 - 아이디어 수집 및 게시판 등록',
        start_url: '/note',
        scope: '/note',  // ✅ scope를 '/note'로 변경하여 메인 페이지와 충돌 방지
        display: 'standalone',
        theme_color: '#a8c5e0',
        background_color: '#f9fafb',
        orientation: 'portrait',
        icons: [
          {
            src: '/pwa-icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // ✅ 오래된 캐시 자동 정리 활성화
        cleanupOutdatedCaches: true,
        // ✅ 큰 파일 캐싱 허용 (BlockNote 라이브러리 포함)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // ✅ /note 경로로의 네비게이션 폴백 설정
        navigateFallback: '/note',
        navigateFallbackDenylist: [/^\/api/, /^\/admin/, /^\/$/, /^\/landing/],  // API, 관리자, 메인, 랜딩 제외
        // 기본 캐싱 전략: 앱 셸만 캐싱 (폰트는 제외 - 런타임 캐싱으로 처리)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        globIgnores: ['**/fonts/**'],
        runtimeCaching: [
          {
            // 로컬 폰트 파일 캐싱 (ttf 파일들)
            urlPattern: /\/fonts\/.*\.(ttf|woff|woff2)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1년
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1년
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 200, // 50 → 200으로 증가 (DeveloperPage 4개 동시 쿼리 대응)
                maxAgeSeconds: 60 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // GitHub API 캐싱 (배포 정보)
            urlPattern: /^https:\/\/api\.github\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'github-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1시간
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true, // 개발 환경에서도 PWA 테스트 가능
        type: 'module'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

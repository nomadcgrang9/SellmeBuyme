import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['fonts/**', 'pwa-icons/**', 'picture/**'],
      manifest: {
        name: '셀바 개발자노트',
        short_name: '개발자노트',
        description: '셀미바이미 개발팀 협업 도구 - 아이디어 수집 및 게시판 등록',
        start_url: '/note',
        scope: '/note',
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
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5분
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

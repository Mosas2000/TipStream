import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'logo.svg'],
      manifest: {
        name: 'TipStream',
        short_name: 'TipStream',
        description: 'Send micro-tips to your favorite creators on the Stacks blockchain',
        theme_color: '#0f172a',
        background_color: '#0a0a0a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/address\/.+\/stx/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/address\/.+\/balances/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/address\/.+\/nonces/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/tx\/mempool/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/extended\/v1\/tx\/.+/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/v2\/fees\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/api\.(hiro\.so|testnet\.hiro\.so)\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'stacks-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60,
              },
            },
          },
          {
            urlPattern: /^https:\/\/api\.coingecko\.com\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-stacks': ['@stacks/transactions', '@stacks/network'],
        },
      },
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
      },
    },
    chunkSizeWarningLimit: 600,
    target: 'esnext',
    minify: 'esbuild',
  },
  optimizeDeps: {
    include: ['@stacks/network', '@stacks/transactions'],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    include: ['src/**/*.test.{js,jsx}'],
    exclude: ['e2e/**', '**/*.spec.{js,jsx}', '**/node_modules/**', '**/dist/**'],
    testTimeout: 10000,
  }
})

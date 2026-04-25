import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Manual chunking strategy to optimize bundle size and improve cacheability.
 * 
 * We isolate heavy dependencies into dedicated chunks:
 * - React/DOM: Stable core that changes infrequently.
 * - Stacks: Blockchain logic, separated from UI.
 * - WalletConnect/Reown: Heavy auth modules, lazy-loaded via @stacks/connect.
 * - Viem: Transaction/utility library.
 * - UI Icons: Specialized chunk for lucide-react (highly tree-shakable).
 */
function getManualChunk(id) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const modulePath = id.split('node_modules/')[1];
  if (!modulePath) {
    return undefined;
  }

  // Handle nested node_modules
  const actualModulePath = modulePath.includes('node_modules/') 
    ? modulePath.split('node_modules/').pop() 
    : modulePath;

  const packageName = actualModulePath.startsWith('@')
    ? actualModulePath.split('/').slice(0, 2).join('/')
    : actualModulePath.split('/')[0];

  if (
    packageName === 'react' ||
    packageName === 'react-dom' ||
    packageName === 'react-router-dom' ||
    packageName === 'scheduler'
  ) {
    return 'vendor-react';
  }

  if (id.includes('node_modules/@stacks/connect')) {
    return 'vendor-stacks-connect';
  }

  if (
    id.includes('node_modules/@stacks/') ||
    id.includes('node_modules/c32check') ||
    id.includes('node_modules/@noble/')
  ) {
    return 'vendor-stacks';
  }

  if (id.includes('node_modules/@walletconnect/')) {
    return 'vendor-walletconnect';
  }

  if (id.includes('node_modules/@reown/')) {
    return 'vendor-reown';
  }

  if (id.includes('node_modules/viem') || id.includes('node_modules/@viem/')) {
    return 'vendor-viem';
  }

  if (packageName === 'ox' || packageName === 'qrcode' || packageName === 'dijkstrajs') {
    return 'vendor-utils';
  }

  if (id.includes('node_modules/lucide-react')) {
    return 'vendor-ui-icons';
  }

  if (
    id.includes('node_modules/@radix-ui') ||
    id.includes('node_modules/class-variance-authority') ||
    id.includes('node_modules/clsx') ||
    id.includes('node_modules/tailwind-merge')
  ) {
    return 'vendor-ui-core';
  }

  if (id.includes('node_modules/web-vitals')) {
    return 'vendor-metrics';
  }

  return 'vendor-others';
}

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
        manualChunks: getManualChunk,
      },
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: false,
      },
    },
    chunkSizeWarningLimit: 600,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: true,
    cssCodeSplit: true,
    assetsInlineLimit: 4096,
  },
  esbuild: {
    drop: ['console', 'debugger'],
    legalComments: 'none',
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

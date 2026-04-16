import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function getManualChunk(id) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const modulePath = id.split('node_modules/')[1];
  if (!modulePath) {
    return undefined;
  }

  const packageName = modulePath.startsWith('@')
    ? modulePath.split('/').slice(0, 2).join('/')
    : modulePath.split('/')[0];

  if (
    packageName === 'react' ||
    packageName === 'react-dom' ||
    packageName === 'react-router-dom'
  ) {
    return 'vendor-react';
  }

  if (
    packageName === '@stacks/network' ||
    packageName === '@stacks/transactions' ||
    packageName === '@stacks/wallet-sdk' ||
    packageName === 'c32check' ||
    packageName === '@noble/hashes' ||
    packageName === '@noble/curves'
  ) {
    return 'vendor-stacks';
  }

  if (
    packageName === '@stacks/connect'
  ) {
    return 'vendor-stacks-connect';
  }

  if (
    packageName.startsWith('@walletconnect/')
  ) {
    return 'vendor-walletconnect';
  }

  if (
    packageName.startsWith('@reown/')
  ) {
    return 'vendor-reown';
  }

  if (
    packageName === 'viem'
  ) {
    return 'vendor-viem';
  }

  if (
    packageName === 'ox'
  ) {
    return 'vendor-ox';
  }

  if (
    packageName === 'qrcode'
  ) {
    return 'vendor-qrcode';
  }

  if (
    packageName === '@tanstack'
  ) {
    return 'vendor-tanstack';
  }

  if (
    packageName === '@radix-ui/react-slot' ||
    packageName === 'class-variance-authority' ||
    packageName === 'clsx' ||
    packageName === 'tailwind-merge' ||
    packageName === 'lucide-react' ||
    packageName === 'web-vitals'
  ) {
    return 'vendor-ui';
  }

  return undefined;
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

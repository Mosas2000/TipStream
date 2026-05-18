import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      // Two entry points: core (no React) and react (hooks + components)
      entry: {
        index: resolve(__dirname, 'src/index.js'),
        react: resolve(__dirname, 'src/react.js'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      // Externalize all peer deps so they're not bundled
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@stacks/transactions',
        '@stacks/network',
        '@stacks/connect',
        'lucide-react',
      ],
      output: {
        // Preserve module structure for tree-shaking
        preserveModules: false,
      },
    },
    sourcemap: true,
    minify: false,
  },
});

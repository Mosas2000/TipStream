#!/usr/bin/env node
/**
 * Development bundle analysis helper
 * 
 * Runs build and opens bundle visualizer
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 Building and analyzing bundle...\n');

const build = spawn('npm', ['run', 'build'], {
  cwd: join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    VITE_NETWORK: 'mainnet',
    VITE_APP_URL: 'https://tipstream-silk.vercel.app'
  }
});

build.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Build completed successfully!');
    console.log('📊 Bundle analysis: dist/stats.html');
    
    // Try to open the stats file
    const open = spawn('open', ['dist/stats.html'], {
      cwd: join(__dirname, '..'),
      stdio: 'ignore'
    });
    
    open.on('error', () => {
      console.log('💡 Open dist/stats.html in your browser to view bundle analysis');
    });
  } else {
    console.error(`❌ Build failed with exit code ${code}`);
    process.exit(1);
  }
});
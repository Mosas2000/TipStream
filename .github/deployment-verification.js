/**
 * Deployment Verification Script
 * Tests critical endpoints and functionality after deployment
 */

const http = require('http');
const https = require('https');

const URL = process.env.DEPLOYMENT_URL || 'https://tipstream-silk.vercel.app';
const TIMEOUT = 10000;

const tests = [
  {
    name: 'Root page loads',
    path: '/',
    check: (body) => body.includes('TipStream'),
  },
  {
    name: 'HTML is valid',
    path: '/',
    check: (body) => body.includes('<!DOCTYPE') || body.includes('<!doctype'),
  },
  {
    name: 'Bundle scripts load',
    path: '/',
    check: (body) => {
      const jsMatch = body.match(/<script[^>]*src="([^"]*)"[^>]*>/g);
      return jsMatch && jsMatch.length > 0;
    },
  },
  {
    name: 'CSS is loaded',
    path: '/',
    check: (body) => {
      const cssMatch = body.match(/<link[^>]*stylesheet[^>]*>/g);
      return cssMatch && cssMatch.length > 0;
    },
  },
  {
    name: 'No console errors in HTML',
    path: '/',
    check: (body) => !body.includes('SyntaxError') && !body.includes('ReferenceError'),
  },
];

async function runTest(test) {
  return new Promise((resolve, reject) => {
    const client = URL.startsWith('https') ? https : http;
    const req = client.get(URL + test.path, { timeout: TIMEOUT }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
        } else if (test.check(body)) {
          resolve({ name: test.name, passed: true });
        } else {
          reject(new Error('Content check failed'));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function runAllTests() {
  console.log(`Verifying deployment at: ${URL}`);
  console.log(`Tests: ${tests.length}\n`);

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await runTest(test);
      console. ${result.name}`);log(`
      passed++;
    } catch (error) {
      console. ${test.name}: ${error.message}`);error(`
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();

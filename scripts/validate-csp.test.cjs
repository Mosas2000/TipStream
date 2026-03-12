/**
 * Tests for the CSP consistency validation script.
 *
 * Run with:  node --test scripts/validate-csp.test.cjs
 */

'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, 'validate-csp.cjs');

describe('validate-csp.cjs', () => {
  it('exits with code 0 when all CSP values match', () => {
    const output = execFileSync('node', [SCRIPT], { encoding: 'utf-8' });
    assert.ok(output.includes('CSP consistency check passed'));
  });

  it('reports the correct number of directives', () => {
    const output = execFileSync('node', [SCRIPT], { encoding: 'utf-8' });
    assert.ok(output.includes('9 directives'));
  });

  it('lists all three configuration sources', () => {
    const output = execFileSync('node', [SCRIPT], { encoding: 'utf-8' });
    assert.ok(output.includes('_headers'));
    assert.ok(output.includes('vercel.json'));
    assert.ok(output.includes('netlify.toml'));
  });
});

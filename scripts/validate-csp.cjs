#!/usr/bin/env node

/**
 * CSP Consistency Validator
 *
 * Extracts the Content-Security-Policy header value from all three deployment
 * configuration files (_headers, vercel.json, netlify.toml) and verifies they
 * are identical.  When a mismatch is detected the script prints a directive-
 * level diff and exits with code 1.
 *
 * Usage:  node scripts/validate-csp.cjs
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Extractors – one per configuration format
// ---------------------------------------------------------------------------

/**
 * Extract the CSP value from the Netlify/Vercel-style _headers file.
 * Expected format:  Content-Security-Policy: <value>
 */
function extractFromHeaders() {
    const file = path.join(ROOT, 'frontend', 'public', '_headers');
    const text = fs.readFileSync(file, 'utf-8');
    const match = text.match(/Content-Security-Policy:\s*(.+)/);
    if (!match) throw new Error('CSP not found in _headers');
    return match[1].trim();
}

/**
 * Extract the CSP value from vercel.json.
 * Looks through the headers array for a header with key Content-Security-Policy.
 */
function extractFromVercel() {
    const file = path.join(ROOT, 'vercel.json');
    const config = JSON.parse(fs.readFileSync(file, 'utf-8'));
    for (const rule of config.headers || []) {
        for (const h of rule.headers || []) {
            if (h.key === 'Content-Security-Policy') {
                return h.value.trim();
            }
        }
    }
    throw new Error('CSP not found in vercel.json');
}

/**
 * Extract the CSP value from netlify.toml.
 * Matches the Content-Security-Policy = "..." line.
 */
function extractFromNetlify() {
    const file = path.join(ROOT, 'netlify.toml');
    const text = fs.readFileSync(file, 'utf-8');
    const match = text.match(/Content-Security-Policy\s*=\s*"([^"]+)"/);
    if (!match) throw new Error('CSP not found in netlify.toml');
    return match[1].trim();
}

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

/** Parse a CSP string into a sorted Map of directive -> value. */
function parseDirectives(csp) {
    const map = new Map();
    for (const part of csp.split(';')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        const [directive, ...values] = trimmed.split(/\s+/);
        map.set(directive, values.join(' '));
    }
    return new Map([...map.entries()].sort());
}

/** Return a human-readable diff between two directive maps. */
function diffDirectives(nameA, mapA, nameB, mapB) {
    const lines = [];
    const allKeys = new Set([...mapA.keys(), ...mapB.keys()]);
    for (const key of [...allKeys].sort()) {
        const vA = mapA.get(key);
        const vB = mapB.get(key);
        if (vA === undefined) {
            lines.push(`  + ${key} (only in ${nameB})`);
        } else if (vB === undefined) {
            lines.push(`  - ${key} (only in ${nameA})`);
        } else if (vA !== vB) {
            lines.push(`  ~ ${key}`);
            lines.push(`      ${nameA}: ${vA}`);
            lines.push(`      ${nameB}: ${vB}`);
        }
    }
    return lines;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
    const sources = [
        { name: '_headers', extract: extractFromHeaders },
        { name: 'vercel.json', extract: extractFromVercel },
        { name: 'netlify.toml', extract: extractFromNetlify },
    ];

    const results = sources.map((s) => ({
        name: s.name,
        raw: s.extract(),
    }));

    const directives = results.map((r) => ({
        name: r.name,
        map: parseDirectives(r.raw),
    }));

    const directiveCount = directives[0].map.size;
    const sourceNames = results.map((r) => r.name).join(', ');

    // Check pairwise equality.
    let mismatch = false;
    for (let i = 1; i < results.length; i++) {
        if (results[i].raw !== results[0].raw) {
            mismatch = true;
            const diff = diffDirectives(
                directives[0].name,
                directives[0].map,
                directives[i].name,
                directives[i].map,
            );
            console.error(`\nMismatch between ${directives[0].name} and ${directives[i].name}:`);
            diff.forEach((l) => console.error(l));
        }
    }

    if (mismatch) {
        console.error('\nCSP consistency check FAILED');
        process.exit(1);
    }

    console.log(`CSP consistency check passed -- ${directiveCount} directives across ${sourceNames}`);
}

main();
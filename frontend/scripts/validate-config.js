#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(__dirname, '../src/config/contracts.js');

const REQUIRED_ENV_VARS = [
  'VITE_NETWORK',
  'VITE_APP_URL'
];

const ALLOWED_NETWORKS = ['mainnet', 'testnet', 'devnet'];

let exitCode = 0;

console.log('Validating frontend configuration...\n');

REQUIRED_ENV_VARS.forEach(varName => {
  const value = process.env[varName];
  
  if (!value) {
    console.error(`ERROR: ${varName} is not set`);
    exitCode = 1;
  } else {
    console.log(`✓ ${varName}=${value}`);
    
    if (varName === 'VITE_NETWORK' && !ALLOWED_NETWORKS.includes(value)) {
      console.error(`ERROR: ${varName} must be one of: ${ALLOWED_NETWORKS.join(', ')}`);
      exitCode = 1;
    }
    
    if (varName === 'VITE_APP_URL') {
      try {
        const url = new URL(value);
        if (!url.protocol.match(/^https?:$/)) {
          console.error(`ERROR: ${varName} must use http or https protocol`);
          exitCode = 1;
        }
      } catch (err) {
        console.error(`ERROR: ${varName} is not a valid URL`);
        exitCode = 1;
      }
    }
  }
});

try {
  const configContent = readFileSync(configPath, 'utf-8');
  
  const addressMatch = configContent.match(/export const CONTRACT_ADDRESS = ['"]([^'"]+)['"]/);
  if (addressMatch) {
    const address = addressMatch[1];
    const stacksAddressPattern = /^S[TPMN][0-9A-Z]{38,40}$/;
    if (stacksAddressPattern.test(address)) {
      console.log(`✓ CONTRACT_ADDRESS=${address}`);
    } else {
      console.error(`ERROR: CONTRACT_ADDRESS does not match Stacks address format: ${address}`);
      exitCode = 1;
    }
  } else {
    console.error('ERROR: CONTRACT_ADDRESS not found in contracts.js');
    exitCode = 1;
  }
  
  const nameMatch = configContent.match(/export const CONTRACT_NAME = ['"]([^'"]+)['"]/);
  if (nameMatch) {
    const name = nameMatch[1];
    const namePattern = /^[a-z][a-z0-9-]*$/;
    if (namePattern.test(name)) {
      console.log(`✓ CONTRACT_NAME=${name}`);
    } else {
      console.error(`ERROR: CONTRACT_NAME must start with lowercase letter: ${name}`);
      exitCode = 1;
    }
  } else {
    console.error('ERROR: CONTRACT_NAME not found in contracts.js');
    exitCode = 1;
  }
} catch (err) {
  console.error(`ERROR: Could not read contracts.js: ${err.message}`);
  exitCode = 1;
}

if (exitCode === 0) {
  console.log('\nConfiguration validation passed');
} else {
  console.error('\nConfiguration validation failed');
}

process.exit(exitCode);

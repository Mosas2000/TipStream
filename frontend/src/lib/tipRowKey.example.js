/**
 * Example usage of getTipRowKey function
 */

import { getTipRowKey } from './tipRowKey';

// Example 1: Tip with tipId
const tipWithId = {
  tipId: '42',
  sender: 'SP1SENDER',
  recipient: 'SP2RECIPIENT',
  amount: '1000000',
  fee: '50000',
  timestamp: 1700000000,
};
console.log(getTipRowKey(tipWithId)); // "tip:42"

// Example 2: Tip without tipId but with txId
const tipWithTxId = {
  tipId: undefined,
  txId: '0xabc123',
  sender: 'SP1SENDER',
  recipient: 'SP2RECIPIENT',
  amount: '1000000',
  fee: '50000',
  timestamp: 1700000000,
};
console.log(getTipRowKey(tipWithTxId)); // "tx:0xabc123"

// Example 3: Tip with neither tipId nor txId
const tipWithFingerprint = {
  tipId: undefined,
  txId: undefined,
  sender: 'SP1SENDER',
  recipient: 'SP2RECIPIENT',
  amount: '1000000',
  fee: '50000',
  timestamp: 1700000000,
};
console.log(getTipRowKey(tipWithFingerprint)); 
// "fp:SP1SENDER:SP2RECIPIENT:1000000:50000:1700000000"

// Example 4: Minimal tip (uses defaults)
const minimalTip = {
  sender: 'SP1SENDER',
  recipient: 'SP2RECIPIENT',
};
console.log(getTipRowKey(minimalTip)); 
// "fp:SP1SENDER:SP2RECIPIENT:0:0:0"

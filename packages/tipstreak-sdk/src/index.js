/**
 * tipstreak-sdk — core entry point
 *
 * Pure JavaScript utilities with no React dependency.
 * Safe to use in any JS environment (Node, browser, React, Vue, etc.)
 *
 * @example
 * import { isValidStacksAddress, formatBalance, feeForTip } from 'tipstreak-sdk';
 */

// Stacks address & principal validation
export {
  isValidStacksAddress,
  isContractPrincipal,
  isValidStacksPrincipal,
  formatAddress,
} from './core/stacks-principal.js';

// Address book validation
export { validateAddressBookEntry } from './core/address-validation.js';

// micro-STX ↔ STX conversion and formatting
export {
  MICRO_STX,
  toMicroStxBigInt,
  hasSufficientMicroStx,
  microToStxDecimalString,
  parseBalance,
  microToStx,
  stxToMicro,
  formatBalance,
  isValidBalance,
} from './core/balance-utils.js';

// Post-condition helpers for Stacks contract calls
export {
  FEE_BASIS_POINTS,
  BASIS_POINTS_DIVISOR,
  MIN_FEE_USTX,
  FEE_PERCENT,
  SAFE_POST_CONDITION_MODE,
  maxTransferForTip,
  tipPostCondition,
  feeForTip,
  totalDeduction,
  recipientReceives,
} from './core/post-conditions.js';

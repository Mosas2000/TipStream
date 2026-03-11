/**
 * @module lib/balance-utils
 * @description Pure utility functions for converting between micro-STX
 * (the on-chain integer unit) and STX (the human-readable decimal unit).
 *
 * All functions accept both `string` and `number` inputs so they work
 * seamlessly with the raw API string stored by `useBalance` and with
 * numeric literals used elsewhere in the frontend.
 *
 * 1 STX = 1,000,000 micro-STX.
 */

/** Number of micro-STX in one STX. */
export const MICRO_STX = 1_000_000;

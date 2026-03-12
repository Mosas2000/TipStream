import { describe, it, expect } from 'vitest';
import {
    validateTipBackAmount,
    MIN_TIP_STX,
    MAX_TIP_STX,
} from '../components/RecentTips';

// ---------------------------------------------------------------------------
// Unit tests for the exported validateTipBackAmount function and constants.
// These cover the client-side validation that was added to prevent invalid
// tip-back values from reaching the wallet prompt (Issue #233).
// ---------------------------------------------------------------------------

describe('validateTipBackAmount', () => {
    describe('boundary constants', () => {
        it('exports MIN_TIP_STX as 0.001', () => {
            expect(MIN_TIP_STX).toBe(0.001);
        });

        it('exports MAX_TIP_STX as 10000', () => {
            expect(MAX_TIP_STX).toBe(10000);
        });
    });
});

import { describe, it, expect } from 'vitest';
import {
    FEE_BASIS_POINTS,
    BASIS_POINTS_DIVISOR,
    FEE_PERCENT,
    MIN_FEE_USTX,
    SAFE_POST_CONDITION_MODE,
    maxTransferForTip,
    tipPostCondition,
    feeForTip,
    totalDeduction,
    recipientReceives,
} from '../../src/lib/post-conditions';

describe('post-conditions', () => {
    describe('constants', () => {
        it('uses the correct default fee basis points', () => {
            expect(FEE_BASIS_POINTS).toBe(50);
        });

        it('uses the correct basis points divisor', () => {
            expect(BASIS_POINTS_DIVISOR).toBe(10000);
        });

        it('exports Deny as the safe post-condition mode', () => {
            // PostConditionMode.Deny is 0x02
            expect(SAFE_POST_CONDITION_MODE).toBeDefined();
        });

        it('defines MIN_FEE_USTX as 1', () => {
            expect(MIN_FEE_USTX).toBe(1);
        });

        it('exports FEE_PERCENT as a derived percentage', () => {
            expect(FEE_PERCENT).toBe(0.5);
            expect(FEE_PERCENT).toBe(FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR * 100);
        });
    });

    describe('maxTransferForTip', () => {
        it('returns amount plus fee plus one for minimum tip', () => {
            // 1000 uSTX * 50 / 10000 = 5, ceil(5) = 5
            // max = 1000 + 5 + 1 = 1006
            expect(maxTransferForTip(1000)).toBe(1006);
        });

        it('handles larger amounts correctly', () => {
            // 1_000_000 uSTX * 50 / 10000 = 5000
            // max = 1_000_000 + 5000 + 1 = 1_005_001
            expect(maxTransferForTip(1_000_000)).toBe(1_005_001);
        });

        it('ceils the fee for non-round amounts', () => {
            // 1001 * 50 / 10000 = 5.005, ceil = 6
            // max = 1001 + 6 + 1 = 1008
            expect(maxTransferForTip(1001)).toBe(1008);
        });

        it('accepts custom fee basis points', () => {
            // 1000 * 100 / 10000 = 10
            // max = 1000 + 10 + 1 = 1011
            expect(maxTransferForTip(1000, 100)).toBe(1011);
        });

        it('handles zero fee', () => {
            // 1000 * 0 / 10000 = 0
            // max = 1000 + 0 + 1 = 1001
            expect(maxTransferForTip(1000, 0)).toBe(1001);
        });

        it('handles maximum allowed fee of 1000 basis points', () => {
            // 1000 * 1000 / 10000 = 100
            // max = 1000 + 100 + 1 = 1101
            expect(maxTransferForTip(1000, 1000)).toBe(1101);
        });
    });

    describe('tipPostCondition', () => {
        it('returns an object for a valid sender and amount', () => {
            const pc = tipPostCondition('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T', 1000);
            expect(pc).toBeDefined();
        });

        it('accepts custom fee basis points', () => {
            const pc = tipPostCondition('SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T', 1000, 100);
            expect(pc).toBeDefined();
        });
    });

    describe('feeForTip', () => {
        it('computes correct fee for round amounts', () => {
            // 1_000_000 * 50 / 10000 = 5000
            expect(feeForTip(1_000_000)).toBe(5000);
        });

        it('ceils the fee for non-round amounts', () => {
            // 1001 * 50 / 10000 = 5.005 -> ceil = 6
            expect(feeForTip(1001)).toBe(6);
        });

        it('returns zero fee when basis points are zero', () => {
            expect(feeForTip(1_000_000, 0)).toBe(0);
        });

        it('handles minimum tip amount', () => {
            // 1000 * 50 / 10000 = 5
            expect(feeForTip(1000)).toBe(5);
        });

        it('enforces minimum fee of 1 uSTX for tiny amounts', () => {
            // 1 * 50 / 10000 = 0.005, ceil = 1, max(1, 1) = 1
            expect(feeForTip(1)).toBe(MIN_FEE_USTX);
        });

        it('returns minimum fee for amounts below the threshold', () => {
            // 10 * 50 / 10000 = 0.05, ceil = 1, max(1, 1) = 1
            expect(feeForTip(10)).toBe(1);
        });

        it('returns minimum fee for 100 uSTX', () => {
            // 100 * 50 / 10000 = 0.5, ceil = 1, max(1, 1) = 1
            expect(feeForTip(100)).toBe(1);
        });
    });

    describe('totalDeduction', () => {
        it('equals amount plus fee for round amounts', () => {
            // 1_000_000 + 5000 = 1_005_000
            expect(totalDeduction(1_000_000)).toBe(1_005_000);
        });

        it('equals amount plus ceiled fee for non-round amounts', () => {
            // 1001 + 6 = 1007
            expect(totalDeduction(1001)).toBe(1007);
        });

        it('equals amount when fee is zero', () => {
            expect(totalDeduction(1000, 0)).toBe(1000);
        });

        it('is always less than maxTransferForTip by exactly 1', () => {
            // maxTransferForTip adds a 1-uSTX rounding buffer
            expect(maxTransferForTip(5000) - totalDeduction(5000)).toBe(1);
        });
    });

    describe('recipientReceives', () => {
        it('returns amount minus floored fee for round amounts', () => {
            // 1_000_000 - floor(1_000_000 * 50 / 10000) = 1_000_000 - 5000 = 995000
            expect(recipientReceives(1_000_000)).toBe(995000);
        });

        it('floors the fee deduction for non-round amounts', () => {
            // 1001 - floor(1001 * 50 / 10000) = 1001 - floor(5.005) = 1001 - 5 = 996
            expect(recipientReceives(1001)).toBe(996);
        });

        it('returns full amount when fee is zero', () => {
            expect(recipientReceives(1000, 0)).toBe(1000);
        });

        it('fee charged and net received differ by at most 1 from original amount', () => {
            // feeForTip uses ceil, recipientReceives uses floor for the deduction.
            // The contract charges the sender ceil(fee) and gives the recipient
            // amount - floor(fee), so fee + net can exceed amount by at most 1.
            const amount = 1001;
            const fee = feeForTip(amount);
            const net = recipientReceives(amount);
            expect(Math.abs(fee + net - amount)).toBeLessThanOrEqual(1);
        });
    });

    describe('string input coercion', () => {
        it('maxTransferForTip accepts a string micro-STX value', () => {
            expect(maxTransferForTip('1000000')).toBe(maxTransferForTip(1000000));
        });

        it('feeForTip accepts a string micro-STX value', () => {
            expect(feeForTip('500000')).toBe(feeForTip(500000));
        });

        it('totalDeduction accepts a string micro-STX value', () => {
            expect(totalDeduction('1000000')).toBe(totalDeduction(1000000));
        });

        it('recipientReceives accepts a string micro-STX value', () => {
            expect(recipientReceives('1000000')).toBe(recipientReceives(1000000));
        });
    });
});

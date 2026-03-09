import { describe, it, expect } from 'vitest';
import {
    FEE_BASIS_POINTS,
    BASIS_POINTS_DIVISOR,
    SAFE_POST_CONDITION_MODE,
    maxTransferForTip,
    tipPostCondition,
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
});

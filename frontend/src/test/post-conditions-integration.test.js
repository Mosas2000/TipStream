import { describe, it, expect } from 'vitest';
import {
    maxTransferForTip,
    totalDeduction,
    feeForTip,
    recipientReceives,
    FEE_BASIS_POINTS,
    BASIS_POINTS_DIVISOR,
} from '../../src/lib/post-conditions';

/**
 * Integration-style tests that verify the consistency between
 * all post-condition helpers across a range of tip amounts.
 *
 * These tests ensure that the fee math in the frontend stays
 * correct and self-consistent for any realistic tip value.
 */
describe('post-condition integration', () => {
    const testAmounts = [
        1000,          // minimum tip (0.001 STX)
        10_000,        // 0.01 STX
        100_000,       // 0.1 STX
        500_000,       // 0.5 STX (common default)
        1_000_000,     // 1 STX
        10_000_000,    // 10 STX
        100_000_000,   // 100 STX
        1_000_000_000, // 1000 STX
        10_000_000_000,// 10000 STX (maximum tip)
    ];

    describe('maxTransferForTip is always greater than totalDeduction', () => {
        testAmounts.forEach(amount => {
            it(`amount = ${amount} uSTX`, () => {
                expect(maxTransferForTip(amount)).toBeGreaterThan(totalDeduction(amount));
            });
        });
    });

    describe('maxTransferForTip exceeds totalDeduction by exactly 1', () => {
        testAmounts.forEach(amount => {
            it(`amount = ${amount} uSTX`, () => {
                expect(maxTransferForTip(amount) - totalDeduction(amount)).toBe(1);
            });
        });
    });

    describe('recipientReceives is always less than the tip amount', () => {
        testAmounts.forEach(amount => {
            it(`amount = ${amount} uSTX`, () => {
                expect(recipientReceives(amount)).toBeLessThan(amount);
            });
        });
    });

    describe('recipientReceives plus fee accounts for the full amount', () => {
        testAmounts.forEach(amount => {
            it(`amount = ${amount} uSTX`, () => {
                const net = recipientReceives(amount);
                const fee = feeForTip(amount);
                // Due to ceil/floor rounding, fee + net can differ from amount by at most 1
                expect(Math.abs(net + fee - amount)).toBeLessThanOrEqual(1);
            });
        });
    });

    describe('fee percentage stays within expected range', () => {
        testAmounts.forEach(amount => {
            it(`amount = ${amount} uSTX`, () => {
                const fee = feeForTip(amount);
                const effectiveRate = fee / amount;
                // Should be approximately 0.5% (0.005), but ceil rounding can push slightly higher
                expect(effectiveRate).toBeGreaterThanOrEqual(FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR);
                // Never more than double the expected rate for small amounts
                expect(effectiveRate).toBeLessThan(2 * FEE_BASIS_POINTS / BASIS_POINTS_DIVISOR);
            });
        });
    });

    describe('totalDeduction never exceeds maxTransferForTip', () => {
        // Fuzz-style test with edge-case amounts
        const edgeCases = [1, 2, 3, 99, 100, 101, 199, 200, 201, 999, 1000, 9999, 10000, 10001];
        edgeCases.forEach(amount => {
            it(`edge case amount = ${amount} uSTX`, () => {
                expect(totalDeduction(amount)).toBeLessThan(maxTransferForTip(amount));
            });
        });
    });
});

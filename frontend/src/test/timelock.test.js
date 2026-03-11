import { describe, it, expect } from 'vitest';
import {
    blocksRemaining,
    estimateTimeRemaining,
    getPendingChangeStatus,
    timelockProgress,
    formatBlockHeight,
    formatBasisPoints,
    TimelockStatus,
    TIMELOCK_BLOCKS,
    AVERAGE_BLOCK_TIME_SECONDS,
} from '../lib/timelock';

describe('timelock utilities', () => {
    describe('constants', () => {
        it('defines timelock delay as 144 blocks', () => {
            expect(TIMELOCK_BLOCKS).toBe(144);
        });

        it('defines average block time as 600 seconds', () => {
            expect(AVERAGE_BLOCK_TIME_SECONDS).toBe(600);
        });
    });

    describe('blocksRemaining', () => {
        it('returns positive remaining blocks when timelock is active', () => {
            expect(blocksRemaining(200, 100)).toBe(100);
        });

        it('returns zero when timelock has expired', () => {
            expect(blocksRemaining(100, 200)).toBe(0);
        });

        it('returns zero when at exact expiry block', () => {
            expect(blocksRemaining(100, 100)).toBe(0);
        });

        it('returns zero for null effective height', () => {
            expect(blocksRemaining(null, 100)).toBe(0);
        });

        it('returns zero for null current height', () => {
            expect(blocksRemaining(200, null)).toBe(0);
        });

        it('returns zero for zero values', () => {
            expect(blocksRemaining(0, 0)).toBe(0);
        });

        it('handles single block remaining', () => {
            expect(blocksRemaining(101, 100)).toBe(1);
        });

        it('handles full timelock period', () => {
            expect(blocksRemaining(244, 100)).toBe(144);
        });
    });

    describe('estimateTimeRemaining', () => {
        it('returns ready message for zero blocks', () => {
            expect(estimateTimeRemaining(0)).toBe('Ready to execute');
        });

        it('returns ready message for negative blocks', () => {
            expect(estimateTimeRemaining(-5)).toBe('Ready to execute');
        });

        it('shows hours and minutes for large block counts', () => {
            // 144 blocks * 600s = 86400s = 24h 0m
            const result = estimateTimeRemaining(144);
            expect(result).toBe('~24h 0m remaining');
        });

        it('shows minutes only for small block counts', () => {
            // 3 blocks * 600s = 1800s = 30m
            const result = estimateTimeRemaining(3);
            expect(result).toBe('~30m remaining');
        });

        it('shows hours and minutes for mixed time', () => {
            // 10 blocks * 600s = 6000s = 1h 40m
            const result = estimateTimeRemaining(10);
            expect(result).toBe('~1h 40m remaining');
        });

        it('handles single block remaining', () => {
            // 1 block * 600s = 10m
            const result = estimateTimeRemaining(1);
            expect(result).toBe('~10m remaining');
        });
    });

    describe('getPendingChangeStatus', () => {
        it('returns NONE status when pending value is null', () => {
            const result = getPendingChangeStatus(null, 200, 100);
            expect(result.status).toBe(TimelockStatus.NONE);
            expect(result.blocksLeft).toBe(0);
            expect(result.timeEstimate).toBe('');
        });

        it('returns NONE status when pending value is undefined', () => {
            const result = getPendingChangeStatus(undefined, 200, 100);
            expect(result.status).toBe(TimelockStatus.NONE);
        });

        it('returns PENDING status when timelock is active', () => {
            const result = getPendingChangeStatus(true, 200, 100);
            expect(result.status).toBe(TimelockStatus.PENDING);
            expect(result.blocksLeft).toBe(100);
        });

        it('returns READY status when timelock has expired', () => {
            const result = getPendingChangeStatus(true, 100, 200);
            expect(result.status).toBe(TimelockStatus.READY);
            expect(result.blocksLeft).toBe(0);
            expect(result.timeEstimate).toBe('Ready to execute');
        });

        it('returns READY status at exact expiry block', () => {
            const result = getPendingChangeStatus(false, 100, 100);
            expect(result.status).toBe(TimelockStatus.READY);
        });

        it('includes time estimate for pending changes', () => {
            const result = getPendingChangeStatus(true, 244, 100);
            expect(result.timeEstimate).toContain('remaining');
        });

        it('works with boolean pending values', () => {
            const result = getPendingChangeStatus(false, 200, 100);
            expect(result.status).toBe(TimelockStatus.PENDING);
        });

        it('works with numeric pending values for fee changes', () => {
            const result = getPendingChangeStatus(200, 300, 100);
            expect(result.status).toBe(TimelockStatus.PENDING);
        });
    });

    describe('timelockProgress', () => {
        it('returns 0 for null values', () => {
            expect(timelockProgress(null, 100)).toBe(0);
            expect(timelockProgress(200, null)).toBe(0);
        });

        it('returns 0 at proposal block', () => {
            // effective = 244, proposal = 244 - 144 = 100, current = 100
            expect(timelockProgress(244, 100)).toBe(0);
        });

        it('returns 50 halfway through', () => {
            // effective = 244, proposal = 100, current = 172 (72 blocks elapsed)
            expect(timelockProgress(244, 172)).toBe(50);
        });

        it('returns 100 at expiry', () => {
            expect(timelockProgress(244, 244)).toBe(100);
        });

        it('returns 100 past expiry', () => {
            expect(timelockProgress(244, 300)).toBe(100);
        });

        it('returns 0 before proposal', () => {
            expect(timelockProgress(244, 50)).toBe(0);
        });
    });

    describe('formatBlockHeight', () => {
        it('formats number with locale separators', () => {
            const result = formatBlockHeight(150000);
            expect(result).toContain('150');
        });

        it('returns placeholder for zero', () => {
            expect(formatBlockHeight(0)).toBe('--');
        });

        it('returns placeholder for null', () => {
            expect(formatBlockHeight(null)).toBe('--');
        });

        it('returns placeholder for negative', () => {
            expect(formatBlockHeight(-1)).toBe('--');
        });
    });

    describe('formatBasisPoints', () => {
        it('formats 50 basis points as 0.50%', () => {
            expect(formatBasisPoints(50)).toBe('0.50%');
        });

        it('formats 1000 basis points as 10.00%', () => {
            expect(formatBasisPoints(1000)).toBe('10.00%');
        });

        it('formats 0 basis points as 0.00%', () => {
            expect(formatBasisPoints(0)).toBe('0.00%');
        });

        it('formats 200 basis points as 2.00%', () => {
            expect(formatBasisPoints(200)).toBe('2.00%');
        });

        it('returns placeholder for null', () => {
            expect(formatBasisPoints(null)).toBe('--');
        });

        it('returns placeholder for undefined', () => {
            expect(formatBasisPoints(undefined)).toBe('--');
        });
    });
});

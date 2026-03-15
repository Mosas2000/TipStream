import { describe, it, expect } from 'vitest';
import { summarizeBatchTipResult, buildBatchTipOutcomeMessage } from '../lib/batchTipResults';

describe('summarizeBatchTipResult', () => {
    it('counts per-tip ok/err outcomes from a non-strict list result', () => {
        const txData = {
            tx_result: {
                repr: '(ok (list (ok u1) (err u108) (ok u2) (err u101)))',
            },
        };

        expect(summarizeBatchTipResult(txData, 4)).toEqual({
            total: 4,
            successCount: 2,
            failureCount: 2,
            parsed: true,
        });
    });

    it('parses strict-mode count result', () => {
        const txData = {
            tx_result: {
                repr: '(ok u3)',
            },
        };

        expect(summarizeBatchTipResult(txData, 5)).toEqual({
            total: 5,
            successCount: 3,
            failureCount: 2,
            parsed: true,
        });
    });

    it('falls back to expected total when repr is missing', () => {
        expect(summarizeBatchTipResult({}, 3)).toEqual({
            total: 3,
            successCount: 3,
            failureCount: 0,
            parsed: false,
        });
    });
});

describe('buildBatchTipOutcomeMessage', () => {
    it('returns full success message', () => {
        const msg = buildBatchTipOutcomeMessage({ total: 5, successCount: 5, failureCount: 0 });
        expect(msg).toBe('5 of 5 tips sent successfully');
    });

    it('returns partial success message', () => {
        const msg = buildBatchTipOutcomeMessage({ total: 5, successCount: 3, failureCount: 2 });
        expect(msg).toBe('3 of 5 tips sent. 2 failed (see transaction details)');
    });

    it('returns all failed message', () => {
        const msg = buildBatchTipOutcomeMessage({ total: 5, successCount: 0, failureCount: 5 });
        expect(msg).toBe('Batch transaction completed but all tips failed');
    });
});

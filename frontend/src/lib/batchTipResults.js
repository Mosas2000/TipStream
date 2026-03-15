/**
 * Parse a confirmed batch tip tx result and count per-tip outcomes.
 *
 * For non-strict mode, tx_result.repr is expected to look like:
 * (ok (list (ok u1) (err u108) ...))
 */
export function summarizeBatchTipResult(txData, expectedTotal = 0) {
    const repr = txData?.tx_result?.repr;

    if (typeof repr !== 'string' || repr.length === 0) {
        return {
            total: expectedTotal,
            successCount: expectedTotal,
            failureCount: 0,
            parsed: false,
        };
    }

    const isListResult = /^\(ok \(list/.test(repr);
    const okItemMatches = repr.match(/\(ok u\d+\)/g) || [];
    const errItemMatches = repr.match(/\(err u\d+\)/g) || [];

    if (isListResult) {
        const total = okItemMatches.length + errItemMatches.length;
        return {
            total,
            successCount: okItemMatches.length,
            failureCount: errItemMatches.length,
            parsed: true,
        };
    }

    const strictMatch = repr.match(/^\(ok u(\d+)\)$/);
    if (strictMatch) {
        const successCount = Number(strictMatch[1]);
        const total = expectedTotal > 0 ? expectedTotal : successCount;
        return {
            total,
            successCount,
            failureCount: Math.max(0, total - successCount),
            parsed: true,
        };
    }

    return {
        total: expectedTotal,
        successCount: expectedTotal,
        failureCount: 0,
        parsed: false,
    };
}

export function buildBatchTipOutcomeMessage(summary) {
    const total = summary?.total ?? 0;
    const successCount = summary?.successCount ?? 0;
    const failureCount = summary?.failureCount ?? 0;

    if (total <= 0) {
        return 'Batch transaction confirmed. No tip outcomes were reported.';
    }

    if (failureCount <= 0) {
        return `${successCount} of ${total} tips sent successfully`;
    }

    if (successCount <= 0) {
        return 'Batch transaction completed but all tips failed';
    }

    return `${successCount} of ${total} tips sent. ${failureCount} failed (see transaction details)`;
}

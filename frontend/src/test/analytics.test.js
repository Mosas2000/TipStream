import { describe, it, expect, beforeEach } from 'vitest';
import { analytics } from '../lib/analytics';

describe('Analytics', () => {
    beforeEach(() => {
        analytics.reset();
    });

    it('tracks sessions', () => {
        analytics.trackSession();
        analytics.trackSession();
        const summary = analytics.getSummary();
        expect(summary.sessions).toBeGreaterThanOrEqual(2);
    });

    it('tracks page views', () => {
        analytics.trackPageView('/send');
        analytics.trackPageView('/send');
        analytics.trackPageView('/activity');
        const summary = analytics.getSummary();
        expect(summary.totalPageViews).toBe(3);
        expect(summary.sortedPages[0]).toEqual(['/send', 2]);
    });

    it('tracks wallet connections', () => {
        analytics.trackWalletConnect();
        analytics.trackWalletConnect();
        analytics.trackWalletDisconnect();
        const summary = analytics.getSummary();
        expect(summary.walletConnections).toBe(2);
    });

    it('tracks tip funnel', () => {
        analytics.trackTipStarted();
        analytics.trackTipStarted();
        analytics.trackTipSubmitted();
        analytics.trackTipSubmitted();
        analytics.trackTipConfirmed();
        analytics.trackTipCancelled();
        const summary = analytics.getSummary();
        expect(summary.tipsStarted).toBe(2);
        expect(summary.tipsSubmitted).toBe(2);
        expect(summary.tipsConfirmed).toBe(1);
        expect(summary.tipsCancelled).toBe(1);
        expect(summary.tipCompletionRate).toBe('50.0');
        expect(summary.tipDropOffRate).toBe('50.0');
    });

    it('tracks tab navigation', () => {
        analytics.trackTabNavigation('/send');
        analytics.trackTabNavigation('/send');
        analytics.trackTabNavigation('/stats');
        const summary = analytics.getSummary();
        expect(summary.sortedTabs[0]).toEqual(['/send', 2]);
        expect(summary.sortedTabs[1]).toEqual(['/stats', 1]);
    });

    it('tracks errors by component', () => {
        analytics.trackError('SendTip', 'Network error');
        analytics.trackError('SendTip', 'Network error');
        analytics.trackError('BatchTip', 'Timeout');
        const summary = analytics.getSummary();
        expect(summary.totalErrors).toBe(3);
        expect(summary.sortedErrors[0]).toEqual(['SendTip:Network error', 2]);
    });

    it('tracks auth errors with dedicated method', () => {
        analytics.trackAuthError('invalid_data_shape');
        analytics.trackAuthError('invalid_data_shape');
        analytics.trackAuthError('session_restore_invalid_shape');
        const metrics = analytics.getMetrics();
        expect(metrics.errors['auth:invalid_data_shape']).toBe(2);
        expect(metrics.errors['auth:session_restore_invalid_shape']).toBe(1);
    });

    it('truncates long auth error reason to 200 characters', () => {
        const longReason = 'x'.repeat(300);
        analytics.trackAuthError(longReason);
        const metrics = analytics.getMetrics();
        const keys = Object.keys(metrics.errors);
        const authKey = keys.find(k => k.startsWith('auth:'));
        expect(authKey.length).toBeLessThanOrEqual(200);
    });

    it('tracks batch tip events', () => {
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipSubmitted();
        const summary = analytics.getSummary();
        expect(summary.batchTipsStarted).toBe(1);
        expect(summary.batchTipsSubmitted).toBe(1);
    });

    it('tracks batch tip confirmed events', () => {
        analytics.trackBatchTipConfirmed();
        analytics.trackBatchTipConfirmed();
        const summary = analytics.getSummary();
        expect(summary.batchTipsConfirmed).toBe(2);
    });

    it('tracks batch tip failed events', () => {
        analytics.trackBatchTipFailed();
        const summary = analytics.getSummary();
        expect(summary.batchTipsFailed).toBe(1);
    });

    it('tracks batch tip cancelled events', () => {
        analytics.trackBatchTipCancelled();
        analytics.trackBatchTipCancelled();
        analytics.trackBatchTipCancelled();
        const summary = analytics.getSummary();
        expect(summary.batchTipsCancelled).toBe(3);
    });

    it('computes zero rates when no tips started', () => {
        const summary = analytics.getSummary();
        expect(summary.tipCompletionRate).toBe('0.0');
        expect(summary.tipDropOffRate).toBe('0.0');
        expect(summary.batchCompletionRate).toBe('0.0');
        expect(summary.batchDropOffRate).toBe('0.0');
    });

    it('computes batch completion rate from started and confirmed', () => {
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipConfirmed();
        analytics.trackBatchTipConfirmed();
        const summary = analytics.getSummary();
        expect(summary.batchCompletionRate).toBe('50.0');
        expect(summary.batchDropOffRate).toBe('50.0');
    });

    it('tracks a complete batch tip funnel lifecycle', () => {
        // 3 started, 2 submitted, 1 confirmed, 1 failed, 1 cancelled
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipSubmitted();
        analytics.trackBatchTipSubmitted();
        analytics.trackBatchTipConfirmed();
        analytics.trackBatchTipFailed();
        analytics.trackBatchTipCancelled();
        const summary = analytics.getSummary();
        expect(summary.batchTipsStarted).toBe(3);
        expect(summary.batchTipsSubmitted).toBe(2);
        expect(summary.batchTipsConfirmed).toBe(1);
        expect(summary.batchTipsFailed).toBe(1);
        expect(summary.batchTipsCancelled).toBe(1);
        expect(summary.batchCompletionRate).toBe('33.3');
    });

    it('tracks batch sizes as a frequency map', () => {
        analytics.trackBatchSize(3);
        analytics.trackBatchSize(3);
        analytics.trackBatchSize(5);
        analytics.trackBatchSize(10);
        const metrics = analytics.getMetrics();
        expect(metrics.batchSizes['3']).toBe(2);
        expect(metrics.batchSizes['5']).toBe(1);
        expect(metrics.batchSizes['10']).toBe(1);
    });

    it('computes average batch size from recorded sizes', () => {
        // 2 batches of 3, 1 batch of 5, 1 batch of 10 → (6+5+10)/4 = 5.25
        analytics.trackBatchSize(3);
        analytics.trackBatchSize(3);
        analytics.trackBatchSize(5);
        analytics.trackBatchSize(10);
        const summary = analytics.getSummary();
        expect(summary.averageBatchSize).toBe('5.3');
    });

    it('returns zero average batch size when no batches recorded', () => {
        const summary = analytics.getSummary();
        expect(summary.averageBatchSize).toBe('0.0');
    });

    it('records firstSeen timestamp', () => {
        analytics.trackSession();
        const summary = analytics.getSummary();
        expect(summary.firstSeen).toBeTruthy();
        expect(typeof summary.firstSeen).toBe('number');
    });

    it('resets all metrics', () => {
        analytics.trackTipStarted();
        analytics.trackTipStarted();
        analytics.trackTipConfirmed();
        analytics.trackBatchTipStarted();
        analytics.trackBatchTipConfirmed();
        const before = analytics.getSummary();
        expect(before.tipsStarted).toBeGreaterThanOrEqual(2);
        expect(before.tipsConfirmed).toBeGreaterThanOrEqual(1);
        expect(before.batchTipsStarted).toBeGreaterThanOrEqual(1);
        analytics.reset();
        const after = analytics.getSummary();
        expect(after.tipsStarted).toBe(0);
        expect(after.tipsConfirmed).toBe(0);
        expect(after.batchTipsStarted).toBe(0);
        expect(after.batchTipsConfirmed).toBe(0);
    });
});

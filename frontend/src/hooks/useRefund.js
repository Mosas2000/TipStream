import { useState, useCallback } from 'react';

const REFUND_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isWithinRefundWindow(tipTimestamp) {
  if (!tipTimestamp) return false;
  const ts = typeof tipTimestamp === 'number' ? tipTimestamp : new Date(tipTimestamp).getTime();
  return Date.now() - ts < REFUND_WINDOW_MS;
}

export function useRefund() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestRefund = useCallback(async ({ tipId, txId, sender, recipient, amount, reason }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipId, txId, sender, recipient, amount, reason }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit refund request');
      }
      return { ok: true, refundRequest: data.refundRequest };
    } catch (err) {
      const msg = err.message || 'Failed to submit refund request';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const resolveRefund = useCallback(async ({ tipId, action, recipient, refundTxId }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/refunds/${tipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, recipient, refundTxId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update refund request');
      }
      return { ok: true, refundRequest: data.refundRequest };
    } catch (err) {
      const msg = err.message || 'Failed to update refund request';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRefundRequest = useCallback(async (tipId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/refunds/${tipId}`);
      if (response.status === 404) {
        return { ok: true, refundRequest: null };
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch refund request');
      }
      return { ok: true, refundRequest: data };
    } catch (err) {
      const msg = err.message || 'Failed to fetch refund request';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUserRefunds = useCallback(async ({ sender, recipient, status, limit, offset } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sender) params.set('sender', sender);
      if (recipient) params.set('recipient', recipient);
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      if (offset) params.set('offset', String(offset));

      const response = await fetch(`/api/refunds?${params}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch refund requests');
      }
      return { ok: true, refundRequests: data.refundRequests, total: data.total };
    } catch (err) {
      const msg = err.message || 'Failed to fetch refund requests';
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    requestRefund,
    resolveRefund,
    fetchRefundRequest,
    fetchUserRefunds,
    isWithinRefundWindow,
  };
}

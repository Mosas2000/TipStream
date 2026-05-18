import { useState, useEffect, useCallback } from 'react';
import { formatSTX, formatAddress } from '../lib/utils';
import { useRefund } from '../hooks/useRefund';
import { useDemoMode } from '../context/DemoContext';
import CopyButton from './ui/copy-button';

const STATUS_STYLES = {
  pending: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  approved: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  rejected: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const PAGE_SIZE = 20;

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RefundHistory({ userAddress }) {
  const { demoEnabled } = useDemoMode();
  const { fetchUserRefunds } = useRefund();

  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (reset = true) => {
    if (!userAddress) {
      setRequests([]);
      setLoading(false);
      return;
    }

    if (demoEnabled) {
      setRequests([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    const currentOffset = reset ? 0 : offset;
    if (reset) setLoading(true);

    const params = { limit: PAGE_SIZE, offset: currentOffset };
    if (tab === 'sent') params.sender = userAddress;
    else if (tab === 'received') params.recipient = userAddress;
    else {
      params.sender = userAddress;
    }
    if (statusFilter !== 'all') params.status = statusFilter;

    const result = await fetchUserRefunds(params);

    if (result.ok) {
      if (tab === 'all') {
        const receivedResult = await fetchUserRefunds({
          recipient: userAddress,
          limit: PAGE_SIZE,
          offset: currentOffset,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        });

        const combined = [...(result.refundRequests || [])];
        if (receivedResult.ok) {
          for (const r of receivedResult.refundRequests || []) {
            if (!combined.find(x => x.tipId === r.tipId)) {
              combined.push(r);
            }
          }
        }
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setRequests(reset ? combined : prev => {
          const merged = [...prev];
          for (const r of combined) {
            if (!merged.find(x => x.tipId === r.tipId)) merged.push(r);
          }
          return merged;
        });
        setTotal(combined.length);
      } else {
        setRequests(reset ? result.refundRequests : prev => [...prev, ...result.refundRequests]);
        setTotal(result.total);
      }
      setOffset(currentOffset + PAGE_SIZE);
      setError(null);
    } else {
      setError(result.error || 'Failed to load refund history');
    }

    setLoading(false);
  }, [userAddress, tab, statusFilter, offset, demoEnabled, fetchUserRefunds]);

  useEffect(() => {
    load(true);
  }, [userAddress, tab, statusFilter]);

  const handleLoadMore = async () => {
    setLoadingMore(true);
    await load(false);
    setLoadingMore(false);
  };

  const hasMore = requests.length < total;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white mb-4" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Loading refund history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-red-100 dark:border-red-900/30 p-8">
        <p className="text-red-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => load(true)}
          className="px-6 py-2 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Refund History</h2>
        <button
          onClick={() => load(true)}
          aria-label="Refresh refund history"
          className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div role="tablist" aria-label="Filter by direction" className="flex items-center gap-2">
            {['all', 'sent', 'received'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                role="tab"
                aria-selected={tab === t}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  tab === t
                    ? 'bg-gray-900 dark:bg-amber-500 text-white dark:text-black'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <label htmlFor="refund-status-filter" className="sr-only">Filter by status</label>
          <select
            id="refund-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-none outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {requests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <p className="text-gray-400 text-sm">No refund requests found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => {
              const isSender = r.sender === userAddress;
              return (
                <div
                  key={r.tipId}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status] || STATUS_STYLES.pending}`}>
                          {STATUS_LABELS[r.status] || r.status}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {isSender ? 'You requested' : 'Requested by'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-sm mb-1">
                        <span className="text-gray-500 dark:text-gray-400">{isSender ? 'To' : 'From'}</span>
                        <span className="font-semibold text-gray-700 dark:text-gray-200">
                          {formatAddress(isSender ? r.recipient : r.sender, 8, 6)}
                        </span>
                        <CopyButton
                          text={isSender ? r.recipient : r.sender}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        />
                      </div>

                      {r.reason ? (
                        <p className="text-xs text-gray-400 italic mb-1">&ldquo;{r.reason}&rdquo;</p>
                      ) : null}

                      <p className="text-xs text-gray-400">
                        Requested {formatDate(r.createdAt)}
                        {r.resolvedAt ? ` · Resolved ${formatDate(r.resolvedAt)}` : ''}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {formatSTX(r.amount, 2)} STX
                      </p>
                      {r.refundTxId ? (
                        <a
                          href={`https://explorer.hiro.so/txid/${r.refundTxId}?chain=mainnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline"
                        >
                          View tx
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-6 py-2.5 text-sm font-semibold bg-gray-900 dark:bg-amber-500 text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

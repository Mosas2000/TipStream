import { useMemo } from 'react';

/**
 * FreshnessIndicator component displays cache status and data freshness.
 *
 * Shows whether data is live or cached, and when cached data was last updated.
 * Helps users understand the reliability of the displayed information.
 *
 * @param {Object} props
 * @param {string} props.source - Data source ('live', 'cache', or 'none')
 * @param {Object} props.metadata - Cache metadata including timestamp and age
 * @param {boolean} props.loading - Whether data is being fetched
 * @param {Function} props.onRetry - Callback for manual refresh
 * @returns {JSX.Element}
 */
export function FreshnessIndicator({ source, metadata, loading, onRetry }) {
  const statusText = useMemo(() => {
    if (loading) return 'Updating...';
    if (source === 'live') return 'Live data';
    if (source === 'cache') return 'Last retrieved from cache';
    return 'Data unavailable';
  }, [source, loading]);

  const timeText = useMemo(() => {
    if (!metadata || !metadata.age) return null;

    const seconds = Math.floor(metadata.age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  }, [metadata]);

  const statusColor = useMemo(() => {
    if (loading) return 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
    if (source === 'live') return 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800';
    if (source === 'cache') return 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800';
    return 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
  }, [source, loading]);

  const textColor = useMemo(() => {
    if (loading) return 'text-blue-600 dark:text-blue-400';
    if (source === 'live') return 'text-green-600 dark:text-green-400';
    if (source === 'cache') return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }, [source, loading]);

  const iconDot = useMemo(() => {
    if (loading) return 'bg-blue-500';
    if (source === 'live') return 'bg-green-500 animate-pulse';
    if (source === 'cache') return 'bg-amber-500';
    return 'bg-red-500';
  }, [source, loading]);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${statusColor}`}>
      <span className={`h-2 w-2 rounded-full ${iconDot}`} aria-hidden="true" />
      <span className={textColor}>
        {statusText}
        {timeText && <span className="ml-1 opacity-75">({timeText})</span>}
      </span>
      {source === 'cache' && onRetry && (
        <button
          onClick={onRetry}
          disabled={loading}
          className="ml-1 px-2 py-0.5 text-xs underline hover:opacity-75 disabled:opacity-50 transition-opacity"
          aria-label="Retry fetching live data"
        >
          Retry
        </button>
      )}
    </div>
  );
}

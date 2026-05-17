import { useTipContext } from '../context/TipContext';
import { WS_STATUS } from '../hooks/useWebSocket';
import { WS_URL } from '../config/contracts';

const statusConfig = {
  [WS_STATUS.CONNECTED]: {
    label: 'Live',
    dot: 'bg-green-500',
    text: 'text-green-700 dark:text-green-400',
    title: 'Real-time updates active',
  },
  [WS_STATUS.CONNECTING]: {
    label: 'Connecting',
    dot: 'bg-yellow-400 animate-pulse',
    text: 'text-yellow-700 dark:text-yellow-400',
    title: 'Connecting to real-time feed',
  },
  [WS_STATUS.RECONNECTING]: {
    label: 'Reconnecting',
    dot: 'bg-yellow-400 animate-pulse',
    text: 'text-yellow-700 dark:text-yellow-400',
    title: 'Reconnecting to real-time feed',
  },
  [WS_STATUS.ERROR]: {
    label: 'Polling',
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    title: 'Real-time unavailable, using polling',
  },
  [WS_STATUS.DISCONNECTED]: {
    label: 'Polling',
    dot: 'bg-gray-400',
    text: 'text-gray-500 dark:text-gray-400',
    title: 'Real-time unavailable, using polling',
  },
};

/**
 * Small badge that shows whether the app is receiving real-time tip events
 * over WebSocket or falling back to polling. Only renders when a WebSocket
 * URL is configured.
 */
export function WsConnectionBadge({ className = '' }) {
  const { wsStatus } = useTipContext();

  // Don't render anything when WebSocket is not configured.
  if (!WS_URL) return null;

  const config = statusConfig[wsStatus] ?? statusConfig[WS_STATUS.DISCONNECTED];

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text} ${className}`}
      title={config.title}
      aria-label={config.title}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}

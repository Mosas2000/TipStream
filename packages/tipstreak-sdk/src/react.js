/**
 * tipstreak-sdk/react — React entry point
 *
 * React hooks and UI components for Stacks-based apps.
 * Requires React 18+ as a peer dependency.
 *
 * @example
 * import { useBalance, useStxPrice, TxStatus } from 'tipstreak-sdk/react';
 */

// Re-export everything from core so consumers only need one import path
export * from './index.js';

// React hooks
export { useBalance } from './hooks/useBalance.js';
export { useStxPrice } from './hooks/useStxPrice.js';
export { useOnlineStatus } from './hooks/useOnlineStatus.js';
export { useTransactionLockout } from './hooks/useTransactionLockout.js';

// UI components
export { default as TxStatus, POLL_INTERVAL, MAX_POLLS } from './components/TxStatus.jsx';
export { default as CopyButton } from './components/CopyButton.jsx';
export { ToastContainer, useToast } from './components/Toast.jsx';
export { default as ConfirmDialog } from './components/ConfirmDialog.jsx';

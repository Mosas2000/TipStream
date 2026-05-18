/**
 * @module tipstreak-sdk/components/Toast
 *
 * Toast notification system: `ToastContainer`, individual `Toast`, and
 * the `useToast` hook for managing toast state.
 *
 * Requires `lucide-react` as a peer dependency.
 *
 * @requires react
 * @requires lucide-react
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const TOAST_DURATION = 5000;

const variants = {
  success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
  warning: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
};

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" aria-hidden="true" />,
  error: <XCircle className="w-5 h-5 text-red-500 dark:text-red-400" aria-hidden="true" />,
  warning: <AlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" aria-hidden="true" />,
  info: <Info className="w-5 h-5 text-blue-500 dark:text-blue-400" aria-hidden="true" />,
};

/**
 * Individual toast notification item.
 *
 * @param {object} props
 * @param {string} props.message
 * @param {'success'|'error'|'warning'|'info'} [props.type='info']
 * @param {Function} [props.onClose]
 */
function Toast({ message, type = 'info', onClose = () => {} }) {
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(dismiss, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [dismiss]);

  return (
    <div
      role="alert"
      data-testid="toast-item"
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      } ${variants[type]}`}
    >
      <span className="flex-shrink-0 mt-0.5">{icons[type]}</span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity text-current"
        aria-label={`Dismiss ${type} notification`}
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Container that renders a stack of toast notifications.
 * Place this once near the root of your app.
 *
 * @param {object} props
 * @param {Array<{id: number, message: string, type: string}>} props.toasts
 * @param {Function} props.removeToast
 *
 * @example
 * const { toasts, addToast, removeToast } = useToast();
 * return (
 *   <>
 *     <App />
 *     <ToastContainer toasts={toasts} removeToast={removeToast} />
 *   </>
 * );
 */
export function ToastContainer({ toasts, removeToast }) {
  return (
    <div
      data-testid="toast-container"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
      role="status"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

/**
 * Hook for managing toast notification state.
 *
 * @returns {{
 *   toasts: Array<{id: number, message: string, type: string}>,
 *   addToast: (message: string, type?: string) => void,
 *   removeToast: (id: number) => void
 * }}
 *
 * @example
 * const { toasts, addToast, removeToast } = useToast();
 * addToast('Transaction confirmed!', 'success');
 */
export function useToast() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}

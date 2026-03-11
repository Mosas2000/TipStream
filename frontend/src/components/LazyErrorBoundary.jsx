import { Component } from 'react';
import { analytics } from '../lib/analytics';

/**
 * Error boundary that catches lazy-loaded chunk import failures.
 *
 * When a dynamic import fails (e.g. stale deploy, network issue), this
 * boundary shows a compact error panel with a retry button instead of
 * crashing the entire app. It tracks the failure via analytics before
 * rendering the fallback UI.
 */
export default class LazyErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    const message = error?.message || 'Unknown lazy-load error';
    console.error('Lazy-load error:', message, info?.componentStack);
    analytics.trackError('LazyErrorBoundary', message);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Failed to load this page
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            A newer version may be available, or you may be offline.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-5 py-2 rounded-full text-sm font-semibold bg-slate-900 dark:bg-amber-500 text-white dark:text-black hover:bg-slate-800 dark:hover:bg-amber-400 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

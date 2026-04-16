/**
 * RequireAuth -- Guards a route to require authentication.
 *
 * If the user is not authenticated, displays an inline prompt
 * with a button to connect their wallet.
 *
 * @module components/RequireAuth
 */
import { Link } from 'react-router-dom';

export default function RequireAuth({ children, onAuth, authLoading }) {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {children}

      <div className="border-t border-gray-200 dark:border-gray-800 pt-8">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Wallet connection required
          </h3>
          <p className="text-blue-800 dark:text-blue-200 text-sm mb-4">
            This feature requires you to connect your Stacks wallet to send tips,
            manage your profile, or access personalized features.
          </p>
          <button
            onClick={onAuth}
            disabled={authLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-semibold transition-colors"
          >
            {authLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
        <p>
          or <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline">
            explore the platform
          </Link> without connecting first.
        </p>
      </div>
    </div>
  );
}

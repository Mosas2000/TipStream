import { AlertTriangle, Loader2 } from 'lucide-react';

export default function MaintenancePage({ error, onRetry, checking }) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 p-10">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          </div>

          <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-3">
            Service Temporarily Unavailable
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            TipStream is unable to connect to the smart contract. This could be due to network issues, API maintenance, or the contract not being deployed yet.
          </p>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                {error}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={onRetry}
              disabled={checking}
              className="w-full px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:bg-black dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" aria-hidden="true" />
                  Checking...
                </span>
              ) : (
                'Try Again'
              )}
            </button>

            <a
              href="https://status.hiro.so"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Check Stacks API Status →
            </a>
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          TipStream v1.0.0 • Built on Stacks
        </p>
      </div>
    </div>
  );
}

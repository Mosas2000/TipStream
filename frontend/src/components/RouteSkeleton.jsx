/**
 * RouteSkeleton -- loading placeholder displayed while lazy-loaded
 * route components are being fetched.
 *
 * Shows a pulsing shimmer that mimics the general page layout so the
 * user perceives movement rather than a blank screen.
 */
export default function RouteSkeleton() {
  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse"
      role="status"
      aria-label="Loading page"
    >
      {/* Title bar skeleton */}
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg mb-6" />

      {/* Card skeleton */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
        <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
        <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
        <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-800 rounded mb-4" />
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mt-6" />
      </div>
    </div>
  );
}

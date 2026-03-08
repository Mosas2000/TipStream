import { Link } from 'react-router-dom';

/**
 * 404 – Not Found page.
 *
 * Displayed for any route that does not match a defined path.
 * Offers a clear message and a link back to the main Send Tip view.
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-7xl font-black text-gray-200 dark:text-gray-800 select-none">404</p>

        <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          Page not found
        </h1>

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          The page you&rsquo;re looking for doesn&rsquo;t exist or has been
          moved. Check the URL or head back to the app.
        </p>

        <Link
          to="/send"
          className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 bg-gray-900 dark:bg-amber-500 text-white dark:text-black text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          Go to Send Tip
        </Link>
      </div>
    </div>
  );
}

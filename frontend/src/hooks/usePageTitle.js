import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_TITLES, DEFAULT_TITLE } from '../config/routes';

/**
 * Sets document.title based on the current route path.
 *
 * Looks up the path in ROUTE_TITLES and falls back to DEFAULT_TITLE
 * for routes without an explicit title (e.g. the 404 page).
 *
 * This hook should be called once near the top of the component tree,
 * typically inside the main App component.
 */
export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = ROUTE_TITLES[pathname] || DEFAULT_TITLE;
    document.title = title;
  }, [pathname]);
}

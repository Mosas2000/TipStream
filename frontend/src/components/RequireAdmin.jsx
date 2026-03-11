import { Navigate } from 'react-router-dom';
import { DEFAULT_AUTHENTICATED_ROUTE } from '../config/routes';

/**
 * RequireAdmin -- route guard that redirects non-owner users.
 *
 * Wrap a Route element with this component to restrict access to
 * contract-owner-only pages (e.g. the admin dashboard).
 *
 * @param {object}  props
 * @param {boolean} props.isOwner  Whether the current user is the contract owner.
 * @param {import('react').ReactNode} props.children  The protected page element.
 */
export default function RequireAdmin({ isOwner, children }) {
  if (!isOwner) {
    return <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />;
  }

  return children;
}

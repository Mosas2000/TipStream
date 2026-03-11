import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAdmin from '../components/RequireAdmin';
import { DEFAULT_AUTHENTICATED_ROUTE } from '../config/routes';

/**
 * Tests for the RequireAdmin route guard.
 *
 * Validates that admin content is shown when isOwner is true and that
 * non-owners are redirected to the default authenticated route.
 */

function AdminPage() {
  return <div data-testid="admin-page">Admin content</div>;
}

function FallbackPage() {
  return <div data-testid="fallback-page">Fallback</div>;
}

function renderGuard(isOwner) {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <RequireAdmin isOwner={isOwner}>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path={DEFAULT_AUTHENTICATED_ROUTE} element={<FallbackPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireAdmin', () => {
  it('renders children when isOwner is true', () => {
    renderGuard(true);
    expect(screen.getByTestId('admin-page')).toBeInTheDocument();
  });

  it('does not redirect when isOwner is true', () => {
    renderGuard(true);
    expect(screen.queryByTestId('fallback-page')).not.toBeInTheDocument();
  });

  it('redirects to the default route when isOwner is false', () => {
    renderGuard(false);
    expect(screen.getByTestId('fallback-page')).toBeInTheDocument();
  });

  it('does not render admin content when isOwner is false', () => {
    renderGuard(false);
    expect(screen.queryByTestId('admin-page')).not.toBeInTheDocument();
  });
});

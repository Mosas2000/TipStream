import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import NotFound from '../components/NotFound';
import { DEFAULT_AUTHENTICATED_ROUTE, ROUTE_LABELS } from '../config/routes';

/**
 * Tests for the NotFound (404) component.
 *
 * Validates that it renders the correct heading, displays the attempted
 * path, and provides a link back to the default authenticated route.
 */

function renderNotFound(path = '/unknown') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <NotFound />
    </MemoryRouter>
  );
}

describe('NotFound', () => {
  it('renders a 404 heading', () => {
    renderNotFound();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  it('displays the 404 status code', () => {
    renderNotFound();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('shows the attempted URL path', () => {
    renderNotFound('/bad/route');
    expect(screen.getByText('/bad/route')).toBeInTheDocument();
  });

  it('shows a different path for each URL', () => {
    renderNotFound('/settings/deep');
    expect(screen.getByText('/settings/deep')).toBeInTheDocument();
  });

  it('provides a link back to the default authenticated route', () => {
    renderNotFound();
    const label = ROUTE_LABELS[DEFAULT_AUTHENTICATED_ROUTE];
    const link = screen.getByRole('link', { name: new RegExp(`go to ${label}`, 'i') });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', DEFAULT_AUTHENTICATED_ROUTE);
  });

  it('marks the 404 number as decorative with aria-hidden', () => {
    renderNotFound();
    const decorative = screen.getByText('404');
    expect(decorative).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders the path in a code element for visual distinction', () => {
    renderNotFound('/missing');
    const code = screen.getByText('/missing');
    expect(code.tagName).toBe('CODE');
  });
});

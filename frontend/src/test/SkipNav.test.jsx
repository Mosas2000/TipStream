import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SkipNav from '../components/SkipNav';

/**
 * Tests for the SkipNav accessibility component.
 *
 * Validates the presence of the skip link, its target, and that it
 * carries the correct accessible text.
 */

function renderSkipNav() {
  return render(
    <MemoryRouter>
      <SkipNav />
    </MemoryRouter>
  );
}

describe('SkipNav', () => {
  it('renders a link with "Skip to content" text', () => {
    renderSkipNav();
    const link = screen.getByText('Skip to content');
    expect(link).toBeInTheDocument();
  });

  it('points to the #main-content anchor', () => {
    renderSkipNav();
    const link = screen.getByText('Skip to content');
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('is an anchor element', () => {
    renderSkipNav();
    const link = screen.getByText('Skip to content');
    expect(link.tagName).toBe('A');
  });

  it('has the sr-only class for visual hiding', () => {
    renderSkipNav();
    const link = screen.getByText('Skip to content');
    expect(link.className).toContain('sr-only');
  });

  it('includes focus styles for keyboard visibility', () => {
    renderSkipNav();
    const link = screen.getByText('Skip to content');
    expect(link.className).toContain('focus:not-sr-only');
  });
});

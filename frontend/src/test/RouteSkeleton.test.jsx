import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RouteSkeleton from '../components/RouteSkeleton';

/**
 * Tests for the RouteSkeleton loading placeholder.
 *
 * Validates accessibility attributes and the presence of shimmer
 * elements that give users visual feedback during code splitting.
 */

describe('RouteSkeleton', () => {
  it('renders a container with role="status"', () => {
    render(<RouteSkeleton />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has an accessible label for screen readers', () => {
    render(<RouteSkeleton />);
    expect(screen.getByLabelText('Loading page')).toBeInTheDocument();
  });

  it('includes the animate-pulse class for shimmer effect', () => {
    render(<RouteSkeleton />);
    const status = screen.getByRole('status');
    expect(status.className).toContain('animate-pulse');
  });

  it('contains multiple skeleton placeholder elements', () => {
    const { container } = render(<RouteSkeleton />);
    const placeholders = container.querySelectorAll('.bg-gray-200');
    expect(placeholders.length).toBeGreaterThanOrEqual(4);
  });
});

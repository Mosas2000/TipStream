import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LazyErrorBoundary from '../components/LazyErrorBoundary';

vi.mock('../lib/analytics', () => ({
  analytics: {
    trackError: vi.fn(),
  },
}));

import { analytics } from '../lib/analytics';

function ProblemChild() {
  throw new Error('chunk load failed');
}

function GoodChild() {
  return <div data-testid="good-child">OK</div>;
}

describe('LazyErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress React error boundary console noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <LazyErrorBoundary>
        <GoodChild />
      </LazyErrorBoundary>
    );
    expect(screen.getByTestId('good-child')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', () => {
    render(
      <LazyErrorBoundary>
        <ProblemChild />
      </LazyErrorBoundary>
    );
    expect(screen.getByText('Failed to load this page')).toBeInTheDocument();
  });

  it('renders the offline hint text', () => {
    render(
      <LazyErrorBoundary>
        <ProblemChild />
      </LazyErrorBoundary>
    );
    expect(screen.getByText(/newer version may be available/i)).toBeInTheDocument();
  });

  it('provides a retry button', () => {
    render(
      <LazyErrorBoundary>
        <ProblemChild />
      </LazyErrorBoundary>
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('renders an alert role for assistive technology', () => {
    render(
      <LazyErrorBoundary>
        <ProblemChild />
      </LazyErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('tracks the error via analytics', () => {
    render(
      <LazyErrorBoundary>
        <ProblemChild />
      </LazyErrorBoundary>
    );
    expect(analytics.trackError).toHaveBeenCalledWith(
      'LazyErrorBoundary',
      'chunk load failed'
    );
  });

  it('recovers when retry is clicked and child no longer throws', () => {
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) throw new Error('temporary failure');
      return <div data-testid="recovered">Recovered</div>;
    }

    render(
      <LazyErrorBoundary>
        <MaybeThrow />
      </LazyErrorBoundary>
    );

    expect(screen.getByText('Failed to load this page')).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(screen.getByTestId('recovered')).toBeInTheDocument();
  });
});

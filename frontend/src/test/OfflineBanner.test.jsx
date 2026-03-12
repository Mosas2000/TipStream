import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import OfflineBanner, { BANNER_HEIGHT_CLASS } from '../components/OfflineBanner';

// ---------------------------------------------------------------------------
// Mock the useOnlineStatus hook so we can control the return value.
// ---------------------------------------------------------------------------
let mockIsOnline = true;

vi.mock('../hooks/useOnlineStatus', () => ({
    useOnlineStatus: () => mockIsOnline,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setOnline(value) {
    mockIsOnline = value;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OfflineBanner', () => {
    beforeEach(() => {
        setOnline(true);
    });

    afterEach(() => {
        cleanup();
    });

    // -- Visibility -------------------------------------------------------

    it('renders nothing when the user is online', () => {
        const { container } = render(<OfflineBanner />);
        expect(container.firstChild).toBeNull();
    });

    it('renders the banner when the user is offline', () => {
        setOnline(false);
        render(<OfflineBanner />);
        expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
    });

    it('displays the offline warning message', () => {
        setOnline(false);
        render(<OfflineBanner />);
        expect(screen.getByText(/you are offline/i)).toBeInTheDocument();
    });

    // -- Positioning ------------------------------------------------------

    it('uses sticky positioning instead of fixed', () => {
        setOnline(false);
        render(<OfflineBanner />);
        const banner = screen.getByTestId('offline-banner');
        expect(banner.className).toContain('sticky');
        expect(banner.className).not.toContain('fixed');
    });

    it('has a z-index higher than z-50', () => {
        setOnline(false);
        render(<OfflineBanner />);
        const banner = screen.getByTestId('offline-banner');
        expect(banner.className).toContain('z-[60]');
    });

    it('positions itself at the top of the viewport', () => {
        setOnline(false);
        render(<OfflineBanner />);
        const banner = screen.getByTestId('offline-banner');
        expect(banner.className).toContain('top-0');
    });

    // -- Accessibility ----------------------------------------------------

    it('has role=alert for assistive technology', () => {
        setOnline(false);
        render(<OfflineBanner />);
        expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('has aria-live=assertive for immediate announcement', () => {
        setOnline(false);
        render(<OfflineBanner />);
        const banner = screen.getByTestId('offline-banner');
        expect(banner).toHaveAttribute('aria-live', 'assertive');
    });

    it('marks the WifiOff icon as aria-hidden', () => {
        setOnline(false);
        render(<OfflineBanner />);
        const banner = screen.getByTestId('offline-banner');
        const svg = banner.querySelector('svg');
        expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    // -- Animation --------------------------------------------------------

    it('includes the slide-down animation class', () => {
        setOnline(false);
        render(<OfflineBanner />);
        const banner = screen.getByTestId('offline-banner');
        expect(banner.className).toContain('animate-slide-down');
    });

    // -- Exported constant ------------------------------------------------

    it('exports BANNER_HEIGHT_CLASS as a non-empty string', () => {
        expect(typeof BANNER_HEIGHT_CLASS).toBe('string');
        expect(BANNER_HEIGHT_CLASS.length).toBeGreaterThan(0);
    });

    it('BANNER_HEIGHT_CLASS value starts with "top-"', () => {
        expect(BANNER_HEIGHT_CLASS).toMatch(/^top-/);
    });

    // -- Dismiss functionality --------------------------------------------

    it('renders a dismiss button with accessible label', () => {
        setOnline(false);
        render(<OfflineBanner />);
        expect(screen.getByLabelText('Dismiss offline notification')).toBeInTheDocument();
    });

    it('hides the banner when the dismiss button is clicked', () => {
        setOnline(false);
        const { container } = render(<OfflineBanner />);
        expect(screen.getByTestId('offline-banner')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('Dismiss offline notification'));

        expect(container.firstChild).toBeNull();
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import Header from '../components/Header';
import { BANNER_HEIGHT_CLASS } from '../components/OfflineBanner';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

let mockIsOnline = true;

vi.mock('../hooks/useOnlineStatus', () => ({
    useOnlineStatus: () => mockIsOnline,
}));

vi.mock('../context/ThemeContext', () => ({
    useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}));

vi.mock('../config/contracts', () => ({
    NETWORK_NAME: 'mainnet',
    STACKS_API_BASE: 'https://api.hiro.so',
}));

vi.mock('../utils/stacks', () => ({
    getMainnetAddress: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultProps = {
    userData: null,
    onAuth: vi.fn(),
    authLoading: false,
    notifications: [],
    unreadCount: 0,
    onMarkNotificationsRead: vi.fn(),
    notificationsLoading: false,
};

function setOnline(value) {
    mockIsOnline = value;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Header offline positioning', () => {
    beforeEach(() => {
        setOnline(true);
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        cleanup();
    });

    it('renders the site header navigation', () => {
        render(<Header {...defaultProps} />);
        expect(screen.getByTestId('site-header')).toBeInTheDocument();
    });

    it('uses top-0 when the user is online', () => {
        render(<Header {...defaultProps} />);
        const nav = screen.getByTestId('site-header');
        expect(nav.className).toContain('top-0');
        expect(nav.className).not.toContain(BANNER_HEIGHT_CLASS);
    });

    it('shifts to BANNER_HEIGHT_CLASS when the user is offline', () => {
        setOnline(false);
        render(<Header {...defaultProps} />);
        const nav = screen.getByTestId('site-header');
        expect(nav.className).toContain(BANNER_HEIGHT_CLASS);
    });

    it('has sticky positioning', () => {
        render(<Header {...defaultProps} />);
        const nav = screen.getByTestId('site-header');
        expect(nav.className).toContain('sticky');
    });

    it('maintains z-50 z-index', () => {
        render(<Header {...defaultProps} />);
        const nav = screen.getByTestId('site-header');
        expect(nav.className).toContain('z-50');
    });

    it('has a transition on the top property', () => {
        render(<Header {...defaultProps} />);
        const nav = screen.getByTestId('site-header');
        expect(nav.className).toContain('transition-[top]');
    });

    it('applies the backdrop blur effect', () => {
        render(<Header {...defaultProps} />);
        const nav = screen.getByTestId('site-header');
        expect(nav.className).toContain('backdrop-blur-md');
    });

    it('has an accessible aria-label', () => {
        render(<Header {...defaultProps} />);
        const nav = screen.getByTestId('site-header');
        expect(nav).toHaveAttribute('aria-label', 'Site header');
    });

    it('displays the TipStream brand name', () => {
        render(<Header {...defaultProps} />);
        expect(screen.getByText('TipStream')).toBeInTheDocument();
    });

    it('shows Connect Wallet button when not authenticated', () => {
        render(<Header {...defaultProps} />);
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('shows Disconnect button when authenticated', () => {
        render(<Header {...defaultProps} userData={{ profile: {} }} />);
        expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    it('shows Connecting text when authLoading is true', () => {
        render(<Header {...defaultProps} authLoading={true} />);
        expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
});

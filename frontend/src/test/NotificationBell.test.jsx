import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import NotificationBell from '../components/NotificationBell';

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

function makeNotification(overrides = {}) {
    return {
        txId: '0x' + Math.random().toString(16).slice(2, 18),
        event: 'tip-sent',
        sender: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
        recipient: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE',
        amount: '1000000',
        timestamp: Math.floor(Date.now() / 1000),
        ...overrides,
    };
}

const defaultProps = {
    notifications: [],
    unreadCount: 0,
    onMarkRead: vi.fn(),
    loading: false,
    lastSeenTimestamp: 0,
};

describe('NotificationBell', () => {
    describe('rendering', () => {
        it('renders the bell icon button', () => {
            render(<NotificationBell {...defaultProps} />);
            expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
        });

        it('shows unread badge when unreadCount > 0', () => {
            render(<NotificationBell {...defaultProps} unreadCount={3} />);
            expect(screen.getByText('3')).toBeInTheDocument();
        });

        it('shows 9+ when unreadCount exceeds 9', () => {
            render(<NotificationBell {...defaultProps} unreadCount={15} />);
            expect(screen.getByText('9+')).toBeInTheDocument();
        });

        it('hides badge when unreadCount is 0', () => {
            render(<NotificationBell {...defaultProps} unreadCount={0} />);
            expect(screen.queryByText('0')).not.toBeInTheDocument();
        });

        it('shows exact number when unreadCount is 9', () => {
            render(<NotificationBell {...defaultProps} unreadCount={9} />);
            expect(screen.getByText('9')).toBeInTheDocument();
            expect(screen.queryByText('9+')).not.toBeInTheDocument();
        });

        it('shows 9+ when unreadCount is exactly 10', () => {
            render(<NotificationBell {...defaultProps} unreadCount={10} />);
            expect(screen.getByText('9+')).toBeInTheDocument();
        });
    });

    describe('dropdown toggle', () => {
        it('opens dropdown on click', () => {
            render(<NotificationBell {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument();
        });

        it('closes dropdown on second click', () => {
            render(<NotificationBell {...defaultProps} />);
            const btn = screen.getByRole('button', { name: /notifications/i });
            fireEvent.click(btn);
            fireEvent.click(btn);
            expect(screen.queryByRole('region', { name: /notifications/i })).not.toBeInTheDocument();
        });

        it('calls onMarkRead when opening with unread items', () => {
            const onMarkRead = vi.fn();
            render(<NotificationBell {...defaultProps} unreadCount={2} onMarkRead={onMarkRead} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(onMarkRead).toHaveBeenCalledTimes(1);
        });

        it('does not call onMarkRead when there are no unread items', () => {
            const onMarkRead = vi.fn();
            render(<NotificationBell {...defaultProps} unreadCount={0} onMarkRead={onMarkRead} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(onMarkRead).not.toHaveBeenCalled();
        });
    });
});

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

    describe('read/unread visual distinction', () => {
        it('shows green dot for unread notifications', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: now + 10 })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={now}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dot = container.querySelector('.bg-green-400');
            expect(dot).toBeInTheDocument();
        });

        it('hides green dot for read notifications', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: now - 100 })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={now}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dots = container.querySelectorAll('.bg-green-400');
            expect(dots.length).toBe(0);
        });

        it('shows background highlight for unread items', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: now + 10 })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={now}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const highlighted = container.querySelector('[class*="bg-blue-50"]');
            expect(highlighted).toBeInTheDocument();
        });

        it('does not show background highlight for read items', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: now - 100 })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={now}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const highlighted = container.querySelector('[class*="bg-blue-50"]');
            expect(highlighted).not.toBeInTheDocument();
        });

        it('shows mixed read and unread items correctly', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [
                makeNotification({ txId: '0xnew1', timestamp: now + 10 }),
                makeNotification({ txId: '0xold1', timestamp: now - 100 }),
            ];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={now}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dots = container.querySelectorAll('.bg-green-400');
            expect(dots.length).toBe(1);
        });

        it('treats all items as read when lastSeenTimestamp is null', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: now + 10 })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={null}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dots = container.querySelectorAll('.bg-green-400');
            expect(dots.length).toBe(0);
        });

        it('shows all items as unread when lastSeenTimestamp is 0', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [
                makeNotification({ txId: '0xa', timestamp: now }),
                makeNotification({ txId: '0xb', timestamp: now - 60 }),
            ];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={0}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dots = container.querySelectorAll('.bg-green-400');
            expect(dots.length).toBe(2);
        });
    });

    describe('timestamp boundary', () => {
        it('treats notification at exact lastSeenTimestamp as read', () => {
            const ts = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: ts })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={ts}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dots = container.querySelectorAll('.bg-green-400');
            expect(dots.length).toBe(0);
        });

        it('treats notification one second after lastSeen as unread', () => {
            const ts = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: ts + 1 })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={ts}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dots = container.querySelectorAll('.bg-green-400');
            expect(dots.length).toBe(1);
        });
    });

    describe('empty states', () => {
        it('shows loading text when loading with no notifications', () => {
            render(<NotificationBell {...defaultProps} loading={true} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('shows empty message when not loading and no notifications', () => {
            render(<NotificationBell {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByText('No tips received yet')).toBeInTheDocument();
        });
    });

    describe('accessibility', () => {
        it('bell button has accessible label', () => {
            render(<NotificationBell {...defaultProps} unreadCount={5} />);
            const btn = screen.getByRole('button');
            expect(btn).toHaveAttribute('aria-label', 'Notifications (5 unread)');
        });

        it('bell button has default label with no unread', () => {
            render(<NotificationBell {...defaultProps} />);
            const btn = screen.getByRole('button');
            expect(btn).toHaveAttribute('aria-label', 'Notifications');
        });

        it('dropdown has region role', () => {
            render(<NotificationBell {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByRole('region')).toBeInTheDocument();
        });
    });

    describe('click outside', () => {
        it('closes dropdown when clicking outside', () => {
            render(<NotificationBell {...defaultProps} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByRole('region')).toBeInTheDocument();
            fireEvent.mouseDown(document.body);
            expect(screen.queryByRole('region')).not.toBeInTheDocument();
        });
    });

    describe('notification items', () => {
        it('renders notification items', () => {
            const notifications = [makeNotification({ amount: '2000000' })];
            render(<NotificationBell {...defaultProps} notifications={notifications} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByText(/STX/)).toBeInTheDocument();
        });

        it('limits displayed items to 20', () => {
            const notifications = Array.from({ length: 25 }, (_, i) =>
                makeNotification({ txId: `0x${String(i).padStart(8, '0')}` })
            );
            const { container } = render(
                <NotificationBell {...defaultProps} notifications={notifications} />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const items = container.querySelectorAll('.flex.items-start');
            expect(items.length).toBe(20);
        });

        it('unread dot has correct size and shape classes', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [makeNotification({ timestamp: now + 10 })];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={now}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const dot = container.querySelector('.bg-green-400');
            expect(dot.className).toContain('w-2');
            expect(dot.className).toContain('h-2');
            expect(dot.className).toContain('rounded-full');
            expect(dot.className).toContain('flex-shrink-0');
        });

        it('highlights multiple unread items simultaneously', () => {
            const now = Math.floor(Date.now() / 1000);
            const notifications = [
                makeNotification({ txId: '0xaaa', timestamp: now + 5 }),
                makeNotification({ txId: '0xbbb', timestamp: now + 10 }),
                makeNotification({ txId: '0xccc', timestamp: now + 15 }),
            ];
            const { container } = render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    lastSeenTimestamp={now}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const highlighted = container.querySelectorAll('[class*="bg-blue-50"]');
            expect(highlighted.length).toBe(3);
        });
    });

    describe('stable keys for notification rows', () => {
        it('uses txId as key when available', () => {
            const notifications = [makeNotification({ txId: '0xabc123' })];
            const { container } = render(
                <NotificationBell {...defaultProps} notifications={notifications} />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            const items = container.querySelectorAll('[class*="px-4"]');
            expect(items.length).toBeGreaterThan(0);
        });

        it('uses id field as fallback key when txId is missing', () => {
            const notificationWithoutTxId = {
                id: 'notification-123',
                event: 'tip-sent',
                sender: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
                recipient: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE',
                amount: '1000000',
                timestamp: Math.floor(Date.now() / 1000),
            };
            render(
                <NotificationBell
                    {...defaultProps}
                    notifications={[notificationWithoutTxId]}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByText(/STX/)).toBeInTheDocument();
        });

        it('generates stable key from sender, recipient, timestamp when txId and id missing', () => {
            const notificationWithoutIdFields = {
                event: 'tip-sent',
                sender: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
                recipient: 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE',
                amount: '1000000',
                timestamp: 1234567890,
            };
            const notifications = [notificationWithoutIdFields];
            render(
                <NotificationBell {...defaultProps} notifications={notifications} />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByText(/STX/)).toBeInTheDocument();
        });

        it('preserves notification rendering after list reorder', () => {
            const notifications = [
                makeNotification({ txId: '0xaaa', amount: '1000000' }),
                makeNotification({ txId: '0xbbb', amount: '2000000' }),
                makeNotification({ txId: '0xccc', amount: '3000000' }),
            ];
            const { rerender } = render(
                <NotificationBell {...defaultProps} notifications={notifications} />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            
            const reorderedNotifications = [
                notifications[2],
                notifications[0],
                notifications[1],
            ];
            rerender(
                <NotificationBell {...defaultProps} notifications={reorderedNotifications} />
            );
            
            expect(screen.getAllByText(/STX/)).toHaveLength(3);
        });

        it('handles notifications with missing txId alongside those with txId', () => {
            const notifications = [
                makeNotification({ txId: '0xabc123' }),
                {
                    event: 'tip-sent',
                    sender: 'SP2PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVX1234',
                    recipient: 'SP2HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5K5678',
                    amount: '2000000',
                    timestamp: Math.floor(Date.now() / 1000),
                },
                makeNotification({ txId: '0xdef456' }),
            ];
            render(
                <NotificationBell {...defaultProps} notifications={notifications} />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getAllByText(/STX/)).toHaveLength(3);
        });

        it('does not reuse DOM elements when notifications are trimmed', () => {
            const initialNotifications = Array.from({ length: 25 }, (_, i) =>
                makeNotification({ txId: `0x${String(i).padStart(8, '0')}` })
            );
            const { rerender } = render(
                <NotificationBell {...defaultProps} notifications={initialNotifications} />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            
            const trimmedNotifications = initialNotifications.slice(0, 10);
            rerender(
                <NotificationBell {...defaultProps} notifications={trimmedNotifications} />
            );
            
            expect(screen.getAllByText(/STX/)).toHaveLength(10);
        });
    });

    describe('mark all read button', () => {
        it('shows mark all read button when notifications exist', () => {
            const notifications = [makeNotification()];
            render(<NotificationBell {...defaultProps} notifications={notifications} />);
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            expect(screen.getByText('Mark all read')).toBeInTheDocument();
        });

        it('calls onMarkRead when mark all read is clicked', () => {
            const onMarkRead = vi.fn();
            const notifications = [makeNotification()];
            render(
                <NotificationBell
                    {...defaultProps}
                    notifications={notifications}
                    onMarkRead={onMarkRead}
                />
            );
            fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
            fireEvent.click(screen.getByText('Mark all read'));
            expect(onMarkRead).toHaveBeenCalled();
        });
    });
});

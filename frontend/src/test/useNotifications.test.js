import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const STORAGE_KEY = 'tipstream_last_seen_tip_ts';

vi.mock('../context/TipContext', () => ({
    useTipContext: vi.fn(() => ({
        events: [],
        eventsLoading: false,
    })),
}));

import { useNotifications } from '../hooks/useNotifications';
import { useTipContext } from '../context/TipContext';

beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
});

const USER_ADDRESS = 'SP1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE';

function makeTipEvent(overrides = {}) {
    return {
        event: 'tip-sent',
        sender: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
        recipient: USER_ADDRESS,
        amount: '1000000',
        timestamp: Math.floor(Date.now() / 1000),
        txId: '0x' + Math.random().toString(16).slice(2, 18),
        ...overrides,
    };
}

describe('useNotifications', () => {
    it('returns empty notifications when no address', () => {
        const { result } = renderHook(() => useNotifications(null));
        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
    });

    it('filters events to only tip-sent for the user address', () => {
        const now = Math.floor(Date.now() / 1000);
        useTipContext.mockReturnValue({
            events: [
                makeTipEvent({ timestamp: now }),
                makeTipEvent({ event: 'other-event', timestamp: now }),
                makeTipEvent({ recipient: 'SP_OTHER_ADDRESS', timestamp: now }),
            ],
            eventsLoading: false,
        });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.notifications.length).toBe(1);
    });

    it('counts unread based on lastSeen timestamp', () => {
        const now = Math.floor(Date.now() / 1000);
        localStorage.setItem(STORAGE_KEY, String(now - 60));

        useTipContext.mockReturnValue({
            events: [
                makeTipEvent({ timestamp: now }),
                makeTipEvent({ timestamp: now - 120 }),
            ],
            eventsLoading: false,
        });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.unreadCount).toBe(1);
    });

    it('exposes lastSeenTimestamp from localStorage', () => {
        localStorage.setItem(STORAGE_KEY, '1700000000');
        useTipContext.mockReturnValue({ events: [], eventsLoading: false });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.lastSeenTimestamp).toBe(1700000000);
    });

    it('defaults lastSeenTimestamp to 0 when not in storage', () => {
        useTipContext.mockReturnValue({ events: [], eventsLoading: false });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.lastSeenTimestamp).toBe(0);
    });

    it('markAllRead updates lastSeenTimestamp', () => {
        useTipContext.mockReturnValue({ events: [], eventsLoading: false });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        const before = result.current.lastSeenTimestamp;

        act(() => {
            result.current.markAllRead();
        });

        expect(result.current.lastSeenTimestamp).toBeGreaterThan(before);
    });

    it('markAllRead persists to localStorage', () => {
        useTipContext.mockReturnValue({ events: [], eventsLoading: false });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));

        act(() => {
            result.current.markAllRead();
        });

        const stored = localStorage.getItem(STORAGE_KEY);
        expect(stored).toBeTruthy();
        expect(Number(stored)).toBe(result.current.lastSeenTimestamp);
    });

    it('markAllRead sets unreadCount to 0', () => {
        const now = Math.floor(Date.now() / 1000);
        useTipContext.mockReturnValue({
            events: [makeTipEvent({ timestamp: now })],
            eventsLoading: false,
        });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.unreadCount).toBe(1);

        act(() => {
            result.current.markAllRead();
        });

        expect(result.current.unreadCount).toBe(0);
    });

    it('exposes loading state from TipContext', () => {
        useTipContext.mockReturnValue({ events: [], eventsLoading: true });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.loading).toBe(true);
    });

    it('provides a no-op refetch function', () => {
        useTipContext.mockReturnValue({ events: [], eventsLoading: false });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(typeof result.current.refetch).toBe('function');
        expect(() => result.current.refetch()).not.toThrow();
    });

    it('assigns synthetic timestamps when block_time is missing', () => {
        useTipContext.mockReturnValue({
            events: [
                makeTipEvent({ timestamp: undefined }),
            ],
            eventsLoading: false,
        });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.notifications[0].timestamp).toBeDefined();
        expect(typeof result.current.notifications[0].timestamp).toBe('number');
    });

    it('preserves existing timestamp from enriched events', () => {
        const fixedTs = 1700000000;
        useTipContext.mockReturnValue({
            events: [makeTipEvent({ timestamp: fixedTs })],
            eventsLoading: false,
        });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.notifications[0].timestamp).toBe(fixedTs);
    });

    it('deduplicates events by txId in notification list', () => {
        const sharedTxId = '0xdeadbeef';
        useTipContext.mockReturnValue({
            events: [
                makeTipEvent({ txId: sharedTxId, timestamp: 1700000000 }),
                makeTipEvent({ txId: sharedTxId, timestamp: 1700000001 }),
            ],
            eventsLoading: false,
        });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.notifications.length).toBe(2);
    });

    it('handles empty events array gracefully', () => {
        useTipContext.mockReturnValue({ events: [], eventsLoading: false });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.notifications).toEqual([]);
        expect(result.current.unreadCount).toBe(0);
        expect(result.current.lastSeenTimestamp).toBe(0);
    });

    it('updates unread count when events change', () => {
        const now = Math.floor(Date.now() / 1000);
        const mockContext = { events: [], eventsLoading: false };
        useTipContext.mockReturnValue(mockContext);

        const { result, rerender } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.unreadCount).toBe(0);

        useTipContext.mockReturnValue({
            events: [makeTipEvent({ timestamp: now + 100 })],
            eventsLoading: false,
        });
        rerender();

        expect(result.current.unreadCount).toBe(1);
    });

    it('returns empty when address changes to null', () => {
        const now = Math.floor(Date.now() / 1000);
        useTipContext.mockReturnValue({
            events: [makeTipEvent({ timestamp: now })],
            eventsLoading: false,
        });

        const { result, rerender } = renderHook(
            ({ addr }) => useNotifications(addr),
            { initialProps: { addr: USER_ADDRESS } }
        );
        expect(result.current.notifications.length).toBe(1);

        rerender({ addr: null });
        expect(result.current.notifications).toEqual([]);
    });

    it('excludes events where user is the sender, not recipient', () => {
        const now = Math.floor(Date.now() / 1000);
        useTipContext.mockReturnValue({
            events: [
                makeTipEvent({
                    sender: USER_ADDRESS,
                    recipient: 'SP31PKQVQZVZCK3FM3NH67CGD6G1FMR17VQVS2W5T',
                    timestamp: now,
                }),
            ],
            eventsLoading: false,
        });

        const { result } = renderHook(() => useNotifications(USER_ADDRESS));
        expect(result.current.notifications.length).toBe(0);
    });
});

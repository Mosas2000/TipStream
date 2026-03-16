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
});

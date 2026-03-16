import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTipContext } from '../context/TipContext';

const STORAGE_KEY = 'tipstream_last_seen_tip_ts';

/**
 * useNotifications -- derives incoming-tip notifications from the shared
 * event cache in TipContext instead of polling the Stacks API independently.
 *
 * @param {string|null} userAddress - The current user's STX address.
 */
export function useNotifications(userAddress) {
    const { events, eventsLoading } = useTipContext();
    const [unreadCount, setUnreadCount] = useState(0);
    const initialLastSeen = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
    const lastSeenRef = useRef(initialLastSeen);
    const [lastSeenTimestamp, setLastSeenTimestamp] = useState(initialLastSeen);

    /** Derive received tips from the shared event cache. */
    const notifications = useMemo(() => {
        if (!userAddress) return [];
        return events
            .filter(t => t.event === 'tip-sent' && t.recipient === userAddress)
            .map((t, idx) => ({
                ...t,
                // Preserve the timestamp enrichment from contractEvents; use a
                // synthetic fallback so ordering remains stable when block_time
                // is unavailable.
                timestamp: t.timestamp || Date.now() / 1000 - idx,
            }));
    }, [events, userAddress]);

    // Recompute unread count whenever notifications change.
    useEffect(() => {
        const unread = notifications.filter(
            t => t.timestamp > lastSeenRef.current
        ).length;
        setUnreadCount(unread);
    }, [notifications]);

    const markAllRead = useCallback(() => {
        const now = Math.floor(Date.now() / 1000);
        lastSeenRef.current = now;
        setLastSeenTimestamp(now);
        localStorage.setItem(STORAGE_KEY, String(now));
        setUnreadCount(0);
    }, []);

    return { notifications, unreadCount, lastSeenTimestamp, loading: eventsLoading, markAllRead, refetch: () => {} };
}

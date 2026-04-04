import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTipContext } from '../context/TipContext';
import { NETWORK_NAME } from '../config/contracts';
import {
  getLastSeenTimestamp,
  setLastSeenTimestamp as saveLastSeenTimestamp,
  migrateLegacyNotificationState
} from '../lib/notificationStorage';

/**
 * useNotifications -- derives incoming-tip notifications from the shared
 * event cache in TipContext instead of polling the Stacks API independently.
 *
 * @param {string|null} userAddress - The current user's STX address.
 */
export function useNotifications(userAddress) {
    const { events, eventsLoading } = useTipContext();
    const [unreadCount, setUnreadCount] = useState(0);
    const network = NETWORK_NAME;
    const [now] = useState(() => Date.now() / 1000);
    
    const [lastSeenOverride, setLastSeenOverride] = useState(null);
    
    const lastSeenTimestamp = useMemo(() => {
      if (lastSeenOverride !== null) return lastSeenOverride;
      if (!userAddress || !network) return 0;
      const migrated = migrateLegacyNotificationState(userAddress, network);
      if (migrated !== null) return migrated;
      return getLastSeenTimestamp(userAddress, network);
    }, [userAddress, network, lastSeenOverride]);
    
    const lastSeenRef = useRef(lastSeenTimestamp);
    
    useEffect(() => {
      lastSeenRef.current = lastSeenTimestamp;
    }, [lastSeenTimestamp]);

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
                timestamp: t.timestamp || now - idx,
            }));
    }, [events, userAddress, now]);

    // Recompute unread count whenever notifications change.
    useEffect(() => {
        const unread = notifications.filter(
            t => t.timestamp > lastSeenRef.current
        ).length;
        setUnreadCount(unread);
    }, [notifications]);

    const markAllRead = useCallback(() => {
        if (!userAddress || !network) return;
        
        const now = Math.floor(Date.now() / 1000);
        lastSeenRef.current = now;
        setLastSeenOverride(now);
        saveLastSeenTimestamp(userAddress, network, now);
        setUnreadCount(0);
    }, [userAddress, network]);

    return { notifications, unreadCount, lastSeenTimestamp, loading: eventsLoading, markAllRead, refetch: () => {} };
}

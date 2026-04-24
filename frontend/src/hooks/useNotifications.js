import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTipContext } from '../context/TipContext';
import { useDemoMode } from '../context/DemoContext';
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
    const { demoEnabled, demoNotifications, markNotificationRead } = useDemoMode();
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

    /** Derive received tips from the shared event cache or demo context. */
    const notifications = useMemo(() => {
        if (demoEnabled) {
            return demoNotifications.map(n => ({
                id: n.id,
                recipient: userAddress,
                sender: n.sender,
                amount: n.amount,
                timestamp: Math.floor(n.timestamp / 1000),
                event: 'tip-sent',
                memo: n.memo || '',
                read: n.read
            }));
        }

        if (!userAddress) return [];
        return events
            .filter(t => t.event === 'tip-sent' && t.recipient === userAddress)
            .map((t, idx) => ({
                ...t,
                timestamp: t.timestamp || now - idx,
            }));
    }, [events, userAddress, now, demoEnabled, demoNotifications]);

    // Recompute unread count whenever notifications change.
    useEffect(() => {
        if (demoEnabled) {
            setUnreadCount(demoNotifications.filter(n => !n.read).length);
            return;
        }

        const unread = notifications.filter(
            t => t.timestamp > lastSeenRef.current
        ).length;
        setUnreadCount(unread);
    }, [notifications, demoEnabled, demoNotifications]);

    const markAllRead = useCallback(() => {
        if (demoEnabled) {
            demoNotifications.forEach(n => markNotificationRead(n.id));
            setUnreadCount(0);
            return;
        }

        if (!userAddress || !network) return;
        
        const now = Math.floor(Date.now() / 1000);
        lastSeenRef.current = now;
        setLastSeenOverride(now);
        saveLastSeenTimestamp(userAddress, network, now);
        setUnreadCount(0);
    }, [userAddress, network, demoEnabled, demoNotifications, markNotificationRead]);

    return { notifications, unreadCount, lastSeenTimestamp, loading: eventsLoading, markAllRead, refetch: () => {} };
}


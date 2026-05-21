import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTipContext } from '../context/TipContext';
import { useDemoMode } from '../context/DemoContext';
import { NETWORK_NAME } from '../config/contracts';
import {
  getLastSeenTimestamp,
  setLastSeenTimestamp as saveLastSeenTimestamp,
  migrateLegacyNotificationState
} from '../lib/notificationStorage';
import { EVENT_TYPES, isEventEnabled, isChannelEnabled, CHANNELS } from '../lib/notificationPreferences';

/**
 * useNotifications -- derives incoming-tip notifications from the shared
 * event cache in TipContext instead of polling the Stacks API independently.
 *
 * Respects notification preferences: events and channels that are disabled
 * are excluded from the returned list and unread count.
 *
 * @param {string|null} userAddress - The current user's STX address.
 * @param {object|null} preferences - Notification preferences from NotificationPreferencesContext.
 */
export function useNotifications(userAddress, preferences = null) {
    const { events, eventsLoading } = useTipContext();
    const { demoEnabled, demoNotifications, markNotificationRead } = useDemoMode();
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
        const inAppEnabled = isChannelEnabled(preferences, CHANNELS.IN_APP);
        const tipReceivedEnabled = isEventEnabled(preferences, EVENT_TYPES.TIP_RECEIVED);

        if (!inAppEnabled || !tipReceivedEnabled) return [];

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
    }, [events, userAddress, now, demoEnabled, demoNotifications, preferences]);

    // Derive unread count from notifications and last seen timestamp.
    const unreadCount = useMemo(() => {
      if (demoEnabled) {
        return demoNotifications.filter(n => !n.read).length;
      }

      return notifications.filter(
        t => t.timestamp > lastSeenTimestamp
      ).length;
    }, [notifications, demoEnabled, demoNotifications, lastSeenTimestamp]);

    const markAllRead = useCallback(() => {
        if (demoEnabled) {
            demoNotifications.forEach(n => markNotificationRead(n.id));
            return;
        }

        if (!userAddress || !network) return;
        
        const now = Math.floor(Date.now() / 1000);
        lastSeenRef.current = now;
        setLastSeenOverride(now);
        saveLastSeenTimestamp(userAddress, network, now);
    }, [userAddress, network, demoEnabled, demoNotifications, markNotificationRead]);

    return { notifications, unreadCount, lastSeenTimestamp, loading: eventsLoading, markAllRead, refetch: () => {} };
}


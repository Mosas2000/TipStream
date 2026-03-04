import { useState, useEffect, useCallback, useRef } from 'react';
import { CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_API_BASE } from '../config/contracts';
import { parseTipEvent } from '../lib/parseTipEvent';

const STORAGE_KEY = 'tipstream_last_seen_tip_ts';
const POLL_INTERVAL = 30000;

export function useNotifications(userAddress) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const lastSeenRef = useRef(
        parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10)
    );

    const fetchNotifications = useCallback(async () => {
        if (!userAddress) return;
        try {
            setLoading(true);
            const res = await fetch(
                `${STACKS_API_BASE}/extended/v1/contract/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/events?limit=50&offset=0`
            );
            if (!res.ok) return;
            const data = await res.json();

            const receivedTips = data.results
                .filter(e => e.contract_log?.value?.repr)
                .map((e, idx) => ({
                    ...parseTipEvent(e.contract_log.value.repr),
                    timestamp: e.block_time || Date.now() / 1000 - idx,
                    txId: e.tx_id,
                }))
                .filter(t => t && t.event === 'tip-sent' && t.recipient === userAddress);

            setNotifications(receivedTips);

            const unread = receivedTips.filter(
                t => t.timestamp > lastSeenRef.current
            ).length;
            setUnreadCount(unread);
        } catch (err) {
            console.error('Failed to fetch notifications:', err.message || err);
        } finally {
            setLoading(false);
        }
    }, [userAddress]);

    const markAllRead = useCallback(() => {
        const now = Math.floor(Date.now() / 1000);
        lastSeenRef.current = now;
        localStorage.setItem(STORAGE_KEY, String(now));
        setUnreadCount(0);
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    return { notifications, unreadCount, loading, markAllRead, refetch: fetchNotifications };
}

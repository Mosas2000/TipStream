import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  loadPreferences,
  savePreferences,
  clearPreferences,
  DEFAULT_PREFERENCES,
  isEventEnabled,
  isChannelEnabled,
} from '../lib/notificationPreferences';

const NotificationPreferencesContext = createContext(null);
NotificationPreferencesContext.displayName = 'NotificationPreferencesContext';

export function NotificationPreferencesProvider({ children, userAddress = null }) {
  const [preferences, setPreferences] = useState(() => {
    return loadPreferences(userAddress);
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const updatePreferences = useCallback((updates) => {
    setPreferences((prev) => {
      const next = {
        channels: { ...prev.channels, ...(updates.channels || {}) },
        events: { ...prev.events, ...(updates.events || {}) },
        email: 'email' in updates ? updates.email : prev.email,
      };
      savePreferences(userAddress, next);
      return next;
    });
  }, [userAddress]);

  const toggleChannel = useCallback((channel, enabled) => {
    updatePreferences({ channels: { [channel]: enabled } });
  }, [updatePreferences]);

  const toggleEvent = useCallback((eventType, enabled) => {
    updatePreferences({ events: { [eventType]: enabled } });
  }, [updatePreferences]);

  const setEmail = useCallback((email) => {
    updatePreferences({ email: email || null });
  }, [updatePreferences]);

  const resetToDefaults = useCallback(() => {
    clearPreferences(userAddress);
    setPreferences({ ...DEFAULT_PREFERENCES });
    setError(null);
  }, [userAddress]);

  const reloadFromStorage = useCallback(() => {
    setPreferences(loadPreferences(userAddress));
  }, [userAddress]);

  const checkEventEnabled = useCallback((eventType) => {
    return isEventEnabled(preferences, eventType);
  }, [preferences]);

  const checkChannelEnabled = useCallback((channel) => {
    return isChannelEnabled(preferences, channel);
  }, [preferences]);

  const value = useMemo(() => ({
    preferences,
    saving,
    error,
    updatePreferences,
    toggleChannel,
    toggleEvent,
    setEmail,
    resetToDefaults,
    reloadFromStorage,
    isEventEnabled: checkEventEnabled,
    isChannelEnabled: checkChannelEnabled,
  }), [
    preferences,
    saving,
    error,
    updatePreferences,
    toggleChannel,
    toggleEvent,
    setEmail,
    resetToDefaults,
    reloadFromStorage,
    checkEventEnabled,
    checkChannelEnabled,
  ]);

  return (
    <NotificationPreferencesContext.Provider value={value}>
      {children}
    </NotificationPreferencesContext.Provider>
  );
}

export function useNotificationPreferences() {
  const context = useContext(NotificationPreferencesContext);
  if (!context) {
    throw new Error(
      'useNotificationPreferences must be used within a NotificationPreferencesProvider'
    );
  }
  return context;
}

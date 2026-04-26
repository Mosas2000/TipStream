/**
 * useSessionSync -- Synchronize wallet session state across browser tabs.
 *
 * Listens for storage events and wallet provider changes to detect
 * session mutations in other tabs (logout, account switch, etc).
 * Automatically updates session state in the current tab.
 *
 * @module hooks/useSessionSync
 */
import { useEffect } from 'react';
import { userSession } from '../utils/stacks';

/**
 * Hook to synchronize session state across tabs.
 *
 * Listens for:
 * - Storage events (triggered by `localStorage` changes in other tabs)
 * - Provider account changes via wallet extension events
 *
 * When a session change is detected, invokes the provided callback
 * so the consuming component can update its local state.
 *
 * @param {Function} onSessionChange - Callback invoked when session state changes.
 *                                     Called with { isSignedIn: boolean, userData: object|null }
 * @returns {void}
 */
export function useSessionSync(onSessionChange) {
  useEffect(() => {
    if (!onSessionChange) return;

    /**
     * Handle storage events from other tabs.
     * Triggered when localStorage changes in another tab.
     */
    const handleStorageChange = (event) => {
      if (!event.key || event.key !== 'blockstack-session') return;
      const isSignedIn = userSession.isUserSignedIn();
      const userData = isSignedIn ? userSession.loadUserData() : null;
      onSessionChange({ isSignedIn, userData });
    };

    /**
     * Handle wallet provider account changes.
     * Some wallet extensions emit events when the user switches accounts.
     */
    const handleAccountChange = () => {
      const isSignedIn = userSession.isUserSignedIn();
      const userData = isSignedIn ? userSession.loadUserData() : null;
      onSessionChange({ isSignedIn, userData });
    };

    /**
     * Listen for provider account change events.
     * Leather and Xverse use different event names.
     */
    const addProviderListeners = () => {
      if (window.StacksProvider) {
        window.StacksProvider.on?.('accountsChanged', handleAccountChange);
      }
      if (window.LeatherProvider) {
        window.LeatherProvider.on?.('accountsChanged', handleAccountChange);
      }
    };

    /**
     * Clean up provider listeners.
     */
    const removeProviderListeners = () => {
      if (window.StacksProvider) {
        window.StacksProvider.removeListener?.('accountsChanged', handleAccountChange);
      }
      if (window.LeatherProvider) {
        window.LeatherProvider.removeListener?.('accountsChanged', handleAccountChange);
      }
    };

    // Register storage event listener
    window.addEventListener('storage', handleStorageChange);

    // Register provider listeners
    addProviderListeners();

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      removeProviderListeners();
    };
  }, [onSessionChange]);
}

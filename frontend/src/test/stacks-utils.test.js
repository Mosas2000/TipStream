import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock @stacks/connect before importing the module under test.
vi.mock('@stacks/connect', () => {
    class AppConfig {
        constructor() {
            this.scopes = [];
        }
    }
    class UserSession {
        constructor() {
            this.loadUserData = vi.fn();
        }
    }
    return {
        AppConfig,
        UserSession,
        showConnect: vi.fn(),
        disconnect: vi.fn(),
    };
});

vi.mock('@stacks/network', () => ({
    STACKS_MAINNET: { url: 'https://stacks-node-api.mainnet.stacks.co' },
    STACKS_TESTNET: { url: 'https://stacks-node-api.testnet.stacks.co' },
    STACKS_DEVNET: { url: 'http://localhost:3999' },
}));

// Now import the module under test.
const { isWalletInstalled, getSenderAddress, appDetails, network } =
    await import('../utils/stacks');

describe('isWalletInstalled', () => {
    const originalStacksProvider = window.StacksProvider;
    const originalLeatherProvider = window.LeatherProvider;

    afterEach(() => {
        window.StacksProvider = originalStacksProvider;
        window.LeatherProvider = originalLeatherProvider;
    });

    it('returns true when StacksProvider is present', () => {
        window.StacksProvider = {};
        window.LeatherProvider = undefined;
        expect(isWalletInstalled()).toBe(true);
    });

    it('returns true when LeatherProvider is present', () => {
        window.StacksProvider = undefined;
        window.LeatherProvider = {};
        expect(isWalletInstalled()).toBe(true);
    });

    it('returns true when both providers are present', () => {
        window.StacksProvider = {};
        window.LeatherProvider = {};
        expect(isWalletInstalled()).toBe(true);
    });

    it('returns false when no provider is present', () => {
        window.StacksProvider = undefined;
        window.LeatherProvider = undefined;
        expect(isWalletInstalled()).toBe(false);
    });
});

describe('appDetails', () => {
    it('has name TipStream', () => {
        expect(appDetails.name).toBe('TipStream');
    });

    it('has icon path ending in logo.svg', () => {
        expect(appDetails.icon).toContain('logo.svg');
    });
});

describe('network', () => {
    it('resolves to an object with a url property', () => {
        expect(network).toHaveProperty('url');
    });
});
